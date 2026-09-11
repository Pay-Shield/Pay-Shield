import os
import json
import re
import requests
from anthropic import Anthropic
from models import PaymentRequest


def classify_fraud_intent(
    request: PaymentRequest,
    recipient_status: str,
    rule_score: float,
) -> dict:
    """
    Use Nemotron 3.5 Lightning for fast fraud classification and intent extraction.
    Returns score adjustment and detected risk factors.
    Falls back to heuristics if API unavailable.
    """
    nemotron_key = os.getenv("NEMOTRON_API_KEY")

    if nemotron_key:
        print("    🔍 Attempting Nemotron API call...")
        result = _call_nemotron(request, recipient_status, rule_score)
        if result:
            print(f"    ✓ Nemotron returned: {result.get('red_flags', [])}")
            return result
        print("    ⚠ Nemotron unavailable, falling back to heuristics")

    # Fallback to heuristic rules
    result = _classify_by_heuristics(request)
    print(f"    ✓ Using heuristics: {result.get('red_flags', [])}")
    return result


def _call_nemotron(
    request: PaymentRequest,
    recipient_status: str,
    rule_score: float,
) -> dict:
    """
    Call Nemotron 3.5 Lightning API for fraud intent classification.
    """
    api_key = os.getenv("NEMOTRON_API_KEY")
    api_endpoint = os.getenv(
        "NEMOTRON_API_ENDPOINT",
        "https://api.nemo.nvidia.com/v1/chat/completions"
    )

    prompt = f"""Analyze this payment request for fraud intent, social engineering, and impersonation.
Be concise and return ONLY valid JSON.

Payment:
- To: {request.recipient_name} ({request.recipient_id})
- Amount: ${request.amount}
- Status: {recipient_status}
- Note: "{request.note}"

Return JSON:
{{
    "score_adjustment": <integer -15 to 15>,
    "red_flags": [<list of strings: urgency_pressure, threat_pressure, impersonation_attempt, irreversible_payout, or none>]
}}"""

    try:
        response = requests.post(
            api_endpoint,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "nemotron-3.5-lightning-30b-a3b",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 200,
            },
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # Parse JSON from response
            json_match = re.search(r"\{[^}]+\}", content)
            if json_match:
                result = json.loads(json_match.group())
                score_adjustment = max(-15, min(15, result.get("score_adjustment", 0)))
                red_flags = result.get("red_flags", [])

                return {
                    "score_contribution": score_adjustment,
                    "red_flags": red_flags,
                    "model": "nemotron-3.5-lightning-30b-a3b",
                }

        return None

    except Exception as e:
        print(f"Nemotron API error: {str(e)}")
        return None


def _classify_by_heuristics(request: PaymentRequest) -> dict:
    """
    Fallback heuristic fraud classification when API unavailable.

    Deliberately conservative weights: this heuristic re-detects largely the
    same keyword families the rule engine (modules.py) already scores, so it
    isn't an independent signal the way a real LLM call would be — giving it
    the full ±15 range would double-count and risk pushing scores past their
    intended category (e.g. a High-risk scenario tipping into Critical on
    keyword overlap alone). A real Nemotron/Claude call is free to use more
    of the ±15 range since its judgment is actually independent of the rules.
    """
    score_adjustment = 0
    red_flags = []

    # Urgency/threat may legitimately be embedded in a scam handle itself
    # (e.g. "urgent.power@upi"); impersonation/gift-card are scoped to the
    # note only, since a real recipient's own name can innocently contain a
    # word like "electricity" or "bank" without it being impersonation.
    combined_lower = f"{request.note} {request.recipient_name}".lower()
    note_lower = request.note.lower()

    if re.search(r"\burgent(ly)?\b|\bimmediate(ly)?\b|\basap\b|\bhurry\b|\btonight\b|\bexpir\w*\b", combined_lower):
        score_adjustment += 6
        red_flags.append("urgency_pressure")

    if re.search(r"\bblock(ed)?\b|\bdisconnect\w*\b|\bsuspend\w*\b|\barrest\w*\b|\bpolice\b|\bpenalty\b|\bfine\b", combined_lower):
        score_adjustment += 6
        red_flags.append("threat_pressure")

    if re.search(r"\bverify\b|\bconfirm\b|\bbank\b|\bsupport\b|\bkyc\b|\botp\b|\brefund\b", note_lower):
        score_adjustment += 10
        red_flags.append("impersonation_attempt")

    if re.search(r"gift\s*card|\bcrypto\b|\bbitcoin\b|\bvoucher\b|guaranteed.{0,20}return", note_lower):
        score_adjustment += 10
        red_flags.append("irreversible_payout")

    # Clamp to ±15
    score_adjustment = max(-15, min(15, score_adjustment))

    return {
        "score_contribution": score_adjustment,
        "red_flags": red_flags,
        "model": "heuristic_fallback",
    }


