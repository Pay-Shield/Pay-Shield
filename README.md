# PayShield Guardian — Agentic Payment Security

Intelligent payment security assistant that analyzes payment requests through multiple specialist modules, produces a risk score, and makes secure decisions with human-in-the-loop oversight.

**Stack:** Single Node.js/TypeScript server (`server.ts`, Express) + React 19/TypeScript/Vite frontend, served from one process on one port.

## Architecture

**Five Internal Modules (not multi-agent):**
1. **Recipient Verification** — Is the payee known, new, or flagged?
2. **Risk Analysis (Rules)** — Amount, keywords, urgency/impersonation language
3. **Behavioral Pattern** — Velocity checks and per-sender session baseline deviation
4. **LLM Reasoning** — Local Ollama model (`qwen3:4b-instruct-2507-q4_K_M`) reads the free-text payment note and judges urgency, authority impersonation, threats, and social-engineering pitches
5. **Decision & Policy** — Aggregates all signals → score → category → action

**Key principle: rules AND LLM, not rules OR LLM.** `evaluateRisk()` in `server.ts` is the sole authority on `action` and `risk_level` — the LLM is never consulted for, and can never change, that decision. The LLM's only two effects on the response are:
- A bounded **±15 adjustment** to the numeric `risk_score` (clamped back to 0–100 after applying it)
- A plain-language **`llm_reasoning`** explanation of what it found (or didn't find) in the note

If the LLM call fails, times out, or the payment note is empty, the adjustment is simply `0` and `llm_reasoning` is omitted/`null` — the rules-only score and decision still stand. See `guardian-architecture.md` for the full original design spec.

**Categories (internal vocabulary, matches the frontend contract):**
- **SAFE (<30)** → Auto-approve
- **VERIFY (30–59)** → Require confirmation
- **PAUSED (60–84)** → Require re-verification + confirmation
- **BLOCKED (85+)** → Hard block, no override

## Project Structure

```
payshield/
├── server.ts                  # Express app — every HTTP endpoint, the 5-module risk pipeline,
│                               # the Ollama LLM reasoning module, and Vite dev-middleware wiring
├── server/
│   ├── mongodb.ts              # MongoDB Atlas client for user-added test scenarios
│   └── razorpay.ts             # Razorpay order creation + payment signature verification (simulated gateway)
├── src/                        # React 19 + TypeScript + Vite + Tailwind UI
│   ├── App.tsx                 # Route shell: landing -> auth -> dashboard app
│   ├── services/api.ts         # Calls /api/transactions/analyze & /api/security/scam-check
│   ├── types.ts                # Frontend-side response/payload contract types
│   └── components/             # dashboard, transactions, fraud, security, simulator, landing, guardian...
├── archived/                   # Superseded static HTML/JS frontend + original source archive (reference only)
├── data/                       # Local seed/reference data
├── .env.example                 # Environment template
├── vite.config.ts               # Vite dev server config (port 3000, @/ alias to src/)
├── guardian-architecture.md      # Full architecture spec (source of truth for the design)
└── progress.md                   # What's actually built/verified vs. still open
```

There is no separate backend/frontend split and no Python anywhere in this project — `server.ts` runs Express directly, and in development it mounts Vite as middleware on the same process/port so one `npm run dev` serves both the API and the React app.

## Setup

```bash
npm install
cp .env.example .env   # edit values as needed — all have safe defaults, see below
npm run dev
```

Serves everything — API and React frontend — on `http://localhost:3000`.

### Environment variables (`.env`)

| Variable | Default if unset | Purpose |
|---|---|---|
| `MONGODB_URI` | built-in Atlas test cluster URI | Storage for user-added test scenarios (`/api/scenarios`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | built-in test sandbox keys | Simulated payment gateway order creation/verification |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where the local Ollama server is running |
| `OLLAMA_MODEL` | `qwen3:4b-instruct-2507-q4_K_M` | Model used for the LLM reasoning module |

`server.ts` loads `.env` itself via `process.loadEnvFile()` at startup — no `dotenv` package needed. Every one of these has a working fallback default, so the app runs out of the box with no `.env` at all; you only need one if you want your own MongoDB/Razorpay credentials or a different Ollama model.

### Ollama (local LLM reasoning)

```bash
ollama pull qwen3:4b-instruct-2507-q4_K_M
ollama serve   # if not already running
```

Behavior baked into `callOllamaReasoning()` in `server.ts`:
- **6-second timeout** (`AbortController`) on every call from the request path — if Ollama doesn't respond in time, the request still completes normally with `llm_reasoning: null` / `llm_score_adjustment: 0` instead of hanging.
- **`keep_alive: "30m"`** is sent on every call so Ollama keeps the model resident in memory for 30 minutes after each use, instead of unloading it after its short default idle timeout — this avoids paying a multi-second cold-load cost again on the next request during a normal demo/dev session.
- **Startup warm-up**: when the server starts, it fires one background `callOllamaReasoning()` call (with a longer 30s timeout, since nothing user-facing is waiting on it) so the model is already loaded before the first real transaction arrives. This never blocks server startup and never crashes it if Ollama isn't running yet.
- If Ollama is unreachable at all, every call fails the same way as a timeout — logged distinctly (`Ollama call failed: ...` vs. `Ollama call timed out after 6s`) so the two cases are easy to tell apart in logs — and the rules-only score/decision is used.

## API Endpoints

### `POST /api/transactions/analyze`
```json
// Request
{ "recipientName": "Unknown Recipient", "upiId": "urgent.support@upi", "amount": 25000, "message": "Urgent payment release now or account will be disconnected", "senderId": "USER123" }

// Response
{
  "risk_score": 92,
  "risk_level": "CRITICAL",
  "action": "BLOCKED",
  "reasons": [
    "High-urgency language attempting to bypass cognitive verification",
    "Extortion or intimidation signals (legal, police, or account suspension)",
    "Institutional authority impersonation pattern detected",
    "LLM reasoning: This payment note uses strong urgency and threats of account suspension — classic social engineering tactics. It falsely implies institutional authority. There is no legitimate reason to demand immediate payment under threat."
  ],
  "breakdown": { "transactionRisk": 90, "recipientRisk": 94, "behaviorRisk": 12, "socialEngineeringRisk": 95, "networkRisk": 14 },
  "analysis_duration": 0.38,
  "transaction_id": "TXN-79168-IN",
  "llm_reasoning": "This payment note uses strong urgency and threats of account suspension — classic social engineering tactics. It falsely implies institutional authority. There is no legitimate reason to demand immediate payment under threat.",
  "llm_score_adjustment": 15
}
```
`llm_reasoning` and `llm_score_adjustment` are only present when `message` is non-empty. `action` and `risk_level` always come from the rules engine (`evaluateRisk()`) alone — the LLM adjustment is applied only to `risk_score`, clamped to 0–100.

### `POST /api/transactions/confirm`
```json
// Request
{ "transaction_id": "TXN-79168-IN", "confirmed": true }
// Response
{ "status": "completed", "message": "Payment confirmed and processed successfully.", "transaction_id": "TXN-79168-IN" }
```
Resolves a pending VERIFY/PAUSED decision stored in-memory by `/api/transactions/analyze`. A `BLOCKED` transaction_id always 403s — there is no override path, by design. An already-resolved or unknown `transaction_id` 404s.

### `POST /api/security/scam-check`
Analyzes a raw message (e.g. a suspicious SMS/WhatsApp text) for scam signals, independent of any payment. `{ message }` in, `{ scamRiskScore, riskLevel, signalsDetected, highlightedKeywords, explanation, recommendation }` out.

### `GET /api/audit-history?limit=50`
Returns the most recent entries from the in-memory legacy audit log (human-readable transaction summaries).

### `GET /api/audit/chain?limit=50` and `GET /api/audit/verify`
The SHA-256 hash-chained audit trail (`CryptoAuditTrail` in `server.ts`) — every module decision, LLM call outcome, and confirm/cancel resolution is recorded as a linked, tamper-evident entry. `/api/audit/verify` recomputes every hash and previous-hash pointer and reports whether the chain is intact. **Note:** this trail is in-memory only and resets on server restart — it is not currently persisted to disk (there is a stale `audit_chain.jsonl` file in the repo root from an earlier iteration of this project; the current `server.ts` does not write to it).

### `GET /api/health`
Simple liveness check: `{ status: "ok", time: "<ISO timestamp>" }`.

### MongoDB-backed test scenarios: `GET/POST /api/scenarios`, `DELETE /api/scenarios/:id`, `GET /api/scenarios/status`
User-addable custom test scenarios, persisted to MongoDB Atlas (falls back to an in-memory, non-persistent cache if Atlas is genuinely unreachable). `mongodb+srv://` URIs need a DNS SRV lookup to connect at all — on a machine where Node's own DNS resolver can't reach a working DNS server (some VPN/security software points it at an unreachable local address even though the OS resolver works fine for everything else), `server/mongodb.ts` detects the DNS-shaped failure and automatically retries once against public DNS servers (`8.8.8.8`, `1.1.1.1`) before falling back to the in-memory cache.

### Simulated Razorpay gateway: `GET /api/razorpay/config`, `POST /api/create-order` (alias `/api/razorpay/create-order`), `POST /api/verify-payment` (alias `/api/razorpay/verify-payment`)
Order creation and HMAC signature verification against the Razorpay test sandbox — no real money moves.

## Demo Scenarios

The React Payment Simulator ships with presets that map onto the four brief-required cases from `guardian-architecture.md` §8:

1. **Trusted Friend / known merchant** — known-style recipient, typical amount, plain note → expect **SAFE**
2. **New Freelancer** — new recipient, typical amount, plain note → expect **VERIFY**
3. **Utility Threat Scam** — new/flagged recipient, elevated amount, urgency + impersonation language → expect **PAUSED**
4. **Crypto Syndicate Scam** — flagged recipient, amount far above baseline, urgency + impersonation + crypto/gift-card language → expect **BLOCKED**

## Testing

1. `npm run dev`
2. Open `http://localhost:3000`
3. Launch the app → open the **Payment Simulator** from the sidebar
4. Try each preset, or enter a custom recipient/amount/message, and click **Analyze Payment**
5. For VERIFY/PAUSED results, resolve the human-in-the-loop confirm/cancel step (PAUSED additionally requires a simulated identity re-check first)
6. Check the **Transactions** and **Fraud & Alerts** tabs, and `GET /api/audit-history` / `GET /api/audit/chain`, to see the result recorded

`npm run lint` runs `tsc --noEmit` for a full type-check.

## Architecture Philosophy

- **Single agent, modular internals** — avoids multi-agent orchestration overhead
- **Rules are the final authority; the LLM only ever nudges within ±15** — no LLM-only decisions, ever
- **Bounded, explainable LLM usage** — one local model call per non-empty payment note, timeout-safe, never on the critical path for the block/allow decision itself
- **Parallel-friendly module design** — recipient verification, rule scoring, and behavioral pattern checks don't depend on each other's output
- **Human-in-the-loop by design** — VERIFY/PAUSED require explicit user confirmation; BLOCKED has no override
- **Simulated payments** — Razorpay integration runs against the test sandbox only; no real gateway integration
- **Cryptographically verifiable audit trail** — SHA-256 hash chain over every decision, in-memory per process

```
Payment Request
      ↓
Rule Engine (deterministic) ──────────────┐
      ↓                                    │
Local LLM (Ollama) reads the note          │  (runs only if message is non-empty;
      ↓                                    │   failure/timeout → adjustment = 0)
±15 bounded score adjustment + narrative ──┘
      ↓
Final risk_score, but action/risk_level are the rule engine's alone
  ┌────┼─────┬──────────┐
SAFE VERIFY PAUSED   BLOCKED
      ↓        ↓          ↓
  confirm   confirm    hard stop,
  required  + re-verify no override
```

No single LLM decides financial transactions alone.
