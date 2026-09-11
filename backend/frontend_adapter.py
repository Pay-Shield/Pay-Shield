"""
Translates PayShield's internal risk pipeline output into the exact JSON
contracts the React frontend (src/services/api.ts, src/types.ts) expects.

Internal vocabulary            -> Frontend vocabulary
low / medium / high / critical -> SAFE / WARNING / HIGH / CRITICAL
auto_approve                   -> SAFE
require_confirmation           -> VERIFY
require_verification           -> PAUSED
hard_block                     -> BLOCKED
"""
import random
import re
import time

RISK_LEVEL_MAP = {
    "low": "SAFE",
    "medium": "WARNING",
    "high": "HIGH",
    "critical": "CRITICAL",
}

ACTION_MAP = {
    "auto_approve": "SAFE",
    "require_confirmation": "VERIFY",
    "require_verification": "PAUSED",
    "hard_block": "BLOCKED",
}

RECIPIENT_STATUS_RISK = {
    "known": 5,
    "new": 45,
    "invalid_format": 35,
    "flagged": 92,
}


def _factor_weight(factors: list, factor_type: str) -> float:
    for f in factors:
        if f.get("type") == factor_type:
            return f.get("weight", 0)
    return 0


def build_breakdown(all_factors: list, recipient_result: dict) -> dict:
    """
    Map our point-weighted factor list onto the frontend's five 0-100
    risk dimensions (transactionRisk, recipientRisk, behaviorRisk,
    socialEngineeringRisk, networkRisk).
    """
    amount_weight = max(
        _factor_weight(all_factors, "amount_5x_baseline"),
        _factor_weight(all_factors, "amount_2_5x_baseline"),
    )
    transaction_risk = min(100, round((amount_weight / 30) * 100)) if amount_weight else 8

    recipient_status = recipient_result.get("status", "new")
    recipient_risk = RECIPIENT_STATUS_RISK.get(recipient_status, 30)

    velocity_weight = _factor_weight(all_factors, "high_velocity")
    behavior_risk = 55 if velocity_weight else 9

    social_weight = (
        _factor_weight(all_factors, "urgency_language") +
        _factor_weight(all_factors, "threat_language") +
        _factor_weight(all_factors, "coercive_pressure") +
        _factor_weight(all_factors, "impersonation_language") +
        _factor_weight(all_factors, "gift_card_request")
    )
    llm_flags = next((f.get("flags", []) for f in all_factors if f.get("type") == "llm_red_flags"), [])
    social_engineering_risk = min(100, round(social_weight * 1.2) + len(llm_flags) * 8)
    if social_engineering_risk == 0:
        social_engineering_risk = 4

    network_risk = {
        "known": 10,
        "new": 28,
        "invalid_format": 32,
        "flagged": 45,
    }.get(recipient_status, 15)

    return {
        "transactionRisk": transaction_risk,
        "recipientRisk": recipient_risk,
        "behaviorRisk": behavior_risk,
        "socialEngineeringRisk": social_engineering_risk,
        "networkRisk": network_risk,
    }


def build_reasons(all_factors: list, llm_result: dict, recipient_result: dict) -> list:
    """
    Human-readable reason strings for the frontend's "Why did PAYSHIELD
    intervene?" panel.
    """
    reason_text = {
        "amount_5x_baseline": "Transfer amount is more than 5x your typical spend baseline",
        "amount_2_5x_baseline": "Transfer amount is 2-5x your typical spend baseline",
        "urgency_language": "High-urgency language detected requiring immediate transfer",
        "threat_language": "Coercive language detected (account block, legal action, penalty)",
        "coercive_pressure": "Urgency combined with threat/coercion language detected",
        "impersonation_language": "Language suggesting bank/support impersonation or identity verification request",
        "gift_card_request": "Request for payment via irreversible method (gift card / crypto)",
        "high_velocity": "Multiple new-recipient payment attempts in this session",
    }

    reasons = []
    for factor in all_factors:
        ftype = factor.get("type")
        if ftype in reason_text:
            reasons.append(reason_text[ftype])

    status = recipient_result.get("status")
    if status == "flagged":
        reasons.append(f"Recipient matches known scam registry: {recipient_result.get('reason', 'reported fraud')}")
    elif status == "new":
        reasons.append("First-time or unverified recipient handle")
    elif status == "known":
        reasons.append("Recipient verified in trusted payee directory")

    # Only append the LLM narrative if it adds information beyond the factor
    # list above — the generic "appears legitimate" fallback text is noise
    # (and actively contradictory) when real risk factors were just listed.
    narrative = llm_result.get("narrative")
    is_generic_fallback = narrative == "Payment appears legitimate based on available information."
    if narrative and narrative not in reasons and not (is_generic_fallback and reasons):
        reasons.append(narrative)

    if not reasons:
        reasons.append("Routine transaction within normal personal spend limits")

    return reasons