def generate_explanation(
    request: PaymentRequest,
    recipient_status: str,
    rule_score: float,
    fraud_flags: list,
    final_score: float,
) -> dict:
    """
    Use Claude for user-facing explanation (only for Medium/High risk or complex cases).
    Reserve Claude for explanation quality, not routine decisions.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "narrative": _build_default_explanation(rule_score, fraud_flags),
            "model": "default",
        }

    # Only call Claude for Medium/High risk (optimization)
    if final_score < 30:
        return {
            "narrative": _build_default_explanation(rule_score, fraud_flags),
            "model": "default",
        }

    client = Anthropic()

    flags_text = ", ".join(fraud_flags) if fraud_flags else "none detected"

    prompt = f"""You are a payment security expert. Provide a brief, clear explanation
for why we're asking the user to review this payment.

Payment Details:
- Recipient: {request.recipient_name} ({request.recipient_id})
- Amount: ${request.amount}
- Status: {recipient_status}
- Risk flags: {flags_text}
- Current score: {final_score:.0f}/100

In 1-2 sentences, explain the primary concern(s) in plain language suitable for a user.
Focus on the most actionable concern. Be direct but not alarmist."""

    try:
        message = client.messages.create(
            model="claude-sonnet-5",  # Use current Sonnet (not 3.5)
            max_tokens=150,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        narrative = message.content[0].text.strip()
        return {
            "narrative": narrative,
            "model": "claude-sonnet-5",
        }

    except Exception as e:
        return {
            "narrative": _build_default_explanation(rule_score, fraud_flags),
            "error": str(e),
            "model": "default_fallback",
        }


def _build_default_explanation(rule_score: float, fraud_flags: list) -> str:
    """
    Fallback explanation when Claude unavailable or for low-risk cases.
    """
    if not fraud_flags:
        return "Payment appears legitimate based on available information."

    explanations = {
        "urgency_pressure": "Urgent language detected in payment note.",
        "threat_pressure": "Coercive language (account block, legal action, penalty) detected.",
        "impersonation_attempt": "Language suggesting account verification or support request.",
        "irreversible_payout": "Request for payment via irreversible method (gift card, crypto).",
    }

    concerns = [explanations.get(flag, flag) for flag in fraud_flags]
    return " ".join(concerns)


def get_llm_reasoning(
    request: PaymentRequest,
    recipient_status: str,
    rule_score: float,
    final_score: float = None,
) -> dict:
    """
    Hybrid LLM reasoning: fast fraud classification + Claude explanations.

    Returns score adjustment and narrative explanation.
    """
    # Step 1: Fast fraud classification (Nemotron)
    fraud_result = classify_fraud_intent(request, recipient_status, rule_score)

    # Step 2: Generate explanation (Claude for Medium/High, default for Low)
    if final_score is None:
        final_score = rule_score + fraud_result["score_contribution"]

    explanation_result = generate_explanation(
        request,
        recipient_status,
        rule_score,
        fraud_result["red_flags"],
        final_score,
    )

    return {
        "score_contribution": fraud_result["score_contribution"],
        "red_flags": fraud_result["red_flags"],
        "narrative": explanation_result["narrative"],
        "fraud_model": fraud_result["model"],
        "explanation_model": explanation_result["model"],
    }
