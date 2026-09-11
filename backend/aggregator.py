from models import RiskCategory, ActionType
from typing import Optional


def aggregate_and_decide(
    recipient_score: float,
    rule_score: float,
    behavioral_score: float,
    llm_adjustment: float,
) -> dict:
    """
    Combine all signals into final score, map to category, decide action.
    Rule weights guide aggregation; LLM adjustment is bounded ±15.
    """
    # Clamp LLM adjustment
    llm_adjustment = max(-15, min(15, llm_adjustment))

    # Aggregate: start with rules, add recipient/behavioral, apply LLM
    base_score = recipient_score + rule_score + behavioral_score
    final_score = base_score + llm_adjustment

    # Cap at 100
    final_score = min(100, max(0, final_score))

    # Map to category
    if final_score < 30:
        category = RiskCategory.LOW
    elif final_score < 60:
        category = RiskCategory.MEDIUM
    elif final_score < 85:
        category = RiskCategory.HIGH
    else:
        category = RiskCategory.CRITICAL

    # Determine action
    action_map = {
        RiskCategory.LOW: ActionType.AUTO_APPROVE,
        RiskCategory.MEDIUM: ActionType.REQUIRE_CONFIRMATION,
        RiskCategory.HIGH: ActionType.REQUIRE_VERIFICATION,
        RiskCategory.CRITICAL: ActionType.HARD_BLOCK,
    }

    action = action_map[category]

    return {
        "final_score": final_score,
        "category": category.value,  # Convert enum to string
        "action": action.value,      # Convert enum to string
        "score_breakdown": {
            "recipient": recipient_score,
            "rule_based": rule_score,
            "behavioral": behavioral_score,
            "llm_adjustment": llm_adjustment,
        },
    }


def format_explanation(
    category: str,
    final_score: float,
    factors: list,
    llm_narrative: str,
) -> str:
    """
    Generate plain-language explanation for the user.
    """
    risk_level = category.upper()

    explanation = f"**Risk Assessment: {risk_level}** (Score: {final_score:.0f}/100)\n\n"

    if factors:
        explanation += "**Detected Factors:**\n"
        for factor in factors:
            factor_type = factor.get("type", "unknown").replace("_", " ").title()
            explanation += f"• {factor_type}\n"

    if llm_narrative:
        explanation += f"\n**Additional Concern:** {llm_narrative}\n"

    explanation += "\n"

    if category == RiskCategory.LOW:
        explanation += "✓ This payment appears safe. Processing automatically."
    elif category == RiskCategory.MEDIUM:
        explanation += "⚠ Please review the factors above and confirm this payment."
    elif category == RiskCategory.HIGH:
        explanation += "⚠⚠ We need to verify your identity before proceeding. You may re-confirm after verification."
    else:  # CRITICAL
        explanation += "❌ This payment has been blocked due to high fraud risk. No override available."

    return explanation
