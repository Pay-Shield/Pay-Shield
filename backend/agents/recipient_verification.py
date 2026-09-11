"""
Recipient Verification Agent (Rule-based + Lookup)

Inspects recipient identifiers (UPI VPAs, bank IDs, display names) against:
1. Verified Payee Directory (whitelist)
2. Flagged Scam / Fraud Syndicate Registry (blacklist)
3. UPI / IFSC syntax and account format validation
"""

import re
from typing import Dict, Any, Optional

# Verified payee directory
KNOWN_RECIPIENTS = {
    "goog": {"name": "Google Pay", "account_age_days": 365, "verified": True},
    "amzn": {"name": "Amazon Payments", "account_age_days": 300, "verified": True},
    "util": {"name": "Utility Payments", "account_age_days": 200, "verified": True},
    "rahul@upi": {"name": "Rahul Sharma", "account_age_days": 420, "verified": True},
    "merchant@upi": {"name": "Amazon Pay India", "account_age_days": 900, "verified": True},
    "aakash.v@axisbank": {"name": "Aakash Verma (Landlord)", "account_age_days": 700, "verified": True},
    "zomato@hdfcbank": {"name": "Zomato", "account_age_days": 600, "verified": True},
}

# Flagged fraud / syndicate registry
FLAGGED_RECIPIENTS = {
    "scam001": "Known scam ring",
    "fraud_net": "Compromised account history",
    "invest-guaranteed@okhdfcbank": "Registered in crypto/investment scam syndicate registry",
    "fake.customs@upi": "Reported institutional impersonation account",
    "power-bill-helpdesk@ybl": "Reported fake electricity disconnection phishing scam",
}

# UPI-style VPA (name@bank) or standard alphanumeric ID (3+ chars)
_UPI_REGEX = re.compile(r"^[\w.\-]{2,}@[\w.\-]{2,}$", re.IGNORECASE)
_ALPHANUMERIC_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-]{3,}$")


def verify_recipient(recipient_id: str, recipient_name: str = "") -> Dict[str, Any]:
    """
    Core verification logic for payee identifier.
    Returns status, risk weight (0-100), and rationale.
    """
    cleaned_id = recipient_id.lower().strip() if recipient_id else ""

    # 1. Check flagged blacklist
    if cleaned_id in FLAGGED_RECIPIENTS:
        reason = FLAGGED_RECIPIENTS[cleaned_id]
        return {
            "status": "flagged",
            "risk_weight": 95,
            "score_contribution": 45,
            "reason": f"Matches scam registry: {reason}",
            "verified": False,
            "account_age_days": 0,
        }

    # 2. Check known whitelist
    if cleaned_id in KNOWN_RECIPIENTS:
        info = KNOWN_RECIPIENTS[cleaned_id]
        return {
            "status": "known",
            "risk_weight": 5,
            "score_contribution": 0,
            "reason": f"Verified payee: {info['name']}",
            "verified": True,
            "account_age_days": info.get("account_age_days", 180),
        }

    # 3. Format syntax validation
    is_upi = bool(_UPI_REGEX.match(cleaned_id))
    is_valid_id = bool(_ALPHANUMERIC_ID_REGEX.match(cleaned_id))

    if not (is_upi or is_valid_id):
        return {
            "status": "invalid_format",
            "risk_weight": 40,
            "score_contribution": 20,
            "reason": "Malformed or non-standard recipient identifier format",
            "verified": False,
            "account_age_days": 0,
        }

    # 4. New / unverified recipient
    return {
        "status": "new",
        "risk_weight": 50,
        "score_contribution": 25,
        "reason": "New or unverified recipient with no prior interaction history",
        "verified": False,
        "account_age_days": 0,
    }



def recipient_verification_agent(txn: Dict[str, Any]) -> Dict[str, Any]:
    """
    Agent entrypoint for Recipient Verification.
    Accepts transaction dict (or PaymentRequest-compatible object) and returns verification signals.
    """
    recipient_id = txn.get("recipient_id") or txn.get("upiId") or ""
    recipient_name = txn.get("recipient_name") or txn.get("recipientName") or ""

    result = verify_recipient(recipient_id, recipient_name)
    result["agent_id"] = "recipient_verification_agent"
    return result
