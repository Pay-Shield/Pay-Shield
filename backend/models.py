from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class RiskCategory(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionType(str, Enum):
    AUTO_APPROVE = "auto_approve"
    REQUIRE_CONFIRMATION = "require_confirmation"
    REQUIRE_VERIFICATION = "require_verification"
    HARD_BLOCK = "hard_block"


class PaymentRequest(BaseModel):
    sender_id: str
    recipient_name: str
    recipient_id: str
    amount: float
    note: str


class ModuleOutput(BaseModel):
    module_name: str
    score_contribution: float
    explanation: dict


class RiskAnalysisResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    risk_score: float
    category: str  # Will be a string from enum
    action: str    # Will be a string from enum
    factors: list[dict]
    llm_reasoning: str
    confidence: float


class AuditLogEntry(BaseModel):
    timestamp: datetime
    request: PaymentRequest
    recipient_verification: dict
    risk_factors: list[dict]
    llm_reasoning: str
    final_score: float
    category: RiskCategory
    action: ActionType
    outcome: str  # "completed", "halted", "cancelled"


class UserConfirmation(BaseModel):
    confirmed: bool
    verification_passed: Optional[bool] = None


# --- Frontend (React) contract models — src/types.ts ---------------------

class AnalyzePaymentPayload(BaseModel):
    """Matches AnalyzePaymentPayload in frontend/src/types.ts"""
    recipientName: str
    upiId: str
    amount: float
    message: Optional[str] = ""


class ScamCheckPayload(BaseModel):
    message: str


def payment_payload_to_request(payload: AnalyzePaymentPayload, sender_id: str = "frontend_user") -> PaymentRequest:
    return PaymentRequest(
        sender_id=sender_id,
        recipient_name=payload.recipientName,
        recipient_id=payload.upiId,
        amount=payload.amount,
        note=payload.message or "",
    )
