"""
Train Machine Learning Models on Financial Fraud Dataset.

Loads the multi-table dataset from data/archive/Data, engineers features,
evaluates baseline and ensemble classifiers with rigorous stratification,
and exports the trained model bundle to backend/models/fraud_model.joblib.

Adheres strictly to ml-best-practices:
- Strict Featurization Ordering (split before fitting)
- Imbalance-aware training (balanced class weights)
- Comprehensive metric reporting (Precision, Recall, F1, ROC-AUC, Confusion Matrix)
"""

import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    average_precision_score,
)

DATA_DIR = Path("data/archive/Data")
OUTPUT_MODEL_DIR = Path("backend/models")
OUTPUT_MODEL_PATH = OUTPUT_MODEL_DIR / "fraud_model.joblib"


def load_and_merge_data(data_dir: Path) -> pd.DataFrame:
    """Load all 10 CSV tables and merge on transaction and entity keys."""
    print("📁 Loading CSV tables...")

    # Transaction-level data
    df_records = pd.read_csv(data_dir / "Transaction Data" / "transaction_records.csv")
    df_metadata = pd.read_csv(data_dir / "Transaction Data" / "transaction_metadata.csv")
    df_amounts = pd.read_csv(data_dir / "Transaction Amounts" / "amount_data.csv")
    df_anomalies = pd.read_csv(data_dir / "Transaction Amounts" / "anomaly_scores.csv")
    df_categories = pd.read_csv(data_dir / "Merchant Information" / "transaction_category_labels.csv")
    df_fraud = pd.read_csv(data_dir / "Fraudulent Patterns" / "fraud_indicators.csv")

    # Customer-level data
    df_customers = pd.read_csv(data_dir / "Customer Profiles" / "customer_data.csv")
    df_accounts = pd.read_csv(data_dir / "Customer Profiles" / "account_activity.csv")
    df_suspicious = pd.read_csv(data_dir / "Fraudulent Patterns" / "suspicious_activity.csv")

    # Merchant-level data
    df_merchants = pd.read_csv(data_dir / "Merchant Information" / "merchant_data.csv")

    print(f"  ✓ Transaction records: {len(df_records)} rows")
    print(f"  ✓ Customer profiles:   {len(df_customers)} rows")

    # 1. Merge transactions
    txns = df_records.merge(df_metadata, on="TransactionID", how="left")
    txns = txns.merge(df_amounts, on="TransactionID", how="left")
    txns = txns.merge(df_anomalies, on="TransactionID", how="left")
    txns = txns.merge(df_categories, on="TransactionID", how="left")
    txns = txns.merge(df_fraud, on="TransactionID", how="left")

    # 2. Merge customer info
    cust = df_customers.merge(df_accounts, on="CustomerID", how="left")
    cust = cust.merge(df_suspicious, on="CustomerID", how="left")

    # 3. Combine everything
    full_df = txns.merge(cust, on="CustomerID", how="left")
    full_df = full_df.merge(df_merchants, on="MerchantID", how="left")

    print(f"  ✓ Combined dataset shape: {full_df.shape}")
    return full_df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract temporal, financial ratios, and behavioral indicators."""
    print("⚙️ Engineering features...")
    data = df.copy()

    # Timestamps
    data["Timestamp"] = pd.to_datetime(data["Timestamp"])
    data["LastLogin"] = pd.to_datetime(data["LastLogin"])

    # Temporal features
    data["hour"] = data["Timestamp"].dt.hour
    data["dayofweek"] = data["Timestamp"].dt.dayofweek
    data["is_night"] = ((data["hour"] < 6) | (data["hour"] >= 23)).astype(int)

    # Days since customer last logged in
    login_diff = (data["Timestamp"] - data["LastLogin"]).dt.total_seconds() / 86400.0
    data["days_since_last_login"] = login_diff.clip(lower=0.0)

    # Financial ratios
    amount = data["TransactionAmount"].fillna(data["Amount"])
    data["amount"] = amount
    balance = data["AccountBalance"].clip(lower=10.0)
    data["amount_to_balance_ratio"] = (amount / balance).clip(upper=10.0)

    # Fill missing indicators
    data["anomaly_score"] = data["AnomalyScore"].fillna(0.0)
    data["customer_age"] = data["Age"].fillna(35.0)
    data["customer_suspicious_flag"] = data["SuspiciousFlag"].fillna(0).astype(int)
    data["Category"] = data["Category"].fillna("Other")

    print("  ✓ Feature engineering complete.")
    return data


def train_models():
    print("\n" + "=" * 65)
    print("🚀 TRAINING FRAUD DETECTION MODELS ON KAGGLE DATASET")
    print("=" * 65 + "\n")

    raw_df = load_and_merge_data(DATA_DIR)
    processed_df = engineer_features(raw_df)

    # Numerical and Categorical feature definitions
    num_features = [
        "amount",
        "amount_to_balance_ratio",
        "anomaly_score",
        "customer_age",
        "hour",
        "is_night",
        "days_since_last_login",
        "customer_suspicious_flag",
    ]
    cat_features = ["Category"]

    X = processed_df[num_features + cat_features]
    y = processed_df["FraudIndicator"].astype(int)

    class_counts = y.value_counts().to_dict()
    print(f"📊 Class Distribution: Non-Fraud (0)={class_counts.get(0, 0)}, Fraud (1)={class_counts.get(1, 0)} ({class_counts.get(1, 0) / len(y):.2%})")

    # 1. Stratified Train-Test Split (ml-best-practices: strict ordering)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"  ✓ Train size: {len(X_train)}, Test size: {len(X_test)}")

    # 2. Fit preprocessors ON TRAINING SET ONLY
    scaler = StandardScaler()
    X_train_num = scaler.fit_transform(X_train[num_features])
    X_test_num = scaler.transform(X_test[num_features])

    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    X_train_cat = encoder.fit_transform(X_train[cat_features])
    X_test_cat = encoder.transform(X_test[cat_features])

    cat_names = [f"cat_{c}" for c in encoder.get_feature_names_out(cat_features)]
    feature_names = num_features + list(cat_names)

    X_train_full = np.hstack([X_train_num, X_train_cat])
    X_test_full = np.hstack([X_test_num, X_test_cat])

    # 3. Model 1: Baseline Logistic Regression
    print("\n📈 [Model 1] Training Baseline Logistic Regression (Balanced)...")
    lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    lr.fit(X_train_full, y_train)
    lr_preds = lr.predict(X_test_full)
    lr_probs = lr.predict_proba(X_test_full)[:, 1]
    lr_auc = roc_auc_score(y_test, lr_probs)
    print(f"  ✓ Baseline Logistic Regression ROC-AUC: {lr_auc:.4f}")

    # 4. Model 2: Tuned Random Forest Classifier (Primary)
    print("\n🌲 [Model 2] Training Random Forest Classifier (Balanced)...")
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=6,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
    )
    rf.fit(X_train_full, y_train)

    rf_preds = rf.predict(X_test_full)
    rf_probs = rf.predict_proba(X_test_full)[:, 1]

    rf_auc = roc_auc_score(y_test, rf_probs)
    rf_pr_auc = average_precision_score(y_test, rf_probs)
    rf_prec = precision_score(y_test, rf_preds, zero_division=0)
    rf_rec = recall_score(y_test, rf_preds, zero_division=0)
    rf_f1 = f1_score(y_test, rf_preds, zero_division=0)

    print("\n" + "-" * 50)
    print("🏆 RANDOM FOREST EVALUATION METRICS ON HELD-OUT TEST SET:")
    print("-" * 50)
    print(f"  • ROC-AUC Score:         {rf_auc:.4f}")
    print(f"  • PR-AUC (Avg Precision): {rf_pr_auc:.4f}")
    print(f"  • Precision:             {rf_prec:.4f}")
    print(f"  • Recall:                {rf_rec:.4f}")
    print(f"  • F1-Score:              {rf_f1:.4f}")
    print("\n📋 Confusion Matrix:")
    cm = confusion_matrix(y_test, rf_preds)
    print(f"  [TN={cm[0,0]:3d}  FP={cm[0,1]:3d}]")
    print(f"  [FN={cm[1,0]:3d}  TP={cm[1,1]:3d}]")

    print("\n📋 Detailed Classification Report:")
    print(classification_report(y_test, rf_preds, target_names=["Legitimate", "Fraud"]))

    # Feature importances
    importances = dict(zip(feature_names, rf.feature_importances_))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print("🔍 Top Predictive Features:")
    for feat, imp in sorted_imp[:6]:
        print(f"  - {feat:30s}: {imp:.4f}")

    # 5. Export Model Bundle
    OUTPUT_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": rf,
        "scaler": scaler,
        "encoder": encoder,
        "num_features": num_features,
        "cat_features": cat_features,
        "feature_names": feature_names,
        "feature_importances": importances,
        "metrics": {
            "roc_auc": float(rf_auc),
            "pr_auc": float(rf_pr_auc),
            "f1_score": float(rf_f1),
            "precision": float(rf_prec),
            "recall": float(rf_rec),
        },
    }

    joblib.dump(bundle, OUTPUT_MODEL_PATH)
    print(f"\n💾 Model successfully exported to: {OUTPUT_MODEL_PATH} ({os.path.getsize(OUTPUT_MODEL_PATH) / 1024:.1f} KB)")
    print("\n" + "=" * 65)
    print("🎉 MODEL TRAINING COMPLETE!")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    train_models()
