"""
Explainability Agent (LLM)

Converts multi-agent signals, risk factors, and policy decisions into
concise, transparent, plain-language explanations suitable for end users.
Uses Google Gemini with automatic fallback to deterministic templates.
"""

import json
from typing import Dict, Any, List
from agents.gemini_client import call_gemini, is_gemini_available


def _template_explanation(all_signals: Dict[str, Any], final_score: int, category: str) -> str:
    """Deterministic, plain-language explanation fallback."""
    category_lower = category.lower()

    if category_lower == "low":
        return "This payment appears safe based on verified payee signals and standard spend patterns. Processing automatically."

    reasons = []
    recipient_signal = all_signals.get("recipient", {})
    risk_signal = all_signals.get("risk", {})
    behavior_signal = all_signals.get("behavior", {})

    if recipient_signal.get("status") == "flagged":
        reasons.append("the recipient account matches a known fraud registry")
    elif recipient_signal.get("status") == "new":
        reasons.append("this is a first-time recipient with no prior transaction history")

    for f in risk_signal.get("factors", []):
        ftype = f.get("type")
        if ftype == "amount_5x_baseline":
            reasons.append("the amount is more than 5x your typical spending baseline")
        elif ftype == "amount_2_5x_baseline":
            reasons.append("the transfer amount is unusually high compared to your baseline")
        elif ftype == "urgency_language":
            reasons.append("high-urgency language demanding immediate transfer was detected")
        elif ftype == "impersonation_language":
            reasons.append("language attempting bank, utility, or authority impersonation was detected")

    if behavior_signal.get("velocity_spike"):
        reasons.append("multiple rapid payment attempts to unverified payees were detected")

    if reasons:
        reasons_text = ", and ".join(reasons[:2])
        if category_lower == "critical":
            return f"Payment blocked: {reasons_text.capitalize()}. This matches dangerous fraud patterns."
        elif category_lower == "high":
            return f"High risk alert: We paused this transfer because {reasons_text}. Additional identity verification is required."
        else:
            return f"Caution advised: {reasons_text.capitalize()}. Please review the details before confirming."

    return f"This payment has a risk score of {final_score}/100 ({category}). Please review before proceeding."


def explainability_agent(
    all_signals: Dict[str, Any],
    final_score: int,
    category: str,
) -> str:
    """
    Agent entrypoint for Explainability.
    Generates 1-2 sentence human-readable explanation using Gemini or heuristic fallback.
    """
    if not is_gemini_available():
        return _template_explanation(all_signals, final_score, category)

    # Simplified signal payload for token efficiency and clarity
    signals_summary = {
        "recipient_status": all_signals.get("recipient", {}).get("status"),
        "recipient_reason": all_signals.get("recipient", {}).get("reason"),
        "risk_signals": all_signals.get("risk", {}).get("signals", []),
        "risk_summary": all_signals.get("risk", {}).get("summary", ""),
        "behavior_anomalies": [
            f.get("detail") for f in all_signals.get("behavior", {}).get("factors", [])
        ],
    }

    prompt = f"""Explain this payment fraud-risk decision to a non-technical user in 1-2 short, direct sentences in plain English (no technical jargon, no bullet points).

Risk Signals Detected: {json.dumps(signals_summary)}
Risk Score: {final_score}/100
Risk Category: {category}

Return ONLY the explanation text, nothing else."""

    system_instruction = (
        "You are a friendly payment security assistant. Write a short, empathetic, "
        "and crystal-clear explanation for why a payment was approved, flagged, or blocked."
    )

    try:
        explanation = call_gemini(prompt, system_instruction=system_instruction, timeout=5.0)
        if explanation and len(explanation.strip()) > 10:
            return explanation.strip().replace('"', '')
    except Exception as e:
        print(f"⚠️ Gemini explainability call failed: {e}")

    return _template_explanation(all_signals, final_score, category)
