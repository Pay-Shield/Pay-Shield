# PayShield Guardian - Agentic Payment Security

Intelligent payment security assistant that analyzes payment requests through multiple specialist modules, produces risk scores, and makes secure decisions with human-in-the-loop oversight.

**Stack:** Python/FastAPI backend + React/TypeScript/Vite frontend.

## Architecture

**Five Internal Modules (not multi-agent):**
1. **Recipient Verification** — Is the payee known, new, or flagged?
2. **Risk Analysis (Rules)** — Amount, keywords, urgency/impersonation language
3. **Behavioral Pattern** — Velocity checks and user baseline deviation
4. **LLM Reasoning (Hybrid)** — Nemotron for fast fraud classification; Claude for user-facing explanations (Medium/High risk only)
5. **Decision & Policy** — Aggregates all signals → score → category → action

**Key Principle:** Rules + LLM support the decision; deterministic rules engine is the final authority. No LLM-only decisions.

**Model Stack:**
- **Fraud Classification:** Nemotron 3.5 Lightning (fast, lightweight) — falls back to keyword heuristics if no API key
- **Explanations:** Claude Sonnet 5 (high-quality, reserved for Medium/High risk) — falls back to templated text if no API key
- **Rules engine:** always runs, always the final authority

**Categories (internal vocabulary):**
- **Low (<30)** → Auto-approve
- **Medium (30–59)** → Require confirmation
- **High (60–84)** → Require verification + confirmation
- **Critical (85+)** → Hard block, no override

See `guardian-architecture.md` for the complete original spec.

## Project Structure

```
payshield/
├── backend/
│   ├── main.py               # FastAPI app — all HTTP endpoints
│   ├── pipeline.py           # Shared 5-module risk pipeline (parallel fan-out + aggregate)
│   ├── models.py             # Pydantic models (internal PS09 shape + frontend contract shape)
│   ├── modules.py            # Recipient Verification, Risk Rules, Behavioral Pattern
│   ├── llm_reasoning.py      # Nemotron fraud classification + Claude explanations
│   ├── aggregator.py         # Score aggregation, category/action mapping, explanation text
│   ├── frontend_adapter.py   # Translates internal pipeline output -> React frontend's JSON contract
│   └── audit_log.py          # Persistent JSONL transaction log
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind UI
│   ├── src/
│   │   ├── App.tsx            # Route shell: landing -> auth -> dashboard app
│   │   ├── services/api.ts    # Calls /api/transactions/analyze & /api/security/scam-check
│   │   ├── types.ts           # Frontend-side contract types
│   │   ├── data/mockData.ts   # Seed data for dashboard/transactions/alerts
│   │   ├── components/        # dashboard, transactions, fraud, security, simulator, landing, auth...
│   │   └── pages/LandingPage.tsx
│   ├── package.json
│   └── vite.config.ts         # Dev proxy: /api -> http://localhost:8000
├── archived/
│   ├── static/                # Superseded plain HTML/JS/CSS frontend (kept for reference)
│   └── payshield.zip          # Original source archive the React frontend was extracted from
├── requirements.txt            # Python dependencies
├── .env.example                 # Environment template (Anthropic + Nemotron keys)
├── test_api.py                   # Backend smoke test (PS09 native endpoints)
└── guardian-architecture.md       # Full architecture spec
```

## Two API contracts, one pipeline

Both call the exact same five-module `pipeline.run_risk_pipeline()` — only the request/response shape and vocabulary differ.

| | PS09 native (`/api/analyze`) | Frontend contract (`/api/transactions/analyze`) |
|---|---|---|
| Payload | `{sender_id, recipient_name, recipient_id, amount, note}` | `{recipientName, upiId, amount, message}` |
| Risk category | `low / medium / high / critical` | `SAFE / WARNING / HIGH / CRITICAL` |
| Action | `auto_approve / require_confirmation / require_verification / hard_block` | `SAFE / VERIFY / PAUSED / BLOCKED` |
| Score detail | `factors: [...]` list | `breakdown: {transactionRisk, recipientRisk, behaviorRisk, socialEngineeringRisk, networkRisk}` (all 0-100) |
| Used by | `test_api.py`, `archived/static/` | `frontend/` (Payment Simulator modal) |

`frontend_adapter.py` owns this translation. There's also `POST /api/security/scam-check` (frontend-only — analyzes a raw SMS/WhatsApp-style message for scam signals, independent of any payment).

Every call to `/api/transactions/analyze` is written to the audit log immediately (the React frontend has no separate "confirm" round-trip — the simulator shows the result and records the transaction client-side in the same step). The PS09-native flow still has an explicit `/api/confirm` step for Medium/High risk.

## Setup

### 1. Backend

```bash
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-...          # Claude (explanations) — optional, falls back to templates
NEMOTRON_API_KEY=...              # Nemotron (fraud classification) — optional, falls back to heuristics
NEMOTRON_API_ENDPOINT=...         # Optional, defaults to NVIDIA API Catalog endpoint
```

Run it:
```bash
python backend/main.py
```
Backend serves on `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend dev server runs on `http://localhost:3000` and proxies all `/api/*` calls to the backend on port 8000 (see `frontend/vite.config.ts`). **Both must be running** for real analysis — otherwise the frontend silently falls back to its own client-side heuristic simulator (`frontend/src/services/api.ts`), which is a decent demo fallback but doesn't touch the Python pipeline, Nemotron, or Claude at all.

### 3. Production-style single-origin run (optional)

