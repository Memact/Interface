from __future__ import annotations

import logging
import time
from threading import Lock

from core.chain_builder import build_chains_for_sessions
from core.database import count_unassigned_events, get_connection, get_session_events, init_db, list_sessions
from core.dependency_scorer import get_foundational_events, score_event_dependencies, score_sessions
from core.semantic import cosine_similarity
from core.session_detector import build_sessions_for_range, rebuild_all_sessions


logger = logging.getLogger(__name__)

_BUILD_LOCK = Lock()
_INCREMENTAL_THRESHOLD = 50


def build_network(
    *,
    full_rebuild: bool = False,
    since: str | None = None,
) -> dict:
    """
    Build or update the experience network.
    If full_rebuild=True: clear and rebuild everything.
    If since is provided: only process events after that timestamp.
    If neither: process events not yet in any session.

    Returns summary dict:
    {sessions_created, links_created, events_scored, duration_seconds}
    Never raises — logs errors and returns partial results.
    """
    started = time.monotonic()
    summary = {
        "sessions_created": 0,
        "links_created": 0,
        "events_scored": 0,
        "duration_seconds": 0.0,
    }
    acquired = _BUILD_LOCK.acquire(blocking=False)
    if not acquired:
        summary["duration_seconds"] = round(time.monotonic() - started, 3)
        return summary

    try:
        init_db()
        if full_rebuild:
            summary["sessions_created"] = rebuild_all_sessions()
        elif since:
            summary["sessions_created"] = build_sessions_for_range(start_at=since)
        else:
            summary["sessions_created"] = build_sessions_for_range()

        summary["links_created"] = build_chains_for_sessions()
        summary["events_scored"] = score_event_dependencies()
        score_sessions()
    except Exception:
        logger.exception("Failed to build experience network.")
    finally:
        summary["duration_seconds"] = round(time.monotonic() - started, 3)
        _BUILD_LOCK.release()
    return summary


def get_network_stats() -> dict:
    """
    Return current network state:
    {session_count, link_count, scored_events,
     foundational_event_count, last_built_at}
    """
    try:
        init_db()
        with get_connection() as connection:
            session_count = int(connection.execute("SELECT COUNT(*) AS count FROM sessions").fetchone()["count"])
            link_count = int(connection.execute("SELECT COUNT(*) AS count FROM session_links").fetchone()["count"])
            scored_events = int(
                connection.execute(
                    """
                    SELECT COUNT(*) AS count
                    FROM event_sessions
                    WHERE dependency_score > 0.0
                    """
                ).fetchone()["count"]
            )
            foundational_event_count = int(
                connection.execute(
                    """
                    SELECT COUNT(*) AS count
                    FROM event_sessions
                    WHERE dependency_score >= 2.0
                    """
                ).fetchone()["count"]
            )
            row = connection.execute("SELECT MAX(updated_at) AS updated_at FROM sessions").fetchone()
        return {
            "session_count": session_count,
            "link_count": link_count,
            "scored_events": scored_events,
            "foundational_event_count": foundational_event_count,
            "last_built_at": row["updated_at"] if row and row["updated_at"] else None,
        }
    except Exception:
        logger.exception("Failed to get network stats.")
        return {
            "session_count": 0,
            "link_count": 0,
            "scored_events": 0,
            "foundational_event_count": 0,
            "last_built_at": None,
        }


