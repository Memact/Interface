from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime
from urllib.parse import urlparse

from core.database import get_connection, get_session_events, insert_session_links, list_sessions
from core.semantic import cosine_similarity


logger = logging.getLogger(__name__)

CHAIN_WINDOW = 45 * 60
CHAIN_THRESHOLD = 0.22
CAUSAL_BONUS = 0.3

_BROWSER_APPS = {"chrome", "msedge", "edge", "brave", "opera", "vivaldi", "firefox"}
_TERMINAL_APPS = {"terminal", "powershell", "cmd", "windows terminal", "pwsh"}
_EDITOR_APPS = {
    "code",
    "cursor",
    "codex",
    "pycharm",
    "idea",
    "webstorm",
    "sublime_text",
    "notepad++",
    "devenv",
}
_AI_DOMAINS = {"chatgpt.com", "claude.ai"}
_DOC_DOMAINS = {
    "docs.python.org",
    "developer.mozilla.org",
    "readthedocs.io",
    "learn.microsoft.com",
    "stackoverflow.com",
}


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _domain(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.netloc:
        return parsed.netloc.removeprefix("www.").lower()
    return None


def _as_float_list(values: object) -> list[float]:
    if not isinstance(values, list):
        return []
    result: list[float] = []
    for value in values:
        try:
            result.append(float(value))
        except Exception:
            continue
    return result


def _session_app_sets(session: dict) -> tuple[set[str], set[str]]:
    apps = {str(value).casefold() for value in session.get("applications") or [] if str(value).strip()}
    domains = {str(value).casefold() for value in session.get("domains") or [] if str(value).strip()}
    return apps, domains


def _is_browser_session(session: dict) -> bool:
    apps, domains = _session_app_sets(session)
    return bool(apps & _BROWSER_APPS) or bool(domains)


def _is_terminal_session(session: dict) -> bool:
    apps, _ = _session_app_sets(session)
    return bool(apps & _TERMINAL_APPS)


def _is_editor_session(session: dict) -> bool:
    apps, _ = _session_app_sets(session)
    return bool(apps & _EDITOR_APPS)


def _is_docs_session(session: dict) -> bool:
    _, domains = _session_app_sets(session)
    if domains & _DOC_DOMAINS:
        return True
    return any(
        domain.startswith("docs.")
        or "readthedocs" in domain
        or "developer." in domain
        or "learn." in domain
        for domain in domains
    )


def _causal_signal(source: dict, target: dict) -> tuple[float, str | None]:
    source_apps, source_domains = _session_app_sets(source)
    target_apps, _ = _session_app_sets(target)
    if _is_browser_session(source) and _is_terminal_session(target):
        return CAUSAL_BONUS, "browser_to_terminal"
    if _is_browser_session(source) and _is_editor_session(target):
        return CAUSAL_BONUS, "browser_to_editor"
    if source_domains & _AI_DOMAINS and _is_editor_session(target):
        return CAUSAL_BONUS, "ai_to_editor"
    if "github.com" in source_domains and (_is_terminal_session(target) or _is_editor_session(target)):
        return CAUSAL_BONUS, "github_to_build"
    if _is_docs_session(source) and _is_editor_session(target):
        return CAUSAL_BONUS, "docs_to_editor"
    if source_apps & _BROWSER_APPS and target_apps & _EDITOR_APPS:
        return CAUSAL_BONUS, "browser_to_editor"
    return 0.0, None


def detect_chain_links(
    sessions: list[dict],
) -> list[dict]:
    """
    Find causal links between sessions.
    Returns list of link dicts:
    {source_session_id, target_session_id,
     link_type, strength}
    link_type: 'causal' | 'semantic' | 'temporal'
    Never raises.
    """
    try:
        ordered = sorted(
            sessions,
            key=lambda session: (_parse_timestamp(str(session["started_at"])), int(session["id"])),
        )
        links: list[dict] = []
        seen_pairs: set[tuple[int, int]] = set()
        for index, source in enumerate(ordered):
            source_end = _parse_timestamp(str(source["ended_at"]))
            source_embedding = _as_float_list(source.get("embedding") or [])
            source_keyphrases = {str(value).casefold() for value in source.get("keyphrases") or []}
            for target in ordered[index + 1 :]:
                target_start = _parse_timestamp(str(target["started_at"]))
                gap_seconds = (target_start - source_end).total_seconds()
                if gap_seconds < 0:
                    continue
                if gap_seconds > CHAIN_WINDOW:
                    break

                source_id = int(source["id"])
                target_id = int(target["id"])
                if source_id == target_id or (source_id, target_id) in seen_pairs:
                    continue

                target_embedding = _as_float_list(target.get("embedding") or [])
                semantic_strength = cosine_similarity(source_embedding, target_embedding)
                causal_bonus, _ = _causal_signal(source, target)
                target_keyphrases = {str(value).casefold() for value in target.get("keyphrases") or []}
                phrase_overlap = len(source_keyphrases & target_keyphrases)
                temporal_bonus = 0.08 if gap_seconds <= 10 * 60 else 0.0
                temporal_match = gap_seconds <= 12 * 60 and phrase_overlap > 0

                if not (semantic_strength >= CHAIN_THRESHOLD or causal_bonus > 0.0 or temporal_match):
                    continue

                if causal_bonus > 0.0:
                    link_type = "causal"
                elif semantic_strength >= CHAIN_THRESHOLD:
                    link_type = "semantic"
                else:
                    link_type = "temporal"
                strength = min(
                    1.0,
                    max(0.0, semantic_strength) + causal_bonus + temporal_bonus + (0.04 * phrase_overlap),
                )
                links.append(
                    {
                        "source_session_id": source_id,
                        "target_session_id": target_id,
                        "link_type": link_type,
                        "strength": strength,
                    }
                )
                seen_pairs.add((source_id, target_id))
        return links
    except Exception:
        logger.exception("Failed to detect chain links.")
        return []


def _load_sessions_for_chain_build(session_ids: list[int] | None = None) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                s.id,
                s.label,
                s.started_at,
                s.ended_at,
                s.event_count,
                s.embedding_json,
                s.keyphrases_json,
                s.recency_score,
                s.dependency_score,
                s.total_score,
                s.updated_at
            FROM sessions s
            ORDER BY s.started_at ASC, s.id ASC
            """,
        ).fetchall()
    sessions = list_sessions(limit=max(len(rows), 1_000_000))
    by_id = {int(session["id"]): session for session in sessions}
    selected = [by_id[int(row["id"])] for row in rows if int(row["id"]) in by_id]

    if not selected:
        return []

    event_map: dict[int, list] = defaultdict(list)
    ids = [int(session["id"]) for session in selected]
    with get_connection() as connection:
        placeholders = ", ".join("?" for _ in ids)
        rows = connection.execute(
            f"""
            SELECT es.session_id, e.application, e.url
            FROM event_sessions es
            INNER JOIN events e ON e.id = es.event_id
            WHERE es.session_id IN ({placeholders})
            ORDER BY e.occurred_at ASC, e.id ASC
            """,
            tuple(ids),
        ).fetchall()
    for row in rows:
        event_map[int(row["session_id"])].append(row)

    enriched: list[dict] = []
    for session in selected:
        session_id = int(session["id"])
        events = event_map.get(session_id, [])
        applications = []
        domains = []
        for row in events:
            app_name = str(row["application"]).strip().lower()
            if app_name.endswith(".exe"):
                app_name = app_name[:-4]
            if app_name:
                applications.append(app_name)
            domain = _domain(row["url"])
            if domain:
                domains.append(domain)
        enriched.append(
            {
                **session,
                "applications": applications,
                "domains": domains,
            }
        )
    return enriched


def build_chains_for_sessions(
    session_ids: list[int] | None = None,
) -> int:
    """
    Detect and persist chain links for given sessions.
    If session_ids is None, process all sessions.
    Returns number of links created.
    """
    try:
        sessions = _load_sessions_for_chain_build(session_ids)
        if not sessions:
            return 0
        session_id_set = {int(session_id) for session_id in session_ids or []}
        with get_connection() as connection:
            if session_ids:
                placeholders = ", ".join("?" for _ in session_ids)
                connection.execute(
                    f"""
                    DELETE FROM session_links
                    WHERE source_session_id IN ({placeholders})
                       OR target_session_id IN ({placeholders})
                    """,
                    tuple(session_ids) * 2,
                )
            else:
                connection.execute("DELETE FROM session_links")
            connection.commit()
        links = detect_chain_links(sessions)
        if session_id_set:
            links = [
                link
                for link in links
                if int(link["source_session_id"]) in session_id_set
                or int(link["target_session_id"]) in session_id_set
            ]
        return insert_session_links(links)
    except Exception:
        logger.exception("Failed to build chains for sessions.")
        return 0
