"""
Behavioral Pattern Agent (Rule-based / Lightweight ML)

Analyzes behavioral dimensions against normal user patterns:
1. Amount deviation vs. historical spending baseline
2. Time-of-day execution anomalies (e.g., late night / odd hours)
3. Frequency / velocity spikes (multiple new-recipient transactions in quick succession)
"""

import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from ml_inference import predict_fraud


def behavioral_pattern_agent(
    txn: Dict[str, Any],
    user_session_history: Optional[List[Dict[str, Any]]] = None,
    user_baseline: float = 3000.0,
) -> Dict[str, Any]:
    """
    Evaluates behavioral expenditure indicators using both deterministic rules
    and the trained Machine Learning fraud detection model.
    Returns anomaly flags, factor list, ML probability, and behavioral risk score (0-100).
    """
    amount = float(txn.get("amount") or 0.0)
    now = datetime.now()
    current_hour = txn.get("hour", now.hour)

    factors = []
    points = 0

    # 1. Amount Anomaly Check (> 3x historical average / baseline)
    is_amount_anomaly = amount > (user_baseline * 3.0)
    if is_amount_anomaly:
        points += 30
        factors.append({
            "type": "amount_deviation",
            "amount": amount,
            "baseline": user_baseline,
            "weight": 30,
            "detail": f"Amount ₹{amount:,.2f} is significantly higher than historical baseline of ₹{user_baseline:,.2f}",
        })

    # 2. Time-of-day Anomaly (Late night: 11 PM to 6 AM)
    is_odd_hour = (current_hour < 6 or current_hour >= 23)
    if is_odd_hour:
        points += 20
        factors.append({
            "type": "odd_hour_transaction",
            "hour": current_hour,
            "weight": 20,
            "detail": f"Transaction initiated at unusual hour ({current_hour:02d}:00)",
        })

    # 3. Velocity / Frequency Spike Check
    velocity_count = 0
    if user_session_history:
        for attempt in user_session_history:
            status = attempt.get("recipient_status") or attempt.get("status")
            if status in ("new", "flagged", "invalid_format"):
                velocity_count += 1

    is_velocity_spike = (velocity_count >= 2)
    if is_velocity_spike:
        points += 30
        factors.append({
            "type": "high_velocity",
            "new_recipients_in_session": velocity_count,
            "weight": 30,
            "detail": f"Rapid velocity: {velocity_count} new-recipient attempts detected in current session",
        })

    # 4. Machine Learning Model Inference (Trained on Kaggle Dataset)
    ml_result = predict_fraud({
        "amount": amount,
        "hour": current_hour,
        "account_balance": txn.get("account_balance", user_baseline * 3.0),
        "customer_age": txn.get("customer_age", 35.0),
        "anomaly_score": txn.get("anomaly_score", 0.0),
        "category": txn.get("category", "Online"),
    })

    if ml_result.get("model_loaded"):
        if ml_result.get("is_flagged_by_ml"):
            points += 35
            factors.append({
                "type": "ml_model_fraud_flag",
                "fraud_probability": ml_result["fraud_probability"],
                "weight": 35,
                "detail": f"Kaggle-trained ML model detected high fraud correlation ({ml_result['fraud_probability']:.1%})",
            })

    final_score = min(100, points)


    return {
        "agent_id": "behavioral_pattern_agent",
        "score": final_score,
        "raw_score": points,
        "ml_score": ml_result.get("ml_risk_score", 0),
        "ml_probability": ml_result.get("fraud_probability", 0.0),
        "model_loaded": ml_result.get("model_loaded", False),
        "amount_anomaly": is_amount_anomaly,
        "odd_hour": is_odd_hour,
        "velocity_spike": is_velocity_spike,
        "velocity_count": velocity_count,
        "factors": factors,
    }

