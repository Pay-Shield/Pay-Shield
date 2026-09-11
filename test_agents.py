"""
Comprehensive Test Suite for PayShield Multi-Agent Architecture
and Cryptographic SHA-256 Hash-Chained Audit Trail.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add backend directory to sys.path
backend_dir = str(Path(__file__).resolve().parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from agents.recipient_verification import recipient_verification_agent, verify_recipient
from agents.risk_analysis import risk_analysis_agent
from agents.behavioral_pattern import behavioral_pattern_agent
from agents.decision_policy import decision_policy_agent
from agents.explainability import explainability_agent
from agents.orchestrator import orchestrator
from crypto_audit import AuditTrail, sha256_hash
from pipeline import run_risk_pipeline
from models import PaymentRequest


def test_recipient_verification_agent():
    print("🧪 Testing Recipient Verification Agent...")

    # Known recipient
    res_known = recipient_verification_agent({"recipient_id": "goog", "recipient_name": "Google Pay"})
    assert res_known["status"] == "known", f"Expected known, got {res_known['status']}"
    assert res_known["score_contribution"] == 0

    # New recipient
    res_new = recipient_verification_agent({"recipient_id": "newuser@okhdfcbank", "recipient_name": "New User"})
    assert res_new["status"] == "new", f"Expected new, got {res_new['status']}"
    assert res_new["score_contribution"] == 25

    # Flagged recipient
    res_flagged = recipient_verification_agent({"recipient_id": "scam001", "recipient_name": "Scam Ring"})
    assert res_flagged["status"] == "flagged", f"Expected flagged, got {res_flagged['status']}"
    assert res_flagged["score_contribution"] == 45

    # Invalid format
    res_invalid = recipient_verification_agent({"recipient_id": "x", "recipient_name": "Invalid"})
    assert res_invalid["status"] == "invalid_format"
    print("  ✅ Recipient Verification Agent passed!")


def test_risk_analysis_agent():
    print("🧪 Testing Risk Analysis Agent...")

    # Clean note with known recipient
    res_clean = risk_analysis_agent(
        {"amount": 100, "note": "Dinner bill split with friends", "recipient_name": "Alice Sharma"},
        recipient_status="known",
    )
    assert res_clean["urgency_score"] <= 30
    assert not res_clean["impersonation_flag"]


    # Coercive threat & urgency note
    res_threat = risk_analysis_agent({
        "amount": 15000,
        "note": "Urgent: Electricity power disconnection in 30 mins! Pay immediately to avoid legal penalty.",
        "recipient_name": "Electricity Department",
    })
    assert res_threat["urgency_score"] >= 40
    assert len(res_threat["signals"]) > 0
    print("  ✅ Risk Analysis Agent passed!")


def test_behavioral_pattern_agent():
    print("🧪 Testing Behavioral Pattern Agent...")

    # Normal spend
    res_normal = behavioral_pattern_agent({"amount": 500, "hour": 14}, user_session_history=[])
    assert not res_normal["amount_anomaly"]
    assert not res_normal["odd_hour"]
    assert not res_normal["velocity_spike"]
    assert res_normal["score"] == 0

    # Excessive amount
    res_excessive = behavioral_pattern_agent({"amount": 25000, "hour": 14}, user_baseline=3000)
    assert res_excessive["amount_anomaly"]
    assert res_excessive["score"] >= 30

    # Velocity spike
    mock_history = [
        {"recipient_id": "p1@upi", "recipient_status": "new"},
        {"recipient_id": "p2@upi", "recipient_status": "new"},
    ]
    res_velocity = behavioral_pattern_agent({"amount": 200, "hour": 14}, user_session_history=mock_history)
    assert res_velocity["velocity_spike"]
    assert res_velocity["score"] >= 30
    print("  ✅ Behavioral Pattern Agent passed!")


def test_decision_policy_agent():
    print("🧪 Testing Decision & Policy Agent...")

    # Scenario 1: Low risk
    d_low = decision_policy_agent(
        recipient_signal={"status": "known", "risk_weight": 0},
        risk_signal={"score": 10},
        behavior_signal={"score": 0},
    )
    assert d_low["category"] == "low"
    assert d_low["action"] == "auto_approve"

    # Scenario 2: Medium risk
    d_med = decision_policy_agent(
        recipient_signal={"status": "new", "risk_weight": 25},
        risk_signal={"score": 30},
        behavior_signal={"score": 20},
    )
    assert d_med["category"] == "medium"
    assert d_med["action"] == "require_confirmation"

    # Scenario 3: High risk
    d_high = decision_policy_agent(
        recipient_signal={"status": "flagged", "risk_weight": 45},
        risk_signal={"score": 40},
        behavior_signal={"score": 20},
    )
    assert d_high["category"] in ("high", "critical")

    # Scenario 4: Critical risk
    d_crit = decision_policy_agent(
        recipient_signal={"status": "flagged", "risk_weight": 45},
        risk_signal={"score": 85},
        behavior_signal={"score": 60},
    )
    assert d_crit["category"] == "critical"
    assert d_crit["action"] == "hard_block"
    print("  ✅ Decision & Policy Agent passed!")


def test_explainability_agent():
    print("🧪 Testing Explainability Agent...")

    signals = {
        "recipient": {"status": "flagged", "reason": "Known scam syndicate"},
        "risk": {"signals": ["Urgent deadline", "Electricity authority impersonation"], "urgency_score": 80},
        "behavior": {"factors": [{"detail": "Amount exceeds 5x baseline"}]},
    }
    explanation = explainability_agent(signals, final_score=92, category="Critical")
    assert isinstance(explanation, str)
    assert len(explanation) > 10
    print(f"  ✓ Sample explanation: '{explanation}'")
    print("  ✅ Explainability Agent passed!")


def test_cryptographic_audit_trail():
    print("🧪 Testing Cryptographic SHA-256 Hash-Chained Audit Trail...")

    # Create an isolated in-memory test trail
    test_storage = "test_audit_chain_temp.jsonl"
    if os.path.exists(test_storage):
        os.remove(test_storage)

    trail = AuditTrail(storage_file=test_storage)

    # Record 3 sequential entries
    e1 = trail.record(
        agent_id="recipient_agent",
        action="verify_payee",
        input_data={"payee": "alice@upi"},
        output_data={"status": "known"},
        trust_score=10,
    )
    assert e1.sequence == 0
    assert e1.previous_hash == AuditTrail.GENESIS_HASH

    e2 = trail.record(
        agent_id="risk_agent",
        action="analyze_intent",
        input_data={"note": "clean payment"},
        output_data={"urgency": 5},
        trust_score=5,
    )
    assert e2.sequence == 1
    assert e2.previous_hash == e1.entry_hash

    e3 = trail.record(
        agent_id="orchestrator_agent",
        action="complete_payment",
        input_data={"txn_id": "TXN-001"},
        output_data={"outcome": "completed"},
        trust_score=15,
    )
    assert e3.sequence == 2
    assert e3.previous_hash == e2.entry_hash

    # Verify chain integrity
    valid, err = trail.verify_chain()
    assert valid, f"Chain validation failed: {err}"
    print(f"  ✓ Intact chain verified ({len(trail.entries)} entries)")

    # Test tampering detection: alter entry 1's action in-place
    print("  🧪 Simulating malicious tampering of audit entry...")
    tampered_entries = list(trail._entries)
    tampered_entry = tampered_entries[1]
    # Recreate dataclass with modified action
    tampered_dataclass = type(tampered_entry)(
        sequence=tampered_entry.sequence,
        timestamp=tampered_entry.timestamp,
        agent_id=tampered_entry.agent_id,
        action="MALICIOUS_ALTERATION",  # Tampered field!
        input_hash=tampered_entry.input_hash,
        output_hash=tampered_entry.output_hash,
        trust_score=tampered_entry.trust_score,
        entry_hash=tampered_entry.entry_hash,
        previous_hash=tampered_entry.previous_hash,
        metadata=tampered_entry.metadata,
    )
    tampered_trail = AuditTrail(storage_file=test_storage)
    tampered_trail._entries = [tampered_entries[0], tampered_dataclass, tampered_entries[2]]

    tampered_valid, tampered_err = tampered_trail.verify_chain()
    assert not tampered_valid, "Tampered chain should NOT validate!"
    assert "tampering detected" in tampered_err or "mismatch" in tampered_err
    print(f"  ✓ Tampering detected successfully: '{tampered_err}'")

    # Clean up test file
    if os.path.exists(test_storage):
        os.remove(test_storage)

    print("  ✅ Cryptographic Audit Trail passed!")


async def test_orchestrator_pipeline():
    print("🧪 Testing Full Multi-Agent Orchestrator Pipeline...")

    req = PaymentRequest(
        sender_id="USER_TEST_001",
        recipient_name="Amazon Pay",
        recipient_id="merchant@upi",
        amount=250.0,
        note="Order #404-12345 book purchase",
    )

    result = await run_risk_pipeline(req)

    assert "recipient_result" in result
    assert "rule_result" in result
    assert "behavioral_result" in result
    assert "llm_result" in result
    assert "decision" in result
    assert "explanation" in result
    assert "audit_hash" in result

    assert result["decision"]["category"] == "low"
    assert result["decision"]["action"] == "auto_approve"
    print("  ✅ Full Multi-Agent Orchestrator Pipeline passed!")


def test_api_endpoints():
    print("🧪 Testing FastAPI Endpoints via TestClient...")
    from fastapi.testclient import TestClient
    import main

    client = TestClient(main.app)

    # 1. Health check
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    # 2. PS09 native /api/analyze - Normal payment
    normal_payload = {
        "sender_id": "USER123",
        "recipient_name": "Google Pay",
        "recipient_id": "goog",
        "amount": 100.00,
        "note": "Regular subscription payment",
    }
    resp = client.post("/api/analyze", json=normal_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] == "low"
    assert data["action"] == "auto_approve"
    print(f"  ✓ /api/analyze (Normal): Score {data['risk_score']} -> {data['category'].upper()}")

    # 3. PS09 native /api/analyze - Suspicious payment
    suspicious_payload = {
        "sender_id": "USER123",
        "recipient_name": "Unknown Person",
        "recipient_id": "UNKNOWN001",
        "amount": 5000.00,
        "note": "Urgent: refund needed immediately. Please verify your account.",
    }
    resp = client.post("/api/analyze", json=suspicious_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category"] in ("high", "medium")
    print(f"  ✓ /api/analyze (Suspicious): Score {data['risk_score']} -> {data['category'].upper()}")

    # 4. React Frontend /api/transactions/analyze
    react_payload = {
        "recipientName": "Rahul Sharma",
        "upiId": "rahul@upi",
        "amount": 500.0,
        "message": "Groceries",
    }
    resp = client.post("/api/transactions/analyze", json=react_payload)
    assert resp.status_code == 200
    r_data = resp.json()
    assert "risk_score" in r_data
    assert "breakdown" in r_data
    assert "transaction_id" in r_data
    print(f"  ✓ /api/transactions/analyze (React): Level {r_data['risk_level']}, Action {r_data['action']}")

    # 5. Scam check endpoint
    scam_payload = {"message": "Dear customer, your electricity will be disconnected tonight. Pay immediately to avoid police penalty."}
    resp = client.post("/api/security/scam-check", json=scam_payload)
    assert resp.status_code == 200
    scam_data = resp.json()
    assert scam_data["scamRiskScore"] >= 60
    assert scam_data["riskLevel"] in ("HIGH", "CRITICAL")
    print(f"  ✓ /api/security/scam-check: Score {scam_data['scamRiskScore']} -> {scam_data['riskLevel']}")

    # 6. Cryptographic chain verification endpoint
    resp = client.get("/api/audit/verify")
    assert resp.status_code == 200
    verify_data = resp.json()
    assert verify_data["valid"] is True
    assert verify_data["total_entries"] > 0
    print(f"  ✓ /api/audit/verify: Valid={verify_data['valid']}, Entries={verify_data['total_entries']}")

    print("  ✅ All FastAPI Endpoints passed!")


def main():
    print("\n" + "=" * 65)
    print("🚀 PAYSHIELD MULTI-AGENT ARCHITECTURE & AUDIT TRAIL TEST SUITE")
    print("=" * 65 + "\n")

    test_recipient_verification_agent()
    test_risk_analysis_agent()
    test_behavioral_pattern_agent()
    test_decision_policy_agent()
    test_explainability_agent()
    test_cryptographic_audit_trail()
    asyncio.run(test_orchestrator_pipeline())
    test_api_endpoints()

    print("\n" + "=" * 65)
    print("🎉 ALL MULTI-AGENT & CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY!")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()