def find_related_sessions(
    query_embedding: list[float],
    *,
    limit: int = 5,
    min_score: float = 0.0,
) -> list[dict]:
    """
    Find sessions semantically related to a query vector.
    Returns sessions ordered by (semantic_similarity * total_score).
    Each result: {session_id, label, similarity,
                  total_score, started_at, ended_at}
    """
    try:
        if not query_embedding:
            return []
        related: list[dict] = []
        for session in list_sessions(limit=10_000):
            similarity = cosine_similarity(query_embedding, session.get("embedding") or [])
            combined = similarity * float(session.get("total_score") or 0.0)
            if combined < min_score and similarity <= 0.0:
                continue
            related.append(
                {
                    "session_id": int(session["id"]),
                    "label": str(session.get("label") or "").strip() or "Local activity session",
                    "similarity": similarity,
                    "total_score": float(session.get("total_score") or 0.0),
                    "started_at": session.get("started_at"),
                    "ended_at": session.get("ended_at"),
                    "combined_score": combined,
                }
            )
        related.sort(
            key=lambda item: (
                float(item["combined_score"]),
                float(item["similarity"]),
                str(item["started_at"] or ""),
            ),
            reverse=True,
        )
        return related[:limit]
    except Exception:
        logger.exception("Failed to find related sessions.")
        return []


def _session_payload(session_id: int) -> dict | None:
    for session in list_sessions(limit=10_000):
        if int(session["id"]) == int(session_id):
            return session
    return None


def get_session_chain(session_id: int) -> dict:
    """
    Return a session with its full chain context:
    - The session itself
    - Sessions it depends on (upstream)
    - Sessions that depend on it (downstream)
    - Foundational events within it
    """
    try:
        session = _session_payload(session_id)
        if session is None:
            return {
                "session": None,
                "upstream": [],
                "downstream": [],
                "foundational_events": [],
            }

        with get_connection() as connection:
            upstream_rows = connection.execute(
                """
                SELECT
                    s.id,
                    s.label,
                    s.started_at,
                    s.ended_at,
                    s.total_score,
                    sl.link_type,
                    sl.strength
                FROM session_links sl
                INNER JOIN sessions s ON s.id = sl.source_session_id
                WHERE sl.target_session_id = ?
                ORDER BY sl.strength DESC, s.started_at DESC
                """,
                (session_id,),
            ).fetchall()
            downstream_rows = connection.execute(
                """
                SELECT
                    s.id,
                    s.label,
                    s.started_at,
                    s.ended_at,
                    s.total_score,
                    sl.link_type,
                    sl.strength
                FROM session_links sl
                INNER JOIN sessions s ON s.id = sl.target_session_id
                WHERE sl.source_session_id = ?
                ORDER BY sl.strength DESC, s.started_at DESC
                """,
                (session_id,),
            ).fetchall()

        return {
            "session": session,
            "upstream": [dict(row) for row in upstream_rows],
            "downstream": [dict(row) for row in downstream_rows],
            "foundational_events": [
                {
                    "id": event.id,
                    "occurred_at": event.occurred_at,
                    "application": event.application,
                    "window_title": event.window_title,
                    "url": event.url,
                    "keyphrases": event.keyphrases,
                }
                for event in get_foundational_events(session_id)
            ],
            "event_count": len(get_session_events(session_id)),
        }
    except Exception:
        logger.exception("Failed to load session chain for %s", session_id)
        return {
            "session": None,
            "upstream": [],
            "downstream": [],
            "foundational_events": [],
        }


def should_rebuild_incremental() -> bool:
    """
    Return True if there are enough unprocessed events
    to warrant an incremental network build.
    Threshold: 50+ events not yet in any session.
    """
    try:
        with get_connection() as connection:
            row = connection.execute("SELECT MAX(updated_at) AS updated_at FROM sessions").fetchone()
            last_built_at = row["updated_at"] if row and row["updated_at"] else None
            if not last_built_at:
                return count_unassigned_events() >= _INCREMENTAL_THRESHOLD
            count_row = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM events e
                LEFT JOIN event_sessions es ON es.event_id = e.id
                WHERE es.event_id IS NULL
                  AND e.occurred_at >= ?
                """,
                (last_built_at,),
            ).fetchone()
        return int(count_row["count"]) >= _INCREMENTAL_THRESHOLD if count_row else False
    except Exception:
        logger.exception("Failed to check incremental network rebuild threshold.")
        return False
