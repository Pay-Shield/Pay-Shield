"""
Cryptographic SHA-256 Hash-Chained Audit Trail for PayShield AI Agents.

Adapted from the Trust-Gated Multi-Agent architecture. Every agent action,
verification check, and payment risk decision is recorded with a cryptographic
hash of all its fields plus the previous entry's hash — forming a tamper-evident
blockchain-style ledger that survives restarts.
"""

import hashlib
import json
import os
import time
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any, Tuple



def sha256_hash(data: str) -> str:
    """SHA-256 hash of a string, returning full 64-character lowercase hex digest."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class AuditEntry:
    """Immutable, hash-chained audit log entry."""
    sequence: int
    timestamp: float
    agent_id: str
    action: str
    input_hash: str
    output_hash: str
    trust_score: int  # Risk or trust score (0-100)
    entry_hash: str
    previous_hash: str
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AuditTrail:
    """
    Hash-chained audit log for PayShield agent actions and risk decisions.

    Every entry includes a SHA-256 hash of all its fields plus the
    previous entry's hash — forming a tamper-evident chain. If any
    entry is modified or deleted, subsequent hashes break.
    """

    GENESIS_HASH = "0" * 64
    DEFAULT_STORAGE_FILE = str(Path(__file__).resolve().parent.parent / "audit_chain.jsonl")

    def __init__(self, storage_file: Optional[str] = None) -> None:
        self.storage_file = storage_file or self.DEFAULT_STORAGE_FILE

        self._entries: List[AuditEntry] = []
        self._load_from_storage()

    def _load_from_storage(self) -> None:
        """Load and initialize chain from disk if file exists."""
        if not os.path.exists(self.storage_file):
            return

        entries = []
        try:
            with open(self.storage_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    entry = AuditEntry(
                        sequence=data["sequence"],
                        timestamp=data["timestamp"],
                        agent_id=data["agent_id"],
                        action=data["action"],
                        input_hash=data["input_hash"],
                        output_hash=data["output_hash"],
                        trust_score=data["trust_score"],
                        entry_hash=data["entry_hash"],
                        previous_hash=data["previous_hash"],
                        metadata=data.get("metadata"),
                    )
                    entries.append(entry)
            self._entries = entries
        except Exception as e:
            print(f"⚠️ Warning loading audit chain from {self.storage_file}: {e}")

    def record(
        self,
        agent_id: str,
        action: str,
        input_data: Any,
        output_data: Any,
        trust_score: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditEntry:
        """Record an agent action in the cryptographic audit chain and persist."""
        self._load_from_storage()
        sequence = len(self._entries)
        previous_hash = (
            self._entries[-1].entry_hash if self._entries else self.GENESIS_HASH
        )

        now = time.time()

        input_text = json.dumps(input_data, sort_keys=True, default=str) if not isinstance(input_data, str) else input_data
        output_text = json.dumps(output_data, sort_keys=True, default=str) if not isinstance(output_data, str) else output_data

        input_hash = sha256_hash(input_text)
        output_hash = sha256_hash(output_text)

        # Chain formula: sequence:timestamp:agent:action:input_hash:output_hash:trust_score:previous_hash
        chain_data = (
            f"{sequence}:{now}:{agent_id}:{action}:"
            f"{input_hash}:{output_hash}:{trust_score}:{previous_hash}"
        )
        entry_hash = sha256_hash(chain_data)

        entry = AuditEntry(
            sequence=sequence,
            timestamp=now,
            agent_id=agent_id,
            action=action,
            input_hash=input_hash,
            output_hash=output_hash,
            trust_score=int(trust_score),
            entry_hash=entry_hash,
            previous_hash=previous_hash,
            metadata=metadata,
        )

        self._entries.append(entry)
        self._persist_entry(entry)
        return entry

    def _persist_entry(self, entry: AuditEntry) -> None:
        """Append an entry to the persistent JSONL file."""
        try:
            with open(self.storage_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry.to_dict()) + "\n")
        except Exception as e:
            print(f"⚠️ Failed to write audit entry to {self.storage_file}: {e}")

    def verify_chain(self) -> Tuple[bool, Optional[str]]:
        """
        Verify the cryptographic integrity of the entire audit chain.
        Returns (True, None) if valid, or (False, error_message) if corrupted or tampered.
        """
        for i, entry in enumerate(self._entries):
            expected_prev = (
                self._entries[i - 1].entry_hash
                if i > 0
                else self.GENESIS_HASH
            )
            if entry.previous_hash != expected_prev:
                return False, f"Chain broken at entry #{entry.sequence}: previous_hash mismatch"

            # Recompute entry hash
            chain_data = (
                f"{entry.sequence}:{entry.timestamp}:{entry.agent_id}:"
                f"{entry.action}:{entry.input_hash}:{entry.output_hash}:"
                f"{entry.trust_score}:{entry.previous_hash}"
            )
            if sha256_hash(chain_data) != entry.entry_hash:
                return False, f"Chain broken at entry #{entry.sequence}: entry_hash mismatch (tampering detected)"

        return True, None

    @property
    def entries(self) -> List[AuditEntry]:
        """Return a read-only list of all audit entries."""
        return list(self._entries)

    def to_json(self) -> str:
        """Export the audit trail as verifiable JSON."""
        return json.dumps([e.to_dict() for e in self._entries], indent=2)


# Global singleton instance for easy import across agents and endpoints
global_audit_trail = AuditTrail()
