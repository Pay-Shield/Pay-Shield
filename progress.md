# PayShield — Progress Tracker

Reference spec: `guardian-architecture.md`. This file tracks what's actually built and verified, vs. what's written but untested, vs. what's missing — updated as work continues.

Last verified: 2026-09-11 (Phase 5 pass — see below). All claims in this file are backed by an actual curl/tsc/build run in this session, not just code review.

---

## Honest status: where we really are now

**Phase 5 (close the gaps) is done.** All four demo scenarios now land on the correct category/action against the real backend, verified in the natural click-through order (not cherry-picked isolated calls). The human-in-the-loop checkpoint is now real and enforced in the React UI, not just the unused PS09-native flow. Three previously-unknown bugs surfaced *during this fix pass* (not in the original audit) and were fixed too — listed below so nothing gets quietly lost.

**What's still open:** real Nemotron/Claude API keys have never been used in this project — every verified result below ran on the heuristic/template fallback path. That's the one item in the original Phase 5 list not closed out (can't close it without live keys). Dashboard/transaction-list status doesn't yet re-sync after a confirm/cancel decision (cosmetic — the audit log and risk decision are correct either way).

---

## Fixes applied this session

### 1. Human-in-the-loop checkpoint — now real (was: missing)
- New backend endpoint `POST /api/transactions/confirm` (`backend/main.py`) resolves a pending VERIFY/PAUSED decision. Critical/BLOCKED always rejects with 403 regardless of input — no override path exists, by design.
- New `backend/pending_store.py` — in-memory store keyed by `transaction_id`, written by `/api/transactions/analyze` for any non-SAFE action, popped by `/api/transactions/confirm`.
- `frontend/src/services/api.ts` — `analyzePayment` now returns `{data, viaBackend}` so the UI knows whether there's a real pending decision to resolve or (fallback mode) nothing to call. Added `confirmTransaction()`.
- `frontend/src/components/simulator/PaymentSimulatorModal.tsx` — VERIFY now shows a **Confirm & Proceed / Cancel Payment** step that must be resolved; PAUSED additionally requires a **Simulate OTP Verification** click first (simulated identity re-check, per architecture §6). The "Continue" / "View Investigation" footer buttons are hidden until the decision resolves — a risky payment can no longer be waved through by just closing the modal.
- Verified: full confirm happy-path tested via curl, audit log shows the two-line trail (`pending_confirmation` → `completed`) correctly. Verified confirming a since-resolved transaction 404s. Verified attempting to confirm a BLOCKED transaction 403s with "no override available."

### 2. Rule-engine keyword matching — rewritten (was: exact whole-word set match, missed "immediate" vs "immediately", no threat category)
- `backend/modules.py` — replaced set-intersection with regex (`URGENCY_RE`, `THREAT_RE`, `IMPERSONATION_RE`, `GIFT_CARD_RE`), added a `threat_language`/`coercive_pressure` category that didn't exist before.
- Same fix mirrored in `backend/llm_reasoning.py`'s heuristic fallback classifier (it had the identical bug, just via substring instead of set-intersection).
- **Bug found while fixing this**: scanning the recipient *name* for impersonation keywords caused a legitimate-looking name like "Electricity Billing Cell" to self-trigger `impersonation_language` (+25) on the word "electricity" — double-counting with the threat signal and forcing every utility-style scenario into Critical regardless of actual content. Fixed by scoping urgency/threat detection to note+recipient-name (scam handles do legitimately embed urgency, e.g. `urgent.power@upi`) but impersonation/gift-card detection to the note only (a real payee's own name shouldn't be able to accuse itself).

### 3. Recipient ID validation + known/flagged lists — reconciled with frontend
- `backend/modules.py` — format regex now accepts UPI-style VPAs (`name@bank`) as well as legacy bank-code IDs; previously every UPI handle the frontend actually sends was wrongly flagged `invalid_format`.
- `KNOWN_RECIPIENTS` / `FLAGGED_RECIPIENTS` now include the exact UPI IDs the frontend's Payment Simulator presets and `mockData.ts` use (`rahul@upi`, `merchant@upi`, `aakash.v@axisbank`, `zomato@hdfcbank` as known; `invest-guaranteed@okhdfcbank` as flagged), reconciling the two previously-disconnected recipient datasets **for the four demo scenarios specifically**. The rest of `mockData.ts`'s dashboard data (unrelated mock transactions/recipients not touched by the simulator) is still a separate cosmetic dataset — noted as a known remaining seam, not a blocker.

### 4. Behavioral Pattern module — now real (was: permanent stub, always scored 0)
- New `backend/session_store.py` — in-memory, per-`sender_id`, 30-minute rolling window of recent payment attempts.
- `backend/pipeline.py` — fetches session history before the parallel module fan-out, records the current attempt after recipient verification resolves (so it doesn't count itself).
- Verified: running scenario 2 then scenario 3 back-to-back correctly shows velocity contributing once a sender has 2+ new/flagged-recipient attempts in the window — confirmed both in isolation (no velocity) and accumulated (velocity fires) via repeated curl calls.

### 5. Reason-list contradiction — fixed
- `backend/frontend_adapter.py` `build_reasons()` no longer appends the generic "Payment appears legitimate based on available information." line when real risk factors are already present in the list.

### 6. Two bugs found *while fixing the above*, not on the original list
- **`get_llm_reasoning()` never returned `red_flags`** in its result dict (`backend/llm_reasoning.py`) — silently empty on every single call since it was written. `pipeline.py`'s `llm_red_flags` factor and `frontend_adapter.py`'s `socialEngineeringRisk` bonus were reading nothing. Fixed by adding the key to the return dict. Confirmed via the aggregate score is unaffected (red_flags only fed display/breakdown, not the actual score path) — re-ran all 4 scenarios after the fix, all still correct.
- **Emoji in `print()` crashed every request with `UnicodeEncodeError`** the moment output was redirected on this Windows machine (cp1252 console codepage can't encode `📊`/`❌`/etc.). This wasn't a cosmetic issue — it took down `/api/transactions/analyze` with a 500 on literally every call once discovered. Fixed by reconfiguring `sys.stdout`/`sys.stderr` to UTF-8 at the top of `backend/main.py` rather than stripping emoji (keeps logs scannable, fixes it for any future log line too). Also discovered the earlier "reasons text looks garbled" scare during this session was a red herring — verified the actual `audit_log.jsonl` bytes directly with the Read tool and the JSON is correctly UTF-8 escaped (`•`, `❌`); the garbling was a `curl | python -m json.tool` pipe-through-Git-Bash display artifact only, not real data corruption.

---

## Verified: all 4 demo scenarios, real backend, natural sequence

Run in order in one session (so velocity/session-state is realistic, not cherry-picked):

| # | Scenario | Amount | Result | Expected (§8) | Match |
|---|---|---|---|---|---|
| 1 | Trusted Friend (`rahul@upi`, "Lunch contribution") | ₹1,200 | `SAFE` / `SAFE` / score 0 | Low → auto-proceed | ✅ |
| 2 | New Freelancer (`priya.freelance@icici`) | ₹8,500 | `WARNING` / `VERIFY` / score 40 | Medium → confirm | ✅ |
| 3 | Utility Threat Scam (`urgent.power@upi`, urgency+threat language) | ₹25,000 | `HIGH` / `PAUSED` / score 82 | High → re-verify + confirm | ✅ |
| 4 | Crypto Syndicate Scam (flagged recipient, gift-card/crypto language) | ₹50,000 | `CRITICAL` / `BLOCKED` / score 100 | Critical → hard block | ✅ |

All 4/4 correct — this was 3/4 (Scenario 3 misclassified) before this session's fixes.

Confirm flow verified independently: VERIFY → confirm → audit log shows `pending_confirmation` then `completed`; BLOCKED → confirm attempt → 403, audit log shows `blocked`; re-confirming an already-resolved transaction → 404.

`tsc --noEmit`: clean. `npm run build`: succeeds. `python -m py_compile` on all backend files: clean. `test_api.py` (PS09-native contract): all 4 checks still pass after the shared-module changes.

---

## Build scope checklist (guardian-architecture.md §9) — updated

| In scope | Status |
|---|---|
| Simulated payment request form/API | ✅ Done |
| Five internal modules, parallelized where independent | ✅ All five are now real, not stubs (Behavioral Pattern was the last stub, closed this session) |
| Rule engine + one real LLM call for reasoning/explanation | ⚠️ Hybrid code path complete and correctly calibrated on the fallback path; **still never exercised with a live Nemotron or Claude key** |
| Aggregation and category mapping | ✅ Done, verified 4/4 |
| Human confirmation UI step | ✅ **Fixed this session** — real confirm/cancel/verify flow in the live React UI, backed by a real endpoint |
| Persistent audit log | ✅ Done, append-only event trail verified correct |
| Four demo scenarios wired up | ✅ **4/4 verified this session** (was 3/4) |

---

## What's still genuinely open

1. **Live Nemotron/Claude API keys never exercised.** Everything verified above ran the heuristic/template fallback. If you have keys, drop them in `.env` and re-run the 4-scenario check — worth doing at least once before submission to confirm the real API JSON-parsing path works (`_call_nemotron`'s response parsing, Claude's `generate_explanation` prompt) and not just the fallback.
2. **Dashboard transaction status doesn't re-sync after confirm/cancel.** The Transaction object is added to the dashboard's list at analysis time with its risk-assessed status (SAFE/VERIFY/PAUSED); confirming or cancelling resolves the backend audit trail correctly but doesn't currently flow back to update that already-rendered card's displayed status. Cosmetic — the source of truth (audit log, backend decision) is correct either way — but worth a polish pass if time allows.
3. **Recipient list reconciliation is scoped to the 4 demo presets**, not the full `mockData.ts` dataset (other mock transactions/recipients in the dashboard are unrelated cosmetic seed data, untouched by the live pipeline).
4. **No actual browser click-through performed** — everything above is verified via curl/API calls hitting the real running servers, which exercises the exact same code path the browser would, but the visual UI (button states, modal transitions, the OTP-simulation step) has not been eyeballed in an actual browser window this session.
5. Emoji-in-print fix is applied to `main.py` only (the process's stdout/stderr are reconfigured globally, so this actually covers every module's prints too since Python's `print()` always goes through the same `sys.stdout` — but worth knowing the fix lives in one place, not scattered).

---

## Phases

### ✅ Phase 1 — Setup & Core Infrastructure
FastAPI backend, Pydantic models, five-module skeleton, JSONL audit log, initial plain HTML/JS UI (now archived).

### ✅ Phase 2 — Hybrid LLM Architecture
Nemotron (fast classification) + Claude (explanations, Medium/High only) + rules-as-final-authority, per [[hybrid_llm_approach]].

### ✅ Phase 3 — API Bug Fixes
Fixed the original 422 on `/api/confirm`, enum serialization, CORS, logging.

### ✅ Phase 4 — Frontend Integration
Adopted the provided React/TS/Vite app (archived old HTML/JS to `archived/`, not deleted). Built `pipeline.py` + `frontend_adapter.py` so both contracts share one pipeline.

### ✅ Phase 5 — Close the gaps
All items from the original Phase 5 list are done except live-API exercise (item 6, blocked on not having keys to test with):
1. ✅ Human-in-the-loop wired into the real React flow
2. ✅ Rule-engine keyword matching fixed (regex, threat category, scoped scanning)
3. ✅ Recipient ID format validation fixed for UPI handles
4. ✅ Real session/behavioral velocity tracking wired
5. ✅ Reason-list contradiction fixed
6. ⬜ Real Nemotron/Claude API paths — needs live keys, not yet exercised
7. ✅ Full 4-scenario verification (via API calls exercising the real pipeline; not yet eyeballed in an actual browser)
8. ✅ Recipient lists reconciled for the 4 demo presets (broader dataset still separate, documented as known seam)

Plus 2 bugs found and fixed that weren't on the original list: missing `red_flags` in `get_llm_reasoning()`'s return, and emoji-in-print crashing requests on Windows.

### ⚪ Phase 6 — Submission polish (next)
- Get real API keys in and confirm the live Nemotron/Claude paths work at least once (Phase 5 item 6)
- Actual browser click-through of all 4 presets + the new confirm/verify UI, screenshot or note any visual issues
- Optional: sync dashboard transaction status after confirm/cancel (item 2 above) if time allows
- Re-run `test_api.py` one more time and add equivalent smoke coverage for `/api/transactions/confirm`
- Final README skim for drift against what actually shipped
- Confirm `.env.example` is accurate, nothing secret committed, `audit_log.jsonl` from this session's testing is fine to ship or reset per your preference (it's gitignored either way)

---

## Quick reference: what "done" currently means

Run both servers, open the Payment Simulator, submit any of the 4 presets: real rules + real behavioral/velocity tracking + fallback LLM reasoning run → correct risk score/category/action → for VERIFY/PAUSED, the UI now genuinely stops and waits for your explicit confirm or cancel (with a simulated identity check gating PAUSED) → decision is written to `audit_log.jsonl` as a two-step trail (initial analysis, then resolution) → BLOCKED is a hard stop with no override, verified via a direct attempt to bypass it. That loop is real, tested against the actual running backend, and matches the architecture doc's four required demo scenarios exactly. What's left is mostly "prove it with a real LLM key" and "look at it in an actual browser," not "build more of it."
