# Archive Report — follow-ups-sprint-5-stripe-upsert/F3-cors-over-ngrok

**Change**: `follow-ups-sprint-5-stripe-upsert/F3-cors-over-ngrok`
**Archived at**: 2026-09-14
**Mode**: openspec (filesystem-driven, with Engram `archive-report` persistence)
**Branch state at archive**: `main` @ `2b67540` (v1.10.0)
**Tags**: `relojes-bv-beni-v1.9.0` (post-PR1), `relojes-bv-beni-v1.10.0` (post-PR2)
**Verdict source**: `verify-report.md` (FULL CHANGE, FINAL, verdict `pass`, 0 CRITICAL, 0 BLOCKERS)

---

## 1. Final-State Summary (per Final-State Authority hierarchy)

The archive report describes the state AT CLOSE. All facts below are sourced from the orchestrator's launch prompt (rank 2) and the live persisted tasks artifact (rank 1). `verify-report.md` and `apply-progress` are rank 3 — intermediate snapshots, valid history, never evidence of final state.

### 1.1 Task Completion (persisted tasks artifact, rank 1)

All 12 active tasks checked `[x]` in `openspec/changes/archive/2026-09-14-follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/tasks.md`:

| Group | Tasks | Status |
|-------|-------|--------|
| PR1 Group A — RED tests | A1, A2 | ✅ |
| PR1 Group B — GREEN impl | B1, B2, B3, B4 | ✅ |
| PR1 Group C — Keep-green | C1 | ✅ |
| PR2 Group D — RED tests | D1, D2 | ✅ |
| PR2 Group E — GREEN impl | E1, E2, E3 | ✅ |
| PR2 Group F — Keep-green | F1 | ✅ |

**Task Completion Gate**: PASS. No unchecked implementation tasks.

### 1.2 Verification verdict (final)

- `requirements: 6/6` — Same-origin products proxy (R1), Same-origin categories proxy (R2), Friendly error mapping (R3), X-Trace-Id propagation (R4), Origin-aware fetchApiFull (R5), Server callers unchanged (R6).
- `scenarios: 7/7` — all scenarios in `openspec/specs/catalog-bff-proxy/spec.md` and the modified `catalog-load-more` section covered by passing tests.
- `blockers: 0`, `critical_findings: 0`.

### 1.3 Merge evidence (mechanical copy contract)

| Step | Command | diff -r result | Status |
|------|---------|----------------|--------|
| Copy `catalog-bff-proxy/spec.md` → `openspec/specs/catalog-bff-proxy/spec.md` | `cp` → `diff -r` | empty (0) | ✅ byte-identical |
| Merge 2 ADDED requirements into `openspec/specs/catalog-load-more/spec.md` | `edit` + grep verify | 6 original + 2 added = 8 requirements | ✅ |
| Move `openspec/changes/follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/` → `openspec/changes/archive/2026-09-14-follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/` | `git mv` → `diff -r` | empty (0) | ✅ byte-identical |

All `diff -r` outputs were empty (zero differences) — the only passing evidence per the SKILL.md Mechanical Copy Contract.

### 1.4 Triple-gate (final, main HEAD `2b67540`)

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| Tests | `npx vitest run --maxWorkers=2` | 0 | 1123/1123 passing across 91 files |
| Type-check | `npx tsc --noEmit` | 0 | empty output |
| Build | `npm run build` | 0 | `/api/products`, `/api/categories` registered as Dynamic (ƒ) routes |

### 1.5 E2E (final)

- `tests/e2e/catalog-origin.spec.ts` — 4/4 passed, twice consecutively, chromium + firefox ×2 each, against prod build (`next start`) + mock Strapi `:1337`.
- Output sha256: `7e2cbe9a4fae32d7a5eb41bb188d5ab122b66f21be45c0caad6bbb9520973575`.

### 1.6 PR history (final)

| PR | Merged as | Commits | Title |
|----|-----------|---------|-------|
| PR1 | #136 | 5 | server routes + tests + exports |
| PR2 | #138 | 4 | client routing + e2e + env |

### 1.7 Files on main (final, post-merge)

| File | Action | Lines (final) | Source PR |
|------|--------|---------------|-----------|
| `src/app/api/products/route.ts` | create | 109 | PR1 |
| `src/app/api/products/__tests__/route.test.ts` | create | 188 | PR1 |
| `src/app/api/categories/route.ts` | create | 98 | PR1 |
| `src/app/api/categories/__tests__/route.test.ts` | create | 141 | PR1 |
| `src/lib/api.ts` | modify | +74 / -6 cumulative | PR1 + PR2 |
| `src/lib/api/__tests__/api-browser-origin.test.ts` | create | 164 | PR2 |
| `tests/e2e/catalog-origin.spec.ts` | create | 67 | PR2 |
| `.env.example` | modify | comment block | PR2 |
| `openspec/changes/.../tasks.md` | modify | PR1 + PR2 task checkbox updates | chore commits |

Total combined: ~970 lines across both PRs (above the 400-line single-PR budget — chained-PR strategy justified).

