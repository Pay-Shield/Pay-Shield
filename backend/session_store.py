"""
In-memory per-sender session store for velocity tracking (Behavioral Pattern
module, guardian-architecture.md §3/§5: "2+ new-recipient attempts in a
session/window"). Deliberately simple — process-local dict, no persistence
across restarts. That's fine for a demo/hackathon single-process server; a
real deployment would back this with Redis or similar.
"""
import time

_SESSION_WINDOW_SECONDS = 30 * 60  # 30 minute rolling window
_sessions: dict[str, list[dict]] = {}


def get_recent_attempts(sender_id: str) -> list[dict]:
    """Attempts by this sender within the current window, oldest first."""
    now = time.time()
    _prune(sender_id, now)
    return list(_sessions.get(sender_id, []))


def record_attempt(sender_id: str, recipient_id: str, recipient_status: str) -> None:
    """Call once per analyzed payment, after recipient verification runs."""
    now = time.time()
    history = _sessions.setdefault(sender_id, [])
    history.append({
        "recipient_id": recipient_id,
        "recipient_status": recipient_status,
        "ts": now,
    })
    _prune(sender_id, now)


def _prune(sender_id: str, now: float) -> None:
    history = _sessions.get(sender_id, [])
    _sessions[sender_id] = [h for h in history if now - h["ts"] <= _SESSION_WINDOW_SECONDS]
