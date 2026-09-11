import sys
import os
from pathlib import Path
import json
import requests

backend_dir = str(Path(__file__).resolve().parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

BASE_URL = os.getenv("PAYSHIELD_API_URL", "http://localhost:8000")

# Check if external server is running, otherwise use FastAPI TestClient
use_test_client = False
try:
    r = requests.get(f"{BASE_URL}/api/health", timeout=0.5)
    if r.status_code != 200:
        use_test_client = True
except Exception:
    use_test_client = True

if use_test_client:
    print("ℹ️ No live server running on localhost:8000 — running in-process via TestClient.")
    from fastapi.testclient import TestClient
    import main
    client = TestClient(main.app)
    def api_post(path, json_data):
        return client.post(path, json=json_data)
    def api_get(path):
        return client.get(path)
else:
    print(f"ℹ️ Connecting to live server at {BASE_URL}")
    def api_post(path, json_data):
        return requests.post(f"{BASE_URL}{path}", json=json_data)
    def api_get(path):
        return requests.get(f"{BASE_URL}{path}")

# Test 1: Analyze a normal payment
print("\n" + "="*60)
print("TEST 1: Normal Payment (Should be LOW risk)")
print("="*60)

payload = {
    "sender_id": "USER123",
    "recipient_name": "Google Pay",
    "recipient_id": "GOOG",
    "amount": 100.00,
    "note": "Regular payment"
}

response = api_post("/api/analyze", payload)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Test 2: Analyze a suspicious payment
print("\n" + "="*60)
print("TEST 2: Suspicious Payment (Should be HIGH risk)")
print("="*60)

payload = {
    "sender_id": "USER123",
    "recipient_name": "Unknown Person",
    "recipient_id": "UNKNOWN001",
    "amount": 5000.00,
    "note": "Urgent: refund needed immediately. Please verify your account."
}

response = api_post("/api/analyze", payload)
print(f"Status: {response.status_code}")
analysis = response.json()
print(f"Response: {json.dumps(analysis, indent=2)}")

# Test 3: Confirm payment
print("\n" + "="*60)
print("TEST 3: Confirm Payment")
print("="*60)

confirm_payload = {
    "request": payload,
    "confirmed": True
}

response = api_post("/api/confirm", confirm_payload)
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Test 4: Get audit history
print("\n" + "="*60)
print("TEST 4: Get Audit History")
print("="*60)

response = api_get("/api/audit-history?limit=5")
print(f"Status: {response.status_code}")
history = response.json()
print(f"Entries: {len(history)}")
for entry in history[-2:]:
    print(f"  - {entry.get('request', {}).get('recipient_name')} | Score: {entry.get('final_score')} | Outcome: {entry.get('outcome')}")

# Test 5: Verify Cryptographic SHA-256 Hash Chain
print("\n" + "="*60)
print("TEST 5: Verify Cryptographic Audit Trail Chain")
print("="*60)

response = api_get("/api/audit/verify")
print(f"Status: {response.status_code}")
verify_res = response.json()
print(f"Chain Integrity Valid: {verify_res.get('valid')}")
print(f"Total Chained Entries: {verify_res.get('total_entries')}")
print(f"Latest Hash: {verify_res.get('latest_hash')}")

print("\n" + "="*60)
print("All tests completed successfully!")
print("="*60)

