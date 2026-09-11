import sys
import time
from pathlib import Path

# Windows consoles / redirected output can default to a non-UTF-8 codepage
# (cp1252), which crashes on the emoji used in this project's log lines.
# Force UTF-8 so logging never takes the request down with it.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from models import (
    PaymentRequest,
    RiskAnalysisResult,
    AnalyzePaymentPayload,
    ScamCheckPayload,
    payment_payload_to_request,
)
from pipeline import run_risk_pipeline
from agents.risk_analysis import risk_analysis_agent
from frontend_adapter import map_to_analyze_response, check_scam_message
from audit_log import log_transaction, get_audit_history, verify_audit_chain, get_crypto_audit_history
from pending_store import store_pending, pop_pending


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    async def root():
        return FileResponse(FRONTEND_DIST / "index.html")


# ============================================================================
# Frontend contract endpoints — consumed by frontend/src/services/api.ts
# ============================================================================

@app.post("/api/transactions/analyze")
async def analyze_transaction(payload: AnalyzePaymentPayload):
    """
    Contract expected by the React frontend (AnalyzePaymentPayload ->
    AnalyzePaymentResponse in frontend/src/types.ts). Runs the same five-module
    pipeline as /api/analyze, then translates category/action vocabulary and
    persists the attempt to the audit log.
    """
    start = time.monotonic()
    request = payment_payload_to_request(payload)

    try:
        pipeline_result = await run_risk_pipeline(request)
    except Exception as e:
        print(f"❌ Error in analyze_transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

    elapsed = time.monotonic() - start
    response = map_to_analyze_response(pipeline_result, elapsed)

    decision = pipeline_result["decision"]
    outcome = {
        "SAFE": "completed",
        "VERIFY": "pending_confirmation",
        "PAUSED": "pending_verification",
        "BLOCKED": "blocked",
    }.get(response["action"], "pending_confirmation")

    # Always log the analysis attempt itself, regardless of what happens next.
    log_transaction(
        request=request,
        recipient_verification=pipeline_result["recipient_result"],
        risk_factors=pipeline_result["all_factors"],
        llm_reasoning=pipeline_result["explanation"],
        final_score=decision["final_score"],
        category=decision["category"],
        action=decision["action"],
        outcome=outcome,
    )

    # Human-in-the-loop checkpoint (guardian-architecture.md §4 step 4):
    # SAFE is the only action allowed to complete without an explicit user
    # decision. VERIFY/PAUSED/BLOCKED are held here until the frontend calls
    # /api/transactions/confirm — BLOCKED is stored too so confirm can still
    # explain "no override available" rather than a bare 404.
    if response["action"] != "SAFE":
        store_pending(response["transaction_id"], {
            "request": request.model_dump(),
            "decision": decision,
            "all_factors": pipeline_result["all_factors"],
            "explanation": pipeline_result["explanation"],
        })

    return response


@app.post("/api/transactions/confirm")
async def confirm_transaction(body: dict = Body(...)):
    """
    Resolve a pending VERIFY/PAUSED decision from /api/transactions/analyze.
    Expects: {"transaction_id": str, "confirmed": bool}

    This is the human-in-the-loop checkpoint the React Payment Simulator was
    previously missing — Medium/High risk payments are not considered
    "completed" until the user explicitly confirms here. Critical/BLOCKED
    payments always reject: no override path exists, by design.
    """
    transaction_id = body.get("transaction_id")
    confirmed = body.get("confirmed", False)

    if not transaction_id:
        raise HTTPException(status_code=400, detail="Missing transaction_id")

    pending = pop_pending(transaction_id)
    if pending is None:
        raise HTTPException(
            status_code=404,
            detail="No pending decision found for this transaction (already resolved, expired, or was auto-approved).",
        )

    request = PaymentRequest(**pending["request"])
    decision = pending["decision"]

    if decision["action"] == "hard_block":
        log_transaction(
            request=request,
            recipient_verification={},
            risk_factors=pending["all_factors"],
            llm_reasoning=pending["explanation"],
            final_score=decision["final_score"],
            category=decision["category"],
            action=decision["action"],
            outcome="blocked",
        )
        raise HTTPException(
            status_code=403,
            detail="This payment is blocked due to Critical fraud risk. No override is available.",
        )

    outcome = "completed" if confirmed else "cancelled"

    log_transaction(
        request=request,
        recipient_verification={},
        risk_factors=pending["all_factors"],
        llm_reasoning=pending["explanation"],
        final_score=decision["final_score"],
        category=decision["category"],
        action=decision["action"],
        outcome=outcome,
    )

    if confirmed:
        return {"status": "completed", "message": "Payment confirmed and processed successfully.", "transaction_id": transaction_id}
    else:
        return {"status": "cancelled", "message": "Payment cancelled by user.", "transaction_id": transaction_id}


@app.post("/api/security/scam-check")
async def scam_check(payload: ScamCheckPayload):
    """
    Contract expected by the React frontend (message -> ScamCheckResult in
    frontend/src/types.ts). Standalone text analysis, no payment involved.
    Powered by Risk Analysis Agent (Gemini + heuristics).
    """
    fake_txn = {
        "sender_id": "scam_check",
        "recipient_name": "",
        "recipient_id": "",
        "amount": 0,
        "note": payload.message,
    }
    fraud_result = risk_analysis_agent(fake_txn, recipient_status="unknown")
    flags = fraud_result.get("signals", [])
    if fraud_result.get("impersonation_flag"):
        flags.append("impersonation_attempt")
    return check_scam_message(payload.message, flags)



# ============================================================================
# PS09 native endpoints — internal vocabulary (low/medium/high/critical,
# auto_approve/require_confirmation/require_verification/hard_block)
# ============================================================================

@app.post("/api/analyze")
async def analyze_payment(request: PaymentRequest) -> RiskAnalysisResult:
    """
    Analyze payment through all modules. Returns risk score, category,
    action, and explanation in PayShield's native vocabulary.
    """
    try:
        pipeline_result = await run_risk_pipeline(request)
    except Exception as e:
        print(f"❌ Error in analyze_payment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

    decision = pipeline_result["decision"]
    return RiskAnalysisResult(
        risk_score=decision["final_score"],
        category=decision["category"],
        action=decision["action"],
        factors=pipeline_result["all_factors"],
        llm_reasoning=pipeline_result["explanation"],
        confidence=0.85,
    )


@app.post("/api/confirm")
async def confirm_payment(body: dict = Body(...)):
    """
    Handle user confirmation/cancellation for the PS09 native flow.
    Expects: {"request": PaymentRequest, "confirmed": bool}
    """
    try:
        request_data = body.get("request")
        confirmed = body.get("confirmed", False)

        if not request_data:
            raise HTTPException(status_code=400, detail="Missing payment request data")

        request = PaymentRequest(**request_data)

        if confirmed:
            analysis = await analyze_payment(request)

            if analysis.category.lower() in ["low", "medium", "high"]:
                outcome = "completed"
            else:
                outcome = "blocked"
                log_transaction(
                    request=request,
                    recipient_verification={},
                    risk_factors=analysis.factors,
                    llm_reasoning=analysis.llm_reasoning,
                    final_score=analysis.risk_score,
                    category=analysis.category,
                    action=analysis.action,
                    outcome=outcome,
                )
                raise HTTPException(status_code=403, detail="Payment blocked: too high risk.")

            log_transaction(
                request=request,
                recipient_verification={},
                risk_factors=analysis.factors,
                llm_reasoning=analysis.llm_reasoning,
                final_score=analysis.risk_score,
                category=analysis.category,
                action=analysis.action,
                outcome=outcome,
            )

            return {"status": "completed", "message": "Payment processed successfully."}
        else:
            log_transaction(
                request=request,
                recipient_verification={},
                risk_factors=[],
                llm_reasoning="",
                final_score=0,
                category="cancelled",
                action="user_cancelled",
                outcome="cancelled",
            )
            return {"status": "cancelled", "message": "Payment cancelled by user."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in confirm_payment: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing confirmation: {str(e)}")


@app.get("/api/audit-history")
async def get_history(limit: int = 50):
    return get_audit_history(limit)


@app.get("/api/audit/verify")
async def verify_chain():
    """
    Verify the cryptographic SHA-256 hash-chain integrity of all agent actions.
    Returns whether the chain is intact, entry count, and any tampering detection details.
    """
    return verify_audit_chain()


@app.get("/api/audit/chain")
async def get_chain(limit: int = 50):
    """
    Retrieve cryptographically verified audit chain entries.
    """
    return get_crypto_audit_history(limit)



@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