def generate_transaction_id() -> str:
    return f"TXN-{random.randint(10000, 99999)}-IN"


def map_to_analyze_response(pipeline_result: dict, elapsed_seconds: float) -> dict:
    """
    Build the exact AnalyzePaymentResponse shape from src/types.ts.
    """
    decision = pipeline_result["decision"]
    all_factors = pipeline_result["all_factors"]
    recipient_result = pipeline_result["recipient_result"]
    llm_result = pipeline_result["llm_result"]

    category = decision["category"]
    action = decision["action"]

    return {
        "risk_score": round(decision["final_score"]),
        "risk_level": RISK_LEVEL_MAP.get(category, "WARNING"),
        "action": ACTION_MAP.get(action, "VERIFY"),
        "reasons": build_reasons(all_factors, llm_result, recipient_result),
        "breakdown": build_breakdown(all_factors, recipient_result),
        "analysis_duration": round(elapsed_seconds, 2),
        "transaction_id": generate_transaction_id(),
    }


# --- Scam message check (independent of a specific payment) -------------

URGENCY_RE = re.compile(r"urgent|immediately|today|now|expire|within\s*\d+\s*(mins?|hours?)|asap|hurry", re.I)
IMPERSONATION_RE = re.compile(r"bank|support|kyc|helpdesk|customs|tax|department|npci|rbi|electricity|official", re.I)
THREAT_RE = re.compile(r"block|disconnect|police|arrest|court|legal|fir|freeze|lock|suspend|penalty", re.I)
PAYMENT_PRESSURE_RE = re.compile(r"send|pay|deposit|transfer|₹|rs\.?\s?\d|\$\d|qr code|upi|link|click", re.I)
UNVERIFIED_LINKS_RE = re.compile(r"https?://|bit\.ly|t\.co|wa\.me|\.apk|\.xyz", re.I)


def check_scam_message(message: str, llm_flags: list) -> dict:
    """
    Build the ScamCheckResult shape from src/types.ts for the
    "Analyze SMS/WhatsApp message" feature.
    """
    urgency = bool(URGENCY_RE.search(message))
    impersonation = bool(IMPERSONATION_RE.search(message)) or "impersonation_attempt" in llm_flags
    threat = bool(THREAT_RE.search(message))
    payment_pressure = bool(PAYMENT_PRESSURE_RE.search(message))
    unverified_links = bool(UNVERIFIED_LINKS_RE.search(message))

    keywords = []
    if urgency:
        keywords.append("urgent / immediate deadline")
    if impersonation:
        keywords.append("institutional impersonation")
    if threat:
        keywords.append("account suspension / legal threat")
    if payment_pressure:
        keywords.append("direct fund transfer demand")
    if unverified_links:
        keywords.append("untrusted external link or APK")

    score = 15
    if threat and payment_pressure:
        score = 94
    elif urgency and payment_pressure:
        score = 86
    elif impersonation:
        score = 68
    elif unverified_links:
        score = 75
    elif "irreversible_payout" in llm_flags:
        score = max(score, 80)

    if score >= 80:
        risk_level = "CRITICAL"
    elif score >= 60:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "WARNING"
    else:
        risk_level = "SAFE"

    if score >= 70:
        recommendation = "Do not make the payment until the request has been independently verified through official channels."
        explanation = "PayShield detected classic social engineering signatures: urgency, coercive pressure, and/or suspicious payment routing."
    elif score >= 40:
        recommendation = "Verify the sender's identity via a known phone number before proceeding."
        explanation = "Certain unusual claims were identified that warrant caution."
    else:
        recommendation = "This message appears routine. Standard verification recommended."
        explanation = "No significant coercive or deceptive payment markers were detected in this text."

    return {
        "message": message,
        "scamRiskScore": score,
        "riskLevel": risk_level,
        "signalsDetected": {
            "urgency": urgency,
            "impersonation": impersonation,
            "threat": threat,
            "paymentPressure": payment_pressure,
            "unverifiedLinks": unverified_links,
        },
        "highlightedKeywords": keywords,
        "explanation": explanation,
        "recommendation": recommendation,
    }
