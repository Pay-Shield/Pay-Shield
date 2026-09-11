# PS09 — Agentic Guardian: Architecture & Workflow Plan

## 1. What we're building

A single agentic payment-security assistant that sits between a user submitting a payment request and that payment being marked complete. It analyzes the request, verifies the recipient, scores the risk, explains its reasoning in plain language, and either lets the payment through, asks the user to confirm, or blocks it outright.

The payment itself is **simulated** — no real money movement, no live payment gateway integration. The brief explicitly calls for a "payment simulation interface" and scores the reasoning/interception layer, not payment-rail integration.

**One agent. Five internal specialist modules. One aggregator. Not a multi-agent message-passing system.** The modules that don't depend on each other's output run in parallel; the rest is a straight pipeline.

---

## 2. Design decisions and why

| Decision | Reasoning |
|---|---|
| Single agent, modular internals — not separate coordinating agents | The brief's nine requirements are all satisfiable by one process. A distributed multi-agent system adds orchestration/failure-handling surface with no scoring benefit, and is riskier to demo live. |
| Rules **and** LLM, not rules **or** LLM | Rules handle objectively checkable, fast, auditable signals (amount, velocity, known/flagged payee). LLM handles the thing rules are bad at: judging free-text intent (urgency, impersonation, social engineering) — and doubles as the explanation generator. |
| Parallel execution where modules are independent | Recipient lookup, rule scoring, and behavioral pattern check don't depend on each other's output — running them concurrently is both faster and a legitimate "agentic" pattern to show, without needing a message bus. |
| Human-in-the-loop breaks autonomy on purpose | Medium/High risk require explicit user confirmation before the agent proceeds. This is deliberate — the brief calls for "safe autonomous decision-making," which means knowing when *not* to act autonomously. |
| No hash-chained audit log, no vector DB / RAG for scam patterns | Out of scope for the stated requirements. "Transaction audit history" just needs to be a persistent, readable log — not tamper-proof cryptography. Scope creep costs build time without adding rubric score. |
| No real Cashfree / live gateway integration | Brief explicitly says "simulation interface" and "simulated payment scenarios," twice. Scope stops at "before transaction completion" — what happens after is out of scope entirely. |

---

## 3. The five modules (not five agents)

| Module | Type | Job |
|---|---|---|
| **Recipient Verification** | Rule-based + lookup | Is this payee known, new, or flagged? Basic ID/account-format sanity check. |
| **Risk Analysis (rules)** | Rule-based | Deterministic checks: amount vs. typical spend, keyword hits for urgency/impersonation/gift-card language. |
| **Behavioral Pattern** | Rule-based | Velocity — multiple new-recipient attempts in a short session/window; amount deviation from user's own history. |
| **Reasoning (LLM)** | LLM | Reads the free-text note + context, judges social-engineering intent, produces its own risk contribution and a natural-language rationale. |
| **Decision & Policy (aggregator)** | Rule-based | Combines all signals into one 0–100 score, maps to a category, decides the required action. |

Recipient Verification, Risk Analysis (rules), and Behavioral Pattern run **in parallel** — they only need the raw request, not each other's output. The LLM Reasoning module can also run concurrently with them, since it only needs the note text and recipient context, not the other modules' scores. Decision & Policy waits for all four, then aggregates.

---

## 4. Complete end-to-end workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INGEST                                                        │
│    User submits a simulated payment request:                    │
│    { recipient_name, recipient_id, amount, note, sender_id }     │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARALLEL ANALYSIS (fan-out)                                   │
│                                                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ ┌────────┐ │
│  │  Recipient     │ │  Risk Rules   │ │  Behavioral  │ │  LLM   │ │
│  │  Verification  │ │               │ │  Pattern     │ │Reason- │ │
│  │                │ │  - amount vs  │ │              │ │  ing   │ │
│  │ - known/new/   │ │    baseline   │ │ - velocity   │ │        │ │
│  │   flagged      │ │  - keyword    │ │ - amount vs  │ │ - note │ │
│  │ - account age  │ │    hits       │ │   user       │ │   text │ │
│  │ - ID format    │ │               │ │   history    │ │ - intent│ │
│  │   check        │ │               │ │              │ │  judg. │ │
│  └───────┬────────┘ └───────┬───────┘ └──────┬───────┘ └───┬────┘ │
│          │                  │                 │             │      │
│          └──────────────────┴─────────────────┴─────────────┘      │
│                              │ (all outputs collected)               │
└──────────────────────────────┼───────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. DECISION & POLICY (aggregator)                                │
│    - Combine rule-weight scores + LLM risk contribution           │
│    - Produce final score (0–100) and category:                   │
│         Low (<30) / Medium (30–59) / High (60–84) / Critical (85+)│
│    - Map category → required action                              │
└───────────────────────────┬───────────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┬───────────────┐
        ▼                   ▼                    ▼               ▼
   ┌─────────┐        ┌───────────┐        ┌───────────┐   ┌───────────┐
   │  LOW     │        │  MEDIUM   │        │  HIGH      │   │ CRITICAL  │
   │          │        │           │        │            │   │           │
   │ Proceed  │        │ Show      │        │ Require    │   │ Hard      │
   │ auto-    │        │ reasons + │        │ re-verify  │   │ block —   │
   │ matically│        │ require   │        │ (simulated │   │ no bypass │
   │          │        │ user      │        │ OTP step)  │   │ path      │
   │          │        │ confirm   │        │ + confirm  │   │           │
   └────┬─────┘        └─────┬─────┘        └─────┬──────┘   └─────┬─────┘
        │                    │                     │                │
        │              ┌─────┴─────┐         ┌─────┴─────┐          │
        │              ▼           ▼         ▼           ▼          │
        │          [confirm]  [cancel]   [confirm]   [cancel]        │
        │              │           │         │           │          │
        └──────────────┴───────────┼─────────┴───────────┘          │
                                    │                                 │
                                    ▼                                 │
                    ┌───────────────────────────┐                    │
                    │ 4. HUMAN-IN-THE-LOOP        │                    │
                    │    CHECKPOINT               │                    │
                    │    (skipped only for Low)   │                    │
                    └───────────────┬───────────────┘                    │
                                    │                                     │
                                    ▼                                     │
                    ┌───────────────────────────────┐                   │
                    │ 5. EXPLAIN                     │                   │
                    │    Render factors + LLM        │                   │
                    │    narrative as plain-language  │                   │
                    │    alert, regardless of outcome │                   │
                    └───────────────┬─────────────────┘                   │
                                    │                                      │
                                    ▼                                      │
                    ┌────────────────────────────────┐                   │
                    │ 6. ACT                          │                   │
                    │    Approved → mark simulated     │                   │
                    │    transaction "complete"         │                   │
                    │    Cancelled/Blocked → halt        │◄──────────────────┘
                    │    (nothing proceeds)              │
                    └───────────────┬─────────────────────┘
                                    │
                                    ▼
                    ┌────────────────────────────────┐
                    │ 7. AUDIT LOG                     │
                    │    Persist: timestamp, request,   │
                    │    all module outputs, final score,│
                    │    category, action, outcome       │
                    └────────────────────────────────────┘