```bash
cd frontend && npm run build   # outputs frontend/dist
cd .. && python backend/main.py
```
When `frontend/dist/` exists, FastAPI serves the built app directly at `http://localhost:8000/` (no separate frontend server, no proxy needed).

## API Endpoints

### `POST /api/transactions/analyze` (frontend contract)
```json
// Request
{ "recipientName": "Unknown Recipient", "upiId": "urgent.support@upi", "amount": 25000, "message": "Urgent payment release now or account will be disconnected" }

// Response
{
  "risk_score": 82,
  "risk_level": "HIGH",
  "action": "PAUSED",
  "reasons": ["High-urgency language detected...", "..."],
  "breakdown": { "transactionRisk": 50, "recipientRisk": 45, "behaviorRisk": 9, "socialEngineeringRisk": 68, "networkRisk": 28 },
  "analysis_duration": 0.83,
  "transaction_id": "TXN-48213-IN"
}
```

### `POST /api/security/scam-check` (frontend contract)
```json
// Request
{ "message": "Your electricity will be disconnected tonight, pay immediately via this link" }

// Response
{ "message": "...", "scamRiskScore": 94, "riskLevel": "CRITICAL", "signalsDetected": {...}, "highlightedKeywords": [...], "explanation": "...", "recommendation": "..." }
```

### `POST /api/analyze` (PS09 native)
```json
// Request
{ "sender_id": "USER123", "recipient_name": "John Doe", "recipient_id": "JOHN001", "amount": 500.00, "note": "Payment for services" }

// Response
{ "risk_score": 35, "category": "medium", "action": "require_confirmation", "factors": [...], "llm_reasoning": "...", "confidence": 0.85 }
```

### `POST /api/confirm` (PS09 native)
```json
// Request
{ "request": {...}, "confirmed": true }
// Response
{ "status": "completed", "message": "Payment processed successfully." }
```

### `GET /api/audit-history?limit=50`
Returns the persisted transaction log (both contracts write to the same `audit_log.jsonl`).

## Demo Scenarios

The React Payment Simulator ships with these presets (Quick Scenario Presets in the modal):

1. **Trusted Friend** — known-style recipient, ₹1,200, "Lunch contribution" → expect **SAFE**
2. **New Freelancer** — new recipient, ₹8,500, plain note → expect **VERIFY**
3. **Utility Threat Scam** — urgency + impersonation language, ₹25,000 → expect **PAUSED**
4. **Crypto Syndicate Scam** — gift-card/crypto + guaranteed-return language, ₹50,000 → expect **BLOCKED**

These map onto the four brief-required cases from `guardian-architecture.md` §8 (Low/Medium/High/Critical).

## Testing

### Backend only
```bash
pip install requests
python test_api.py
```
Exercises `/api/analyze`, `/api/confirm`, `/api/audit-history` directly and prints results.

### Full stack
1. Terminal 1: `python backend/main.py`
2. Terminal 2: `cd frontend && npm run dev`
3. Open `http://localhost:3000`
4. Click **Launch App** (or sign up) → open the **Payment Simulator** from the sidebar
5. Try each preset, or enter a custom recipient/amount/message, and click **Analyze Payment**
6. Watch the backend terminal — it logs each module's contribution live:
   ```
   📊 Analyzing payment: Electricity Billing Cell for $25000
     ✓ Recipient: new
     ✓ Rules: 15
     ✓ Behavioral: 0
     🤖 Calling LLM for fraud classification...
       🔍 Attempting Nemotron API call...
       ⚠ Nemotron unavailable, falling back to heuristics
       ✓ Using heuristics: ['urgency_pressure', 'impersonation_attempt']
     ✓ LLM Model: heuristic_fallback
     ✓ LLM Adjustment: 15
     📈 Final Score: 55
     🎯 Category: medium
     ⚡ Action: require_confirmation
   ```
7. Check **Transactions** and **Fraud & Alerts** tabs to see the result recorded
8. Confirm persistence: `GET http://localhost:8000/api/audit-history` should show the entry

**Note:** if you see the browser network tab requesting `/api/transactions/analyze` and getting nothing back (or a connection-refused in the console), the backend isn't running — the UI will look identical because of the client-side fallback simulator, but you're not exercising the real pipeline. Always check the backend terminal logs to confirm real analysis ran.

## Architecture Philosophy

- **Single agent, modular internals** — avoids orchestration overhead
- **Deterministic rules + LLM support** — Rules are the final authority. LLM provides fraud classification (fast) + explanations (high-quality)
- **Intelligent LLM usage** — Nemotron (lightweight) for routine fraud detection; Claude (expensive) reserved for user-facing explanations and edge cases
- **Parallel execution** — independent modules run concurrently
- **Human-in-the-loop by design** — medium/high risk require explicit user confirmation
- **Simulated payments** — no real gateway integration
- **Persistent audit log** — JSONL format for transparency
- **One pipeline, two contracts** — the frontend's polished UI and the PS09 spec's native vocabulary both run through the identical risk engine; only the translation layer (`frontend_adapter.py`) differs

```
Payment Request
      ↓
Rule Engine (deterministic)
      ↓
Nemotron (fast fraud classification)
      ↓
Risk Score (rule-based with LLM input)
  ┌───┼────┐
 LOW MEDIUM HIGH/CRITICAL
 ↓     ↓     ↓
Allow  Review Claude explanation
             ↓
        User sees reasoning
```

No single LLM decides financial transactions alone.
