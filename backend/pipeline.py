import asyncio
from models import PaymentRequest
from agents.orchestrator import orchestrator
from session_store import get_recent_attempts, record_attempt


async def run_risk_pipeline(request: PaymentRequest) -> dict:
    """
    Core PayShield Multi-Agent pipeline, executing all 6 specialized agents:
    1. Orchestrator Agent (Fans out parallel execution, manages fallbacks & audit logging)
    2. Recipient Verification Agent (Payee directory & blacklist inspection)
    3. Risk Analysis Agent (Rule-based amount check + Gemini social engineering reasoning)
    4. Behavioral Pattern Agent (Velocity, baseline expenditure, odd-hour detection)
    5. Decision & Policy Agent (Deterministic multi-signal aggregator)
    6. Explainability Agent (Human-readable plain language narrative generation)
    """
    print(f"\n🛡️ [Orchestrator] Analyzing payment: {request.recipient_name} for ₹{request.amount}")

    session_history = get_recent_attempts(request.sender_id)

    txn_dict = {
        "sender_id": request.sender_id,
        "recipient_name": request.recipient_name,
        "recipient_id": request.recipient_id,
        "amount": request.amount,
        "note": request.note,
    }

    # Execute multi-agent orchestration
    orchestrator_output = await orchestrator.run(
        txn=txn_dict,
        user_session_history=session_history,
        user_baseline=3000.0,
    )

    recipient_result = orchestrator_output["recipient_result"]
    risk_result = orchestrator_output["risk_result"]
    behavioral_result = orchestrator_output["behavioral_result"]
    decision = orchestrator_output["decision"]
    explanation = orchestrator_output["explanation"]

    # Record this attempt AFTER computing velocity so it doesn't count itself
    record_attempt(request.sender_id, request.recipient_id, recipient_result.get("status", "new"))

    print(f"  ✓ Recipient Agent: {recipient_result.get('status')} (score: {recipient_result.get('score_contribution', 0)})")
    print(f"  ✓ Risk Analysis Agent: {risk_result.get('score', 0)} (model: {risk_result.get('model', 'gemini')})")
    print(f"  ✓ Behavioral Agent: {behavioral_result.get('score', 0)} (session has {len(session_history)} prior attempt(s))")
    print(f"  📈 Decision Agent: Final Score {decision['final_score']} -> {decision['category'].upper()} ({decision['action']})")
    print(f"  🔗 Cryptographic Audit Hash: {orchestrator_output.get('audit_hash', '')[:16]}...")

    # Build backward-compatible structure for frontend adapter and legacy consumers
    rule_factors = risk_result.get("factors", [])
    behavior_factors = behavioral_result.get("factors", [])
    llm_signals = risk_result.get("signals", [])

    all_factors = rule_factors + behavior_factors
    if llm_signals:
        all_factors.append({"type": "llm_red_flags", "flags": llm_signals})

    rule_score = risk_result.get("rule_score", risk_result.get("score", 0))

    llm_result = {
        "score_contribution": risk_result.get("urgency_score", 0) * 0.15,
        "red_flags": llm_signals,
        "narrative": explanation,
        "fraud_model": risk_result.get("model", "gemini"),
        "explanation_model": "gemini",
    }

    return {
        "recipient_result": recipient_result,
        "rule_result": {
            "score": rule_score,
            "factors": rule_factors,
        },
        "behavioral_result": behavioral_result,
        "llm_result": llm_result,
        "decision": {
            "final_score": float(decision["final_score"]),
            "category": decision["category"],
            "action": decision["action"],
            "score_breakdown": {
                "recipient": recipient_result.get("score_contribution", 0),
                "rule_based": rule_score,
                "behavioral": behavioral_result.get("score", 0),
                "llm_adjustment": risk_result.get("urgency_score", 0) * 0.15,
            },
        },
        "all_factors": all_factors,
        "explanation": explanation,
        "audit_hash": orchestrator_output.get("audit_hash"),
        "audit_sequence": orchestrator_output.get("audit_sequence"),
        "orchestrator_output": orchestrator_output,
    }

