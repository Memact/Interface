from __future__ import annotations

import json
import logging
import math
from collections import Counter
from datetime import datetime, timedelta
from urllib.parse import urlparse

from core.database import (
    Event,
    clear_network_tables,
    get_event,
    get_event_session,
    init_db,
    insert_event_session_mappings,
    insert_session,
    list_events_batch,
    list_unassigned_events,
)
from core.semantic import cosine_similarity, embed_text


logger = logging.getLogger(__name__)

SESSION_TIMEOUT = 25 * 60
SEMANTIC_THRESHOLD = 0.18
MIN_SESSION_EVENTS = 2
_SURROUNDING_BUILD_WINDOW = timedelta(hours=2)
_BROWSER_APPS = {
    "chrome",
    "msedge",
    "edge",
    "brave",
    "opera",
    "vivaldi",
    "firefox",
}
_CODING_APPS = {
    "code",
    "cursor",
    "codex",
    "pycharm",
    "idea",
    "webstorm",
    "terminal",
    "powershell",
    "cmd",
    "windows terminal",
}


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _normalize(vector: list[float]) -> list[float]:
    if not vector:
        return []
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [float(value) / norm for value in vector]


def _event_embedding(event: Event) -> list[float]:
    try:
        raw = json.loads(event.embedding_json)
    except Exception:
        raw = embed_text(event.searchable_text or "")
    vector: list[float] = []
    for value in raw:
        try:
            vector.append(float(value))
        except Exception:
            continue
    return _normalize(vector)