---

## 2. Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `catalog-bff-proxy` | **Created** | New capability. 4 ADDED requirements (R1 Same-origin products proxy, R2 Same-origin categories proxy, R3 Friendly error mapping, R4 X-Trace-Id propagation) + 2 scenarios per requirement where applicable + Out-of-Scope + Delivery. Source: delta at `openspec/changes/.../specs/catalog-bff-proxy/spec.md`. Mechanical copy verified by empty `diff -r`. |
| `catalog-load-more` | **Modified** | 2 ADDED requirements appended (R5 Origin-aware fetchApiFull, R6 Server callers unchanged). Original 6 requirements preserved. Verified by line-count + grep + requirement-count check (8 total: 6 original + 2 added). |

Source of truth updated:
- `openspec/specs/catalog-bff-proxy/spec.md` (new, 5698 bytes)
- `openspec/specs/catalog-load-more/spec.md` (modified, 126 lines)

---

## 3. Archive Contents

```
openspec/changes/archive/2026-09-14-follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/
├── archive-report.md          ← THIS FILE (additive; excluded from snapshot diff)
├── design.md                  ✅ (9642 bytes)
├── exploration.md             ✅ (4160 bytes)
├── proposal.md                ✅ (5566 bytes)
├── verify-report.md           ✅ (18360 bytes, FINAL verdict PASS)
├── tasks.md                   ✅ (6052 bytes, 12/12 tasks complete)
└── specs/
    └── catalog-bff-proxy/
        └── spec.md            ✅
```

The active `openspec/changes/` directory no longer contains this change (verified post-move).

---

## 4. Warnings Carried (NON-BLOCKING, NOT REMEDIATED IN F3)

Per the orchestrator's launch prompt (rank 2), the following warnings are explicitly carried into the archive — they are not defects but honest disclosures:

- **W1 — `--no-verify` rationale gap**: 1 of 3 affected PR1 commits (`86f705d`) documents `--no-verify` rationale in-body; `b363ef3` and `cacf346` lack in-body rationale (apply-progress over-stated this). Main HEAD hook-clean (`tsc --noEmit` exit 0). Honest disclosure, not a work-quality defect.
- **W2 — E2E dev-mode flake**: cold `npm run dev` can hit a chunk-evaluation `SyntaxError` that prevents hydration, causing `waitForRequest` to time out. Harness reliability issue, not F3 code. Mitigation suggestion: point Playwright `webServer` at `next start` (prod build).
- **W3 — Docs drift**: `README.md`, `CLAUDE.md`, `docs/build-and-deployment.md`, `docs/setup-production.md` still describe `NEXT_PUBLIC_STRAPI_API_URL` without the BFF split `.env.example` now documents. Spec mandated only `.env.example`; not a compliance gap.
- **W4 — Image proxying**: `/uploads` still resolves to env host in the visitor's browser (`src/lib/images/url.ts`). Explicitly out of F3 scope per user direction.

All four are non-blocking and recorded for the follow-up backlog.

---

## 5. Deferred Follow-ups (REGISTERED, NOT IN F3)

Per the orchestrator's launch prompt:

- **F4** — friendly-error mapping in CheckoutForm + `payment-errors.spec.ts` fix (related to R3 friendly-error contract; out of scope per proposal).
- **F5** — add e2e to verify gates (CI improvement, currently skipped in triple gate).
- **F6 (renumbered)** — remove dead `useCreateOrder.onSuccess` API (carried from F2 archive).
- **Doc backlog** — address W3 (README/CLAUDE.md/docs sync) and W4 (image proxying).

These require separate SDD changes if the user wants to continue the follow-up cycle.

---

## 6. Final-State Authority Audit

The archive report does NOT echo any stale claim from `verify-report.md` or `apply-progress` as current state:

- The mid-chain PR1 verify-report verdict `fail` (5/6 reqs, 4/7 scenarios) is correctly attributed as "mid-chain state, now outdated" in `verify-report.md` itself; the FINAL verify-report supersedes it with `pass` (6/6, 7/7).
- The pre-existing flake in `test/integration/image-allowlist.test.ts` C3.S1 is documented in `verify-report.md` as "PASSED in this run (3/3) — the documented tolerance was not needed". F3 surfaces are confirmed inside the suite.

No contradictions required explicit recording: the orchestrator's final-state facts and the highest-ranked repository evidence aligned at archive time.

---

## 7. SDD Cycle Complete

- **Planned**: ✅ proposal + design + exploration + spec + tasks
- **Implemented**: ✅ PR1 (5 commits) + PR2 (4 commits), both merged to main
- **Verified**: ✅ 6/6 reqs + 7/7 scenarios, triple gate green, e2e 4/4 × 2 runs
- **Archived**: ✅ delta specs synced, change folder moved (byte-identical, `diff -r` empty)

The F3 catalog CORS BFF change is officially CLOSED. The follow-up cycle (F4 / F5 / F6 + W3/W4) is queued as separate SDD changes at the user's discretion.
