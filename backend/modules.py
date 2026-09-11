from models import PaymentRequest
from typing import Optional
import re


# Keyed by UPI-style handle where possible (what the React frontend actually
# sends) as well as legacy bank-code style IDs (used by test_api.py / the
# PS09-native contract). All lookups are case-insensitive.
KNOWN_RECIPIENTS = {
    "goog": {"name": "Google Pay", "account_age_days": 365},
    "amzn": {"name": "Amazon Payments", "account_age_days": 300},
    "util": {"name": "Utility Payments", "account_age_days": 200},
    "rahul@upi": {"name": "Rahul Sharma", "account_age_days": 420},
    "merchant@upi": {"name": "Amazon Pay India", "account_age_days": 900},
    "aakash.v@axisbank": {"name": "Aakash Verma (Landlord)", "account_age_days": 700},
    "zomato@hdfcbank": {"name": "Zomato", "account_age_days": 600},
}

FLAGGED_RECIPIENTS = {
    "scam001": "Known scam ring",
    "fraud_net": "Compromised account history",
    "invest-guaranteed@okhdfcbank": "Registered in crypto/investment scam syndicate registry",
}

# UPI-style VPA (name@bank) OR legacy bank-code style (3+ alnum chars)
_VALID_ID_RE = re.compile(r"^[\w.\-]{2,}@[\w.\-]{2,}$|^[a-z0-9]{3,}$", re.I)

URGENCY_RE = re.compile(
    r"\burgent(ly)?\b|\bimmediate(ly)?\b|\bexpir\w*\b|\basap\b|\bhurry\b|\bquickly\b"
    r"|\btime[- ]sensitive\b|\btonight\b|\bright away\b|\bwithin\s*\d+\s*(mins?|hours?)\b",
    re.I,
)
THREAT_RE = re.compile(
    r"\bblock(ed)?\b|\bdisconnect\w*\b|\bsuspend\w*\b|\barrest\w*\b|\bpolice\b|\bcourt\b"
    r"|\blegal\s*action\b|\bfir\b|\bfreeze\b|\block(ed)?\b|\bpenalty\b|\bfine\b",
    re.I,
)
IMPERSONATION_RE = re.compile(
    r"\bbank\b|\bsupport\b|\bkyc\b|\brefund\b|\botp\b|\bverify\b|\bconfirm\s*identity\b"
    r"|\bsecurity\b|\bhelpdesk\b|\bcustoms\b|\bofficial\b|\bnpci\b|\brbi\b|\belectricity\b",
    re.I,
)
GIFT_CARD_RE = re.compile(
    r"gift\s*card|itunes|google\s*play|amazon\s*voucher|\brecharge\b|\bcrypto\b|\bbitcoin\b"
    r"|guaranteed.{0,20}return|\binvest\w*\b",
    re.I,
)


def recipient_verification(request: PaymentRequest, user_transaction_history: Optional[dict] = None) -> dict:
    """
    Verify recipient: known/new/flagged status, account format validation.
    """
    recipient_id = request.recipient_id.lower().strip()

    if recipient_id in FLAGGED_RECIPIENTS:
        return {
            "status": "flagged",
            "reason": FLAGGED_RECIPIENTS[recipient_id],
            "score_contribution": 45,
        }

    if recipient_id in KNOWN_RECIPIENTS:
        recipient_info = KNOWN_RECIPIENTS[recipient_id]
        return {
            "status": "known",
            "name": recipient_info["name"],
            "account_age_days": recipient_info["account_age_days"],
            "score_contribution": 0,
        }

    # Accepts both UPI-style VPAs (name@bank) and legacy bank-code IDs
    if not _VALID_ID_RE.match(recipient_id):
        return {
            "status": "invalid_format",
            "score_contribution": 20,
        }

    return {
        "status": "new",
        "score_contribution": 25,
    }


def risk_analysis_rules(request: PaymentRequest, user_baseline: Optional[float] = None) -> dict:
    """
    Rule-based risk analysis: amount, keyword hits (urgency/threat/impersonation/gift-card).
    Scans the note AND recipient name, since scam signal often lives in the
    display name ("Electricity Billing Cell") rather than only the free-text note.
    """
    score = 0
    factors = []

    baseline = user_baseline or 3000.0
    if request.amount > baseline * 5:
        score += 30
        factors.append({
            "type": "amount_5x_baseline",
            "value": request.amount,
            "baseline": baseline,
            "weight": 30,
        })
    elif request.amount > baseline * 2:
        score += 15
        factors.append({
            "type": "amount_2_5x_baseline",
            "value": request.amount,
            "baseline": baseline,
            "weight": 15,
        })

    # Urgency/threat scan note + recipient name — scam handles often embed
    # urgency directly (e.g. "urgent.power@upi"). Impersonation/gift-card
    # scan the note ONLY: a legitimate recipient's own name can innocently
    # contain a word like "electricity" or "bank" (e.g. "Electricity Billing
    # Cell", "Bank of India") — scoring that as impersonation would punish
    # real payees for their own name, and double-counts with urgency/threat
    # when a scam handle happens to embed both.
    combined_text = f"{request.note} {request.recipient_name}"
    note_text = request.note

    has_urgency = bool(URGENCY_RE.search(combined_text))
    has_threat = bool(THREAT_RE.search(combined_text))

    if has_urgency or has_threat:
        # Combined urgency+threat ("pay immediately or we'll disconnect you") is the
        # classic coercion pattern — weight it higher than either signal alone, but
        # keep it well under the amount+recipient ceiling so a single language cue
        # can't alone force a Critical verdict.
        weight = 15 if (has_urgency and has_threat) else 10
        factors.append({
            "type": "urgency_language" if has_urgency and not has_threat else
                     "threat_language" if has_threat and not has_urgency else
                     "coercive_pressure",
            "urgency_detected": has_urgency,
            "threat_detected": has_threat,
            "weight": weight,
        })
        score += weight

    impersonation_match = IMPERSONATION_RE.search(note_text)
    if impersonation_match:
        score += 25
        factors.append({
            "type": "impersonation_language",
            "matched": impersonation_match.group(0),
            "weight": 25,
        })

    gift_card_match = GIFT_CARD_RE.search(note_text)
    if gift_card_match:
        score += 30
        factors.append({
            "type": "gift_card_request",
            "matched": gift_card_match.group(0),
            "weight": 30,
        })

    return {
        "score": min(score, 100),
        "factors": factors,
    }


def behavioral_pattern(request: PaymentRequest, user_session_history: Optional[list] = None) -> dict:
    """
    Behavioral: velocity — 2+ new-recipient attempts by the same sender in
    the current session window (see session_store.py for the window/store).
    """
    score = 0
    factors = []

    if user_session_history:
        new_recipient_count = sum(
            1 for attempt in user_session_history
            if attempt.get("recipient_status") in ("new", "flagged", "invalid_format")
        )
        if new_recipient_count >= 2:
            score += 15
            factors.append({
                "type": "high_velocity",
                "new_recipients_in_session": new_recipient_count,
                "weight": 15,
            })

    return {
        "score": score,
        "factors": factors,
    }
