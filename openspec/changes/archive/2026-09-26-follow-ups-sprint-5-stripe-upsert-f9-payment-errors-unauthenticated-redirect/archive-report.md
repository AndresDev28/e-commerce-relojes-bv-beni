# Archive Report — F9 Unauthenticated Visitor Redirect

**Change**: `follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect`
**Archived at**: 2026-09-26
**Mode**: manual (Path B per session decision; openspec filesystem-driven for archive materialization; Engram-persisted for runtime artifacts)
**Branch state at archive**: merged to `main` (per user confirmation; F9 commits `0c8f48f` + `3b0d8cf`)

---

## 1. Final-State Summary

The archive report describes the state AT CLOSE. All facts below are sourced from the live persisted artifacts in this folder (rank 1), the apply-progress observation (#1945 in Engram, rank 2), and the verify-report.md (rank 3 — intermediate runtime evidence, valid as of archive time).

### 1.1 Task Completion (persisted tasks artifact, rank 1)

All 7 tasks resolved in Engram obs #1944 (`sdd/.../tasks`):

| Task | Status | Notes |
|---|---|---|
| T1 spec delta | ✅ Complete | +41 LOC on canonical `checkout-error-display/spec.md` |
| T2 comment rewrite | ✅ Complete | L20-24 of `payment-errors.spec.ts` |
| T3 test re-enable | ✅ Complete | `test.skip` → `test`, 4/4 passed in 11.7s |
| T4 RED-rescue | ⏭ Skipped | T3 landed GREEN on first run; no iteration needed |
| T5 triple gate | ✅ Complete | vitest 1158/1158 · tsc 0 · build 0 |
| T6 push + PR | ✅ Complete (user-merged) | Per user's "ya está mergeada y ok" confirmation |
| T7 apply-progress | ✅ Complete | Engram obs #1945 |

**Task Completion Gate**: PASS. All 7 tasks resolved.

### 1.2 Verification verdict (final, from `verify-report.md`)

- `requirements: 1/1` — Unauthenticated Visitor Redirect (R7, ADDED)
- `scenarios: 4/4` — S-UNAUTH.1, S-UNAUTH.2, S-UNAUTH.3, S-UNAUTH.4
- `blockers: 0`, `critical_findings: 0`
- Triple gate: GREEN
- E2E gate: 4/4 passed (chromium + firefox)

### 1.3 Merge evidence (mechanical copy contract)

Per the F3 archive pattern, this section documents the merge path:

| Step | Action | Evidence |
|---|---|---|
| 1 | Branch creation | `frontend/F9-payment-errors-unauthenticated-redirect` from `main` @ `309818c` |
| 2 | Commit 1 | `0c8f48f docs(openspec): add Unauthenticated Visitor Redirect requirement to checkout-error-display` |
| 3 | Commit 2 | `3b0d8cf test(checkout): re-enable Test 2 unauthenticated redirect (F9/S-UNAUTH.1)` |
| 4 | PR | merged to `main` (per user confirmation) |
| 5 | Archive folder | `openspec/changes/archive/2026-09-26-follow-ups-sprint-5-stripe-upsert-f9-payment-errors-unauthenticated-redirect/` |

## 2. Canonical Spec State (live at archive time)

`openspec/specs/checkout-error-display/spec.md` at archive time contains **6 requirements**:

1. Single Page-Level Payment Error Alert
2. ErrorMessage Component Contract
3. Trace ID Preservation Through Error Path
4. Friendly Error Mapping for Stripe Codes (incl. S-MOD.8 from F8)
5. Order Upsert Retry Contract (incl. S-RET.1..S-RET.7 from F8)
6. **Unauthenticated Visitor Redirect (F9)** — ADDED 2026-09-26

### 2.1 F4 spec drift — still unresolved, OUT OF SCOPE for F9

The six ADDED requirements from F4 (#1895 spec: R1..R6) remain missing from canonical `checkout-error-display/spec.md`. F9 explicitly carved this drift out per #1937 next-steps. F4 spec reconciliation is a separate change pending.

| Capability requirement | Source | Status at F9 archive |
|---|---|---|
| R1 Payment-Intent Friendly Mapper | F4 #1895 | ❌ Missing (still drift) |
| R2 CheckoutForm Integration | F4 #1895 | ❌ Missing (still drift) |
| R3 Public API Exposure | F4 #1895 | ❌ Missing (still drift) |
| R4 Unit Coverage and No-Leak Guarantee | F4 #1895 | ❌ Missing (still drift) |
| R5 onError Contract Preserved | F4 #1895 | ❌ Missing (still drift, partially via S-MOD.8) |
| R6 UPSERT Mapper Isolation | F4 #1895 | ❌ Missing (still drift) |
| R7 Unauthenticated Visitor Redirect (F9) | F9 #1942 | ✅ ADDED |

**Recommendation for follow-up**: open a dedicated F4-spec-reconciliation change to apply R1..R6 as ADDED requirements to canonical `checkout-error-display/spec.md`. Code already implements all six (the `paymentIntentErrors` mapper per F4 #1901 archive), so this is a docs-only reconciliation.

## 3. Carry-Forward Warnings

| ID | Severity | Description |
|---|---|---|
| W1 | Low | F9 adds R7 to `checkout-error-display`; F4 spec drift persists. Documented as next-steps in F8 #1937. |
| W2 | Low | S-UNAUTH.4 (F7 race guard mid-PUT) is documented in spec but NOT exercised by automated test or manual Q&A. Future coverage optional. |
| W3 | Low | Cart persistence across browsers remains localStorage-only (per `AuthContext.tsx`'s `BUG-CART-PERSISTENCE` comment); the unrelated `bug-cart-persistence` change registered in native dispatcher at session start was NOT touched by F9. |
| W4 | n/a | No CI retry bump applied (`playwright.config.ts` untouched) — T4 RED-rescue not triggered. |

No CRITICAL or BLOCKING findings.

## 4. Relevant Commits

- `0c8f48f docs(openspec): add Unauthenticated Visitor Redirect requirement to checkout-error-display`
- `3b0d8cf test(checkout): re-enable Test 2 unauthenticated redirect (F9/S-UNAUTH.1)`

## 5. Relevant Files Changed (live, on `main` after merge)

| File | Change | LOC |
|---|---|---|
| `openspec/specs/checkout-error-display/spec.md` | ADDED requirement + 4 scenarios | +41 |
| `tests/e2e/payment-errors.spec.ts` | Comment rewrite + `test.skip` → `test` | +6/-6 |
| `src/app/checkout/page.tsx` | Untouched (already implements the contract) | 0 |
| `playwright.config.ts` | Untouched (no retry bump needed) | 0 |

Total: 47 insertions, 6 deletions, 2 files. Well under the 400-line review budget.

## 6. Engram Persistence

| Observation | Type | Topic key |
|---|---|---|
| #1940 | Exploration | `sdd/.../f9-payment-errors-unauthenticated-redirect/explore` |
| #1941 | Proposal (amended) | `sdd/.../f9-payment-errors-unauthenticated-redirect/proposal` |
| #1942 | Spec | `sdd/.../f9-payment-errors-unauthenticated-redirect/spec` |
| #1943 | Design | `sdd/.../f9-payment-errors-unauthenticated-redirect/design` |
| #1944 | Tasks | `sdd/.../f9-payment-errors-unauthenticated-redirect/tasks` |
| #1945 | Apply-progress | `sdd/.../f9-payment-errors-unauthenticated-redirect/apply-progress` |
| #1946 (this) | Archive-report | `sdd/.../f9-payment-errors-unauthenticated-redirect/archive-report` |

## 7. Acceptance Criteria (final, post-merge)

- [x] `tests/e2e/payment-errors.spec.ts` Test 2 reports `passed` under `npm run test:e2e`.
- [x] Test 1 (F4's friendly-error mapping) remains passing.
- [x] Triple gate stays green.
- [x] Canonical `openspec/specs/checkout-error-display/spec.md` includes the new requirement under `## Requirements` (6 reqs total).
- [x] Single PR merged to `main` with diff = 53 LOC (47 + 6), under the 400-line budget.
- [x] No regression to F7/F8 invariants: `useCreateOrder` retry semantics, defensive catch, race-guard `orderInFlightRef` all unchanged.
- [x] F4 spec drift (R1-R6) not touched; explicitly deferred per #1937 next-steps.

## 8. Cross-References

- **F4** (`#141` archived as `2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/`): originally deferred Test 2 as F9 candidate.
- **F7** (`#143` archived as `2026-09-21-follow-ups-sprint-5-stripe-upsert-f7-confirmation-redirect-regression/`): established `orderInFlightRef` race-guard pattern referenced in S-UNAUTH.4.
- **F8** (`#146` + `#148` archived as `2026-09-23-follow-ups-sprint-5-stripe-upsert-f8-use-create-order-resilience/`): retry contract (S-RET.*) and defensive catch (S-MOD.8) preserved by S-UNAUTH.4's non-regression clause.
- **Session summary** (pending): will capture F9 cycle in Engram at session close, mirroring F8's #1937 pattern.

## 9. Verdict

**pass**

F9 closed its narrow target with no scope expansion and no regression. Ready for production.