def _average_embedding(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    max_dim = max(len(vector) for vector in vectors)
    total = [0.0] * max_dim
    for vector in vectors:
        for index, value in enumerate(vector):
            total[index] += float(value)
    averaged = [value / max(len(vectors), 1) for value in total]
    return _normalize(averaged)


def _clean_app_name(application: str) -> str:
    value = (application or "").strip()
    if not value:
        return "Unknown"
    if value.lower().endswith(".exe"):
        value = value[:-4]
    return value.strip() or "Unknown"


def _domain(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.scheme == "file":
        return "local file"
    if parsed.netloc:
        return parsed.netloc.removeprefix("www.").lower()
    return None


def _truncate_label(value: str, limit: int = 60) -> str:
    text = " ".join((value or "").split()).strip()
    if not text:
        return "Local activity session"
    if len(text) <= limit:
        return text
    shortened = text[: limit - 1].rsplit(" ", 1)[0].strip()
    if shortened:
        return shortened
    return text[: limit - 1].strip()


def _session_mode(events: list[Event]) -> str:
    browserish = sum(1 for event in events if _domain(event.url))
    codingish = sum(
        1
        for event in events
        if _clean_app_name(event.application).casefold() in _CODING_APPS
    )
    if browserish >= max(len(events) // 2, 1):
        return "reading"
    if codingish >= max(len(events) // 3, 1):
        return "coding"
    return "activity"


def _session_keyphrases(events: list[Event], limit: int = 6) -> list[str]:
    counts: Counter[str] = Counter()
    for event in events:
        for phrase in event.keyphrases:
            cleaned = " ".join(str(phrase).split()).strip()
            if len(cleaned) < 3:
                continue
            counts[cleaned] += 1
    return [phrase for phrase, _ in counts.most_common(limit)]


def _session_label(events: list[Event], keyphrases: list[str]) -> str:
    mode = _session_mode(events)
    if keyphrases:
        lead = keyphrases[0]
        if mode == "coding":
            return _truncate_label(f"Working on {lead}")
        if mode == "reading":
            return _truncate_label(f"Reading about {lead}")
        return _truncate_label(f"Exploring {lead}")

    domains = Counter(domain for domain in (_domain(event.url) for event in events) if domain)
    apps = Counter(_clean_app_name(event.application) for event in events)
    top_domain = domains.most_common(1)[0][0] if domains else None
    top_app = apps.most_common(1)[0][0] if apps else None
    if top_domain and mode == "coding":
        return _truncate_label(f"Coding from {top_domain}")
    if top_domain:
        return _truncate_label(f"Research in {top_domain}")
    if top_app:
        if mode == "coding":
            return _truncate_label(f"Coding in {top_app}")
        return _truncate_label(f"Using {top_app}")
    return "Local activity session"


def _finalize_session(
    sessions: list[dict],
    current_events: list[Event],
    current_vectors: list[list[float]],
) -> None:
    if len(current_events) < MIN_SESSION_EVENTS:
        return
    keyphrases = _session_keyphrases(current_events)
    sessions.append(
        {
            "label": _session_label(current_events, keyphrases),
            "started_at": current_events[0].occurred_at,
            "ended_at": current_events[-1].occurred_at,
            "event_ids": [event.id for event in current_events],
            "embedding": _average_embedding(current_vectors),
            "keyphrases": keyphrases,
            "event_count": len(current_events),
        }
    )


def detect_sessions_from_events(
    events: list[Event],
    *,
    session_timeout: int = SESSION_TIMEOUT,
    semantic_threshold: float = SEMANTIC_THRESHOLD,
) -> list[dict]:
    """
    Group events into sessions.
    Returns list of session dicts ready for database insertion.
    Each dict: {
        label, started_at, ended_at, event_ids,
        embedding, keyphrases, event_count
    }
    Does not write to database — caller decides when to persist.
    Never raises — returns [] on any error.
    """
    try:
        ordered = sorted(events, key=lambda event: (_parse_timestamp(event.occurred_at), event.id))
        if not ordered:
            return []

        sessions: list[dict] = []
        current_events: list[Event] = []
        current_vectors: list[list[float]] = []
        current_embedding: list[float] = []
        last_at: datetime | None = None

        for event in ordered:
            event_at = _parse_timestamp(event.occurred_at)
            event_vector = _event_embedding(event)
            if not current_events:
                current_events = [event]
                current_vectors = [event_vector]
                current_embedding = event_vector
                last_at = event_at
                continue

            gap_seconds = (event_at - (last_at or event_at)).total_seconds()
            similarity = cosine_similarity(event_vector, current_embedding)
            if gap_seconds > session_timeout or similarity < semantic_threshold:
                _finalize_session(sessions, current_events, current_vectors)
                current_events = [event]
                current_vectors = [event_vector]
                current_embedding = event_vector
                last_at = event_at
                continue

            current_events.append(event)
            current_vectors.append(event_vector)
            current_embedding = _average_embedding(current_vectors)
            last_at = event_at

        _finalize_session(sessions, current_events, current_vectors)
        return sessions
    except Exception:
        logger.exception("Failed to detect sessions from events.")
        return []


def _persist_sessions(session_dicts: list[dict]) -> int:
    created = 0
    for session in session_dicts:
        try:
            session_id = insert_session(
                label=str(session.get("label") or "").strip() or "Local activity session",
                started_at=str(session["started_at"]),
                ended_at=str(session["ended_at"]),
                event_count=int(session.get("event_count") or len(session.get("event_ids") or [])),
                embedding=[float(value) for value in session.get("embedding") or []],
                keyphrases=[str(value) for value in session.get("keyphrases") or []],
            )
            insert_event_session_mappings(session_id, [int(event_id) for event_id in session.get("event_ids") or []])
            created += 1
        except Exception:
            logger.exception("Failed to persist session %s", session.get("label"))
    return created


def build_sessions_for_range(
    start_at: str | None = None,
    end_at: str | None = None,
) -> int:
    """
    Detect and persist sessions for a date range.
    Skips events already assigned to a session.
    Returns number of sessions created.
    """
    try:
        init_db()
        events = list_unassigned_events(start_at=start_at, end_at=end_at)
        if not events:
            return 0
        session_dicts = detect_sessions_from_events(events)
        if not session_dicts:
            return 0
        return _persist_sessions(session_dicts)
    except Exception:
        logger.exception("Failed to build sessions for range %s -> %s", start_at, end_at)
        return 0


def rebuild_all_sessions() -> int:
    """
    Clear all sessions and rebuild from scratch.
    Used by the reindex script.
    Returns total sessions created.
    """
    try:
        init_db()
        clear_network_tables()
        events: list[Event] = []
        offset = 0
        batch_size = 1000
        while True:
            batch = list_events_batch(offset=offset, limit=batch_size)
            if not batch:
                break
            events.extend(batch)
            offset += len(batch)
        session_dicts = detect_sessions_from_events(events)
        if not session_dicts:
            return 0
        return _persist_sessions(session_dicts)
    except Exception:
        logger.exception("Failed to rebuild all sessions.")
        return 0


def get_or_build_session_for_event(event_id: int) -> int | None:
    """
    Return the session_id for an event.
    If not yet assigned, trigger incremental session building
    for the surrounding time window and return result.
    """
    try:
        existing = get_event_session(event_id)
        if existing is not None:
            return existing
        event = get_event(event_id)
        if event is None:
            return None
        center = _parse_timestamp(event.occurred_at)
        start_at = (center - _SURROUNDING_BUILD_WINDOW).isoformat(sep=" ", timespec="seconds")
        end_at = (center + _SURROUNDING_BUILD_WINDOW).isoformat(sep=" ", timespec="seconds")
        build_sessions_for_range(start_at=start_at, end_at=end_at)
        return get_event_session(event_id)
    except Exception:
        logger.exception("Failed to get or build session for event %s", event_id)
        return None
