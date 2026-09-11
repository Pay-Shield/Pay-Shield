"""
Machine Learning Inference Engine for PayShield.

Loads the trained Random Forest fraud detection model from backend/models/fraud_model.joblib
and executes real-time inference on transaction features.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "models" / "fraud_model.joblib"

_cached_bundle: Optional[Dict[str, Any]] = None


def get_model_bundle() -> Optional[Dict[str, Any]]:
    """Load and cache the trained fraud model bundle."""
    global _cached_bundle
    if _cached_bundle is not None:
        return _cached_bundle

    if not MODEL_PATH.exists():
        return None

    try:
        import joblib
        _cached_bundle = joblib.load(MODEL_PATH)
        return _cached_bundle
    except Exception as e:
        print(f"⚠️ Error loading ML model from {MODEL_PATH}: {e}")
        return None


def is_ml_model_available() -> bool:
    """Check if the trained model artifact exists and is loadable."""
    return get_model_bundle() is not None


def predict_fraud(txn_features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute real-time ML fraud classification on transaction features.

    Returns:
    - fraud_probability: float (0.0 to 1.0)
    - ml_risk_score: int (0 to 100)
    - is_flagged_by_ml: bool (probability >= 0.50)
    - model_loaded: bool
    """
    bundle = get_model_bundle()
    if bundle is None:
        return {
            "model_loaded": False,
            "fraud_probability": 0.0,
            "ml_risk_score": 0,
            "is_flagged_by_ml": False,
            "reason": "Model bundle not loaded",
        }

    try:
        import pandas as pd

        model = bundle["model"]
        scaler = bundle["scaler"]
        encoder = bundle["encoder"]
        num_features = bundle["num_features"]
        cat_features = bundle["cat_features"]

        amount = float(txn_features.get("amount", 50.0))
        balance = float(txn_features.get("account_balance", 5000.0))
        ratio = amount / max(10.0, balance)

        hour = int(txn_features.get("hour", 14))
        is_night = 1 if (hour < 6 or hour >= 23) else 0

        # Construct single-row DataFrame
        row_dict = {
            "amount": [amount],
            "amount_to_balance_ratio": [min(10.0, ratio)],
            "anomaly_score": [float(txn_features.get("anomaly_score", 0.0))],
            "customer_age": [float(txn_features.get("customer_age", 35.0))],
            "hour": [hour],
            "is_night": [is_night],
            "days_since_last_login": [float(txn_features.get("days_since_last_login", 1.0))],
            "customer_suspicious_flag": [int(txn_features.get("customer_suspicious_flag", 0))],
            "Category": [str(txn_features.get("category", "Online"))],
        }
        df_row = pd.DataFrame(row_dict)

        # Scale numerical and encode categorical
        X_num = scaler.transform(df_row[num_features])
        X_cat = encoder.transform(df_row[cat_features])
        X_full = np.hstack([X_num, X_cat])

        # Inference
        probs = model.predict_proba(X_full)[0]
        fraud_prob = float(probs[1])
        ml_score = int(round(fraud_prob * 100))

        return {
            "model_loaded": True,
            "fraud_probability": round(fraud_prob, 4),
            "ml_risk_score": ml_score,
            "is_flagged_by_ml": (fraud_prob >= 0.50),
            "anomaly_metric": round(float(txn_features.get("anomaly_score", 0.0)), 3),
        }
    except Exception as e:
        print(f"⚠️ Error during ML inference: {e}")
        return {
            "model_loaded": False,
            "fraud_probability": 0.0,
            "ml_risk_score": 0,
            "is_flagged_by_ml": False,
            "error": str(e),
        }