```

**Where the agent sits, precisely:** it is the entire block between step 1 (ingest) and step 6 (act). It never touches anything before the request is submitted or after the transaction is marked complete/halted. It controls one gate: whether the simulated transaction is ever allowed to reach "complete."

---

## 5. Risk scoring (rule weights — the deterministic half)

| Signal | Condition | Weight |
|---|---|---|
| Recipient known | In verified payee list | 0 |
| Recipient new | No transaction history | +25 |
| Recipient flagged | Matches scam registry / prior reports | +45 |
| Amount 2–5x typical | vs. user's baseline spend | +15 |
| Amount 5x+ typical | vs. user's baseline spend | +30 |
| Urgency language | "urgent," "immediately," "expiring," etc. | +15 to +30 (capped) |
| Impersonation language | "bank support," "KYC," "refund," "OTP," etc. | +25 |
| Gift card / crypto request | Irreversible-payout pattern | +30 |
| Velocity | 2+ new-recipient attempts in session | +15 |

Score capped at 100. Categories: **Low** <30, **Medium** 30–59, **High** 60–84, **Critical** 85+.

The LLM Reasoning module adds a separate qualitative signal (intent judgment + narrative) that can adjust the final score within a bounded range (e.g. ±15) — this is where "LLM-based reasoning" earns its place rather than being decorative on top of a rules-only system.

---

## 6. Action policy by category

| Category | Auto-proceed? | Verification required? | User confirmation? | Override possible? |
|---|---|---|---|---|
| Low | Yes | No | No (implicit) | N/A |
| Medium | No | No | Yes — explicit confirm | Yes, by confirming |
| High | No | Yes — simulated identity re-check | Yes — explicit confirm | Yes, after verification |
| Critical | No | N/A | N/A | **No — hard block** |

---

## 7. Audit log — what gets recorded per attempt

- Timestamp
- Raw request (recipient, amount, note)
- Recipient verification result
- Rule engine factor list + weights
- LLM reasoning output (score contribution + narrative)
- Final aggregated score and category
- Action taken (auto-approved / user-confirmed / user-cancelled / blocked)
- Outcome (transaction completed / halted)

Persisted to a simple store (flat file or lightweight DB) that survives beyond a single session — not just in-memory UI state.

---

## 8. Demo scenarios (mapped to the brief's four required cases)

| Scenario | Recipient | Amount vs. baseline | Note content | Expected category | Expected action |
|---|---|---|---|---|---|
| Normal payment | Known payee | Typical | Plain, no red-flag language | Low | Auto-proceed |
| New/unverified recipient | New payee | Typical | Plain | Medium | Confirm required |
| Suspicious request | New/flagged payee | Elevated | Impersonation + urgency language | High | Re-verify + confirm |
| High-risk transaction | Flagged payee | Far above baseline | Urgency + impersonation + gift-card/crypto | Critical | Hard block |

---

## 9. Build scope for the time available

**In scope:**
- Simulated payment request form/API
- Five internal modules as described (parallelized where independent)
- Rule engine + one real LLM call for reasoning and explanation
- Aggregation and category mapping
- Human confirmation UI step
- Persistent audit log
- Four demo scenarios wired up

**Explicitly out of scope:**
- Real/live payment gateway integration (Cashfree or otherwise)
- Hash-chained or cryptographically tamper-proof audit logging
- Vector database / RAG scam-pattern retrieval
- Multi-agent orchestration framework (LangGraph/CrewAI message-passing) — plain function calls with async/parallel execution achieve the same architecture without the overhead
- Anything happening after transaction completion (reversal, dispute handling, monitoring)
