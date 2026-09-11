"""
Risk Analysis Agent (Rule-based + LLM)

Combines deterministic rules (amount vs spend baseline, regex triggers) with
Google Gemini LLM reasoning over transaction notes and contextual cues to detect:
- Social engineering and coercive pressure
- Artificial urgency and deadlines
- Institutional impersonation (Bank, Police, Electricity, Tax, Support)
- Irreversible payout requests (Gift cards, Crypto, Vouchers)
"""

import re
from typing import Dict, Any, List, Optional
from agents.gemini_client import call_gemini, extract_json_from_text, is_gemini_available

# Heuristic pattern regular expressions
URGENCY_RE = re.compile(
    r"\burgent(ly)?\b|\bimmediate(ly)?\b|\bexpir\w*\b|\basap\b|\bhurry\b|\bquickly\b"
    r"|\btime[- ]sensitive\b|\btonight\b|\bright away\b|\bwithin\s*\d+\s*(mins?|hours?)\b",
    re.IGNORECASE,
)
THREAT_RE = re.compile(
    r"\bblock(ed)?\b|\bdisconnect\w*\b|\bsuspend\w*\b|\barrest\w*\b|\bpolice\b|\bcourt\b"
    r"|\blegal\s*action\b|\bfir\b|\bfreeze\b|\bpenalty\b|\bfine\b",
    re.IGNORECASE,
)
IMPERSONATION_RE = re.compile(
    r"\bbank\b|\bsupport\b|\bkyc\b|\brefund\b|\botp\b|\bverify\b|\bconfirm\s*identity\b"
    r"|\bsecurity\b|\bhelpdesk\b|\bcustoms\b|\bofficial\b|\bnpci\b|\brbi\b|\belectricity\b",
    re.IGNORECASE,
)
GIFT_CARD_RE = re.compile(
    r"gift\s*card|itunes|google\s*play|amazon\s*voucher|\brecharge\b|\bcrypto\b|\bbitcoin\b"
    r"|guaranteed.{0,20}return|\binvest\w*\b",
    re.IGNORECASE,
)


def _heuristic_analysis(note: str, is_new_recipient: bool, recipient_name: str = "") -> Dict[str, Any]:
    """Fallback rule-based evaluation when LLM is unavailable."""
    combined_text = f"{note} {recipient_name}".strip()
    signals = []
    urgency_points = 0

    has_urgency = bool(URGENCY_RE.search(combined_text))
    has_threat = bool(THREAT_RE.search(combined_text))
    has_impersonation = bool(IMPERSONATION_RE.search(note))
    has_gift_card = bool(GIFT_CARD_RE.search(note))

    if has_urgency:
        signals.append("High urgency deadline detected")
        urgency_points += 30
    if has_threat:
        signals.append("Coercive threat/account suspension language")
        urgency_points += 35
    if has_impersonation:
        signals.append("Institutional/authority impersonation attempt")
        urgency_points += 25
    if has_gift_card:
        signals.append("Irreversible payment medium (crypto/gift card)")
        urgency_points += 30

    if not signals and is_new_recipient:
        signals.append("Unverified recipient with no social-engineering cues")

    urgency_score = min(100, urgency_points)
    summary = (
        "Potential social engineering and urgency pressure detected."
        if urgency_score >= 40
        else "Routine payment communication without overt deception markers."
    )

    return {
        "urgency_score": urgency_score,
        "impersonation_flag": has_impersonation or has_threat,
        "signals": signals,
        "summary": summary,
        "model": "heuristic_fallback",
    }


def analyze_note_with_gemini(note: str, is_new_recipient: bool, recipient_name: str = "") -> Dict[str, Any]:
    """
    Query Gemini LLM for deep intent and social-engineering reasoning.
    Falls back gracefully to heuristics on timeout/error.
    """
    if not is_gemini_available() or not note.strip():
        return _heuristic_analysis(note, is_new_recipient, recipient_name)

    prompt = f"""You are an expert payment-fraud risk analyst. Analyze this transaction context for social engineering, artificial urgency, impersonation, or extortion cues.

Transaction note: "{note}"
Recipient Name / Handle: "{recipient_name}"
Recipient is new/unverified: {is_new_recipient}

Return ONLY valid JSON matching this schema, no markdown code block, no preamble:
{{
  "urgency_score": <integer 0-100 reflecting pressure/risk level>,
  "impersonation_flag": <true/false>,
  "signals": ["short descriptive phrase 1", "short descriptive phrase 2"],
  "summary": "one concise sentence explaining your reasoning"
}}"""

    system_instruction = "You are a specialized security agent detecting financial scams and social engineering. Always respond in pure JSON."

    try:
        raw_output = call_gemini(prompt, system_instruction=system_instruction, timeout=5.0)
        if raw_output:
            parsed = extract_json_from_text(raw_output)
            if parsed and "urgency_score" in parsed:
                return {
                    "urgency_score": max(0, min(100, int(parsed.get("urgency_score", 0)))),
                    "impersonation_flag": bool(parsed.get("impersonation_flag", False)),
                    "signals": list(parsed.get("signals", [])),
                    "summary": str(parsed.get("summary", "")),
                    "model": "gemini",
                }
    except Exception as e:
        print(f"⚠️ Gemini call failed in RiskAnalysisAgent: {e}")

    return _heuristic_analysis(note, is_new_recipient, recipient_name)


def risk_analysis_agent(
    txn: Dict[str, Any],
    user_baseline: float = 3000.0,
    recipient_status: str = "new",
) -> Dict[str, Any]:
    """
    Agent entrypoint for Risk Analysis (combining rules and LLM intent reasoning).
    """
    note = str(txn.get("note") or txn.get("message") or "")
    recipient_name = str(txn.get("recipient_name") or txn.get("recipientName") or "")
    amount = float(txn.get("amount") or 0.0)
    is_new = recipient_status in ("new", "flagged", "invalid_format")

    # 1. Deterministic amount vs baseline rules
    rule_score = 0
    factors = []

    if amount > user_baseline * 5:
        rule_score += 30
        factors.append({
            "type": "amount_5x_baseline",
            "value": amount,
            "baseline": user_baseline,
            "weight": 30,
        })
    elif amount > user_baseline * 2:
        rule_score += 15
        factors.append({
            "type": "amount_2_5x_baseline",
            "value": amount,
            "baseline": user_baseline,
            "weight": 15,
        })

    # 2. LLM or Heuristic intent analysis
    llm_analysis = analyze_note_with_gemini(note, is_new, recipient_name)

    # Convert LLM signals into factor representations
    if llm_analysis["impersonation_flag"]:
        factors.append({
            "type": "impersonation_language",
            "signals": llm_analysis["signals"],
            "weight": 25,
        })
    if llm_analysis["urgency_score"] >= 50:
        factors.append({
            "type": "urgency_language",
            "urgency_score": llm_analysis["urgency_score"],
            "weight": 20,
        })

    total_risk_score = min(100, round(rule_score * 0.5 + llm_analysis["urgency_score"] * 0.5))

    return {
        "agent_id": "risk_analysis_agent",
        "score": total_risk_score,
        "urgency_score": llm_analysis["urgency_score"],
        "impersonation_flag": llm_analysis["impersonation_flag"],
        "signals": llm_analysis["signals"],
        "summary": llm_analysis["summary"],
        "rule_score": rule_score,
        "factors": factors,
        "model": llm_analysis["model"],
    }
