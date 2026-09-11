"""
In-memory store for transactions awaiting user confirmation (Medium/High
risk). Guardian-architecture.md §4 step 4 ("HUMAN-IN-THE-LOOP CHECKPOINT —
skipped only for Low") requires an explicit confirm/cancel decision before a
Medium/High-risk payment is allowed to complete. /api/transactions/analyze
stores the pending decision here; /api/transactions/confirm resolves it.

Process-local, same caveat as session_store.py — fine for a demo, would need
a real datastore for multi-process deployment.
"""
import time

_PENDING_TTL_SECONDS = 30 * 60
_pending: dict[str, dict] = {}


def store_pending(transaction_id: str, payload: dict) -> None:
    payload["_created_at"] = time.time()
    _pending[transaction_id] = payload
    _prune()


def pop_pending(transaction_id: str) -> dict | None:
    _prune()
    return _pending.pop(transaction_id, None)


def _prune() -> None:
    now = time.time()
    expired = [tid for tid, p in _pending.items() if now - p["_created_at"] > _PENDING_TTL_SECONDS]
    for tid in expired:
        _pending.pop(tid, None)
