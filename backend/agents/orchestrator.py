"""
Orchestrator Agent (Workflow Controller)

Coordinates the multi-agent execution pipeline:
1. Fans out independent agents in parallel (Recipient Verification, Risk Analysis, Behavioral Pattern)
2. Isolates failures with defensive fallbacks
3. Synthesizes signals in the Decision & Policy Agent
4. Invokes the Explainability Agent for human-readable communication
5. Cryptographically anchors every action to the SHA-256 hash-chained audit log
"""

import asyncio
import time
import uuid
from typing import Dict, Any, List, Optional

from agents.recipient_verification import recipient_verification_agent
from agents.risk_analysis import risk_analysis_agent
from agents.behavioral_pattern import behavioral_pattern_agent
from agents.decision_policy import decision_policy_agent
from agents.explainability import explainability_agent
from crypto_audit import global_audit_trail, AuditEntry


def _fallback_if_error(result: Any, fallback: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure agent exceptions never crash the pipeline, defaulting to a cautious fallback."""
    if isinstance(result, Exception):
        print(f"⚠️ Agent error caught by Orchestrator: {result}")
        return fallback
    return result


def _map_category_to_frontend_action(category: str) -> str:
    """Map internal category to frontend/PS09 actions."""
    cat = category.lower()
    if cat == "low":
        return "SAFE"
    elif cat == "medium":
        return "VERIFY"
    elif cat == "high":
        return "PAUSED"
    else:
        return "BLOCKED"


class OrchestratorAgent:
    """
    Main orchestrator for PayShield AI agent collaboration.
    """

    def __init__(self, timeout_seconds: float = 6.0):
        self.timeout_seconds = timeout_seconds

    async def run(
        self,
        txn: Dict[str, Any],
        user_session_history: Optional[List[Dict[str, Any]]] = None,
        user_baseline: float = 3000.0,
    ) -> Dict[str, Any]:
        """
        Execute the full parallel multi-agent evaluation pipeline.
        """
        start_time = time.monotonic()
        txn_id = txn.get("transaction_id") or f"TXN-{uuid.uuid4().hex[:8].upper()}"

        # ── Step 1: Run independent specialist agents in parallel ────────────
        # Recipient, Risk Analysis, and Behavioral Pattern do not depend on each other
        recipient_task = asyncio.to_thread(recipient_verification_agent, txn)
        risk_task = asyncio.to_thread(risk_analysis_agent, txn, user_baseline)
        behavior_task = asyncio.to_thread(behavioral_pattern_agent, txn, user_session_history, user_baseline)

        raw_recipient, raw_risk, raw_behavior = await asyncio.gather(
            asyncio.wait_for(recipient_task, timeout=self.timeout_seconds),
            asyncio.wait_for(risk_task, timeout=self.timeout_seconds),
            asyncio.wait_for(behavior_task, timeout=self.timeout_seconds),
            return_exceptions=True,
        )

        # ── Step 2: Handle partial failures with safe fallbacks ───────────────
        recipient_result = _fallback_if_error(
            raw_recipient,
            {"agent_id": "recipient_verification_agent", "status": "new", "risk_weight": 25, "score_contribution": 25, "reason": "Verification service unavailable, using caution"}
        )
        risk_result = _fallback_if_error(
            raw_risk,
            {"agent_id": "risk_analysis_agent", "score": 30, "urgency_score": 30, "signals": ["Analysis service fallback"], "summary": "Fallback mode", "factors": []}
        )
        behavior_result = _fallback_if_error(
            raw_behavior,
            {"agent_id": "behavioral_pattern_agent", "score": 20, "raw_score": 20, "factors": []}
        )

        # ── Step 3: Decision & Policy Agent combines all signals ─────────────
        decision = decision_policy_agent(recipient_result, risk_result, behavior_result)

        # ── Step 4: Explainability Agent generates human narrative ───────────
        all_signals = {
            "recipient": recipient_result,
            "risk": risk_result,
            "behavior": behavior_result,
        }

        explanation = await asyncio.to_thread(
            explainability_agent,
            all_signals,
            decision["final_score"],
            decision["display_category"],
        )

        elapsed_ms = round((time.monotonic() - start_time) * 1000)

        # Compile flat list of factors for compatibility
        all_factors = (
            risk_result.get("factors", []) +
            behavior_result.get("factors", [])
        )
        if recipient_result.get("status") == "flagged":
            all_factors.append({"type": "flagged_recipient", "reason": recipient_result.get("reason"), "weight": 45})

        # ── Step 5: Commit to Cryptographic SHA-256 Audit Trail ──────────────
        audit_entry = global_audit_trail.record(
            agent_id="orchestrator_agent",
            action="evaluate_transaction",
            input_data={
                "txn_id": txn_id,
                "amount": txn.get("amount"),
                "recipient_id": txn.get("recipient_id") or txn.get("upiId"),
                "note": txn.get("note") or txn.get("message"),
            },
            output_data={
                "score": decision["final_score"],
                "category": decision["category"],
                "action": decision["action"],
                "latency_ms": elapsed_ms,
            },
            trust_score=decision["final_score"],
            metadata={
                "recipient_status": recipient_result.get("status"),
                "explanation": explanation[:200],
            },
        )

        return {
            "txn_id": txn_id,
            "transaction_id": txn_id,
            "score": decision["final_score"],
            "final_score": decision["final_score"],
            "category": decision["category"],
            "display_category": decision["display_category"],
            "action": decision["action"],
            "frontend_action": _map_category_to_frontend_action(decision["category"]),
            "signals": all_signals,
            "recipient_result": recipient_result,
            "risk_result": risk_result,
            "behavioral_result": behavior_result,
            "decision": decision,
            "all_factors": all_factors,
            "explanation": explanation,
            "audit_hash": audit_entry.entry_hash,
            "audit_sequence": audit_entry.sequence,
            "latency_ms": elapsed_ms,
        }


# Singleton orchestrator
orchestrator = OrchestratorAgent()
