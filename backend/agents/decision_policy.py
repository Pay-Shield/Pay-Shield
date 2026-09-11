"""
Decision & Policy Agent (Deterministic Aggregator)

Aggregates independent agent signals into an auditable, reproducible Risk Score (0-100),
assigns risk category (Low, Medium, High, Critical), and dictates security policy action:
- Low      (<30)  -> auto_approve (SAFE)
- Medium   (30-59) -> require_confirmation (VERIFY)
- High     (60-84) -> require_verification (PAUSED)
- Critical (85+)   -> hard_block (BLOCKED)
"""

from typing import Dict, Any, List


def decision_policy_agent(
    recipient_signal: Dict[str, Any],
    risk_signal: Dict[str, Any],
    behavior_signal: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministically combine multi-agent signals into a single score and category.
    """
    # Support both 0-100 risk_weight and 0-45 score_contribution
    recipient_risk = float(recipient_signal.get("risk_weight", 0))
    if recipient_risk == 0 and "score_contribution" in recipient_signal:
        sc = recipient_signal.get("score_contribution", 0)
        recipient_risk = 95 if sc >= 45 else 50 if sc >= 25 else 40 if sc >= 20 else 5

    risk_score = float(max(risk_signal.get("urgency_score", 0), risk_signal.get("score", 0)))
    behavioral_score = float(max(behavior_signal.get("raw_score", 0), behavior_signal.get("score", 0)))

    status = recipient_signal.get("status")

    # Weighted formula (as specified in architecture plan):
    # 35% recipient risk + 35% risk analysis/urgency + 30% behavioral patterns
    aggregated = (
        recipient_risk * 0.35 +
        risk_score * 0.35 +
        behavioral_score * 0.30
    )

    # Policy floor guarantees:
    # 1. New/unverified payee requires confirmation (Medium risk: 35-59)
    if status == "new" and aggregated < 35:
        aggregated = 35.0

    # 2. Suspicious combination: New recipient + significant risk/urgency cues (65+) -> HIGH
    if status in ("new", "invalid_format") and (risk_score >= 50 or behavioral_score >= 50):
        aggregated = max(aggregated, 68.0)


    # 3. Flagged recipient in scam registry is elevated to High risk floor (75+)
    if status == "flagged":
        aggregated = max(aggregated, 75.0)

    # 4. Critical syndicate match: Flagged + coercive urgency or velocity spike (90+)
    if status == "flagged" and (risk_score >= 40 or behavioral_score >= 30):
        aggregated = max(aggregated, 92.0)


    final_score = round(min(100.0, max(0.0, aggregated)))

    # Category Mapping
    if final_score < 30:
        category = "low"
        display_category = "Low"
        action = "auto_approve"
    elif final_score < 60:
        category = "medium"
        display_category = "Medium"
        action = "require_confirmation"
    elif final_score < 85:
        category = "high"
        display_category = "High"
        action = "require_verification"
    else:
        category = "critical"
        display_category = "Critical"
        action = "hard_block"


    return {
        "agent_id": "decision_policy_agent",
        "final_score": final_score,
        "score": final_score,
        "category": category,
        "display_category": display_category,
        "action": action,
        "breakdown": {
            "recipient_score": recipient_risk,
            "risk_score": risk_score,
            "behavioral_score": behavioral_score,
        },

    }
