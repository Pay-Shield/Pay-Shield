import json
from datetime import datetime
from pathlib import Path
from models import PaymentRequest
import os
from crypto_audit import global_audit_trail, AuditEntry

AUDIT_LOG_FILE = str(Path(__file__).resolve().parent.parent / "audit_log.jsonl")



def log_transaction(
    request: PaymentRequest,
    recipient_verification: dict,
    risk_factors: list,
    llm_reasoning: str,
    final_score: float,
    category: str,
    action: str,
    outcome: str,
) -> AuditEntry:
    """
    Append transaction to both legacy audit log (JSONL format)
    and the cryptographic SHA-256 hash-chained audit trail.
    """
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "request": {
            "sender_id": request.sender_id,
            "recipient_name": request.recipient_name,
            "recipient_id": request.recipient_id,
            "amount": request.amount,
            "note": request.note,
        },
        "recipient_verification": recipient_verification,
        "risk_factors": risk_factors,
        "llm_reasoning": llm_reasoning,
        "final_score": final_score,
        "category": category,
        "action": action,
        "outcome": outcome,
    }

    try:
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        print(f"✓ Logged transaction: {request.recipient_name} - {outcome.upper()}")
    except Exception as e:
        print(f"⚠ Failed to log legacy transaction: {str(e)}")

    # Cryptographic SHA-256 Hash Chain Record
    crypto_entry = global_audit_trail.record(
        agent_id="orchestrator_agent",
        action=f"transaction_{outcome}",
        input_data={
            "sender_id": request.sender_id,
            "recipient_id": request.recipient_id,
            "amount": request.amount,
            "note": request.note,
        },
        output_data={
            "final_score": final_score,
            "category": category,
            "action": action,
            "outcome": outcome,
            "factors_count": len(risk_factors),
        },
        trust_score=round(final_score),
        metadata={
            "recipient_name": request.recipient_name,
            "recipient_status": recipient_verification.get("status", "unknown"),
        },
    )
    return crypto_entry


def get_audit_history(limit: int = 50) -> list:
    """
    Retrieve recent audit log entries.
    """
    if not Path(AUDIT_LOG_FILE).exists():
        return []

    entries = []
    with open(AUDIT_LOG_FILE, "r") as f:
        for line in f:
            entries.append(json.loads(line))

    return entries[-limit:]


def verify_audit_chain() -> dict:
    """
    Verify the cryptographic SHA-256 hash chain.
    Returns status dict indicating whether the chain is valid and uncorrupted.
    """
    valid, error = global_audit_trail.verify_chain()
    return {
        "valid": valid,
        "error": error,
        "total_entries": len(global_audit_trail.entries),
        "genesis_hash": global_audit_trail.GENESIS_HASH,
        "latest_hash": global_audit_trail.entries[-1].entry_hash if global_audit_trail.entries else None,
    }


def get_crypto_audit_history(limit: int = 50) -> list:
    """
    Retrieve recent cryptographic audit chain entries.
    """
    return [e.to_dict() for e in global_audit_trail.entries[-limit:]]

