# Apply Progress: follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience

## Status

- **Mode**: Strict TDD (ACTIVE per `openspec/config.yaml`; no Standard Mode fallback).
- **Phase**: SDD apply complete. Implementation merged via chained PRs.
- **Result**: **OK** — both PRs MERGED into main, all spec scenarios pinned, triple-gate green (with disclosed pre-existing flake).

## Commits (per PR, stacked-to-main)

### PR #146 — catch leak fix (merged first)

| SHA | Subject |
|---|---|
| `2cbc215` | `fix(checkout): close useCreateOrder outer catch leak (S-MOD.8)` |

PR: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/146
Merge commit: `ccc62e6`
Diff: 82 insertions / 7 deletions (89 LOC changed)
Branch: `frontend/F8-catch-leak` (deleted after merge)

### PR #148 — inline retry (merged second)

| SHA | Subject |
|---|---|
| `3e3f0f0` | `feat(checkout): bounded inline retry for transient UPSERT failures (S-RET.1..S-RET.7)` |

PR: https://github.com/AndresDev28/e-commerce-relojes-bv-beni/pull/148
Merge commit: `5e8aea4`
Diff: 275 insertions / 25 deletions (300 LOC changed)
Branch: `frontend/F8-retry` (deleted after merge)

## Triple-Gate Results

### PR #146 local gate (final)

- `npx vitest run src/features/checkout/hooks/__tests__/useCreateOrder.test.ts --maxWorkers=2` → **17/17 pass**
- `npx tsc --noEmit` → clean
- `npm run build` → clean, 27 static pages

### PR #148 local gate (final)

- `npx vitest run src/features/checkout/hooks/__tests__/useCreateOrder.test.ts --maxWorkers=2` → **24/24 pass** (15 pre-existing + 2 S-MOD.8 from PR #146 + 7 new S-RET)
- `npx vitest run --maxWorkers=2` → 1157/1158 (1 pre-existing flake in `test/integration/image-allowlist.test.ts` C3.S1, documented in F5/F7 verify-report; second-run passes 3/3)
- `npx tsc --noEmit` → clean
- `npm run build` → clean, 27 static pages

### PR #146 CI gate

- Lint: pass (41s)
- Build: pass (1m 7s)
- Test: pass (1m 32s)
- E2E: **pass (3m 6s)** — 66/66 tests, 0 failed
- CodeQL: pass (twice)
- Trivy: pass (12s)
- npm audit: pass (30s)
- Vercel: pass

### PR #148 CI gate

- Lint: pass (24s)
- Build: pass (1m 5s)
- Test: pass (1m 39s)
- E2E: **pass (2m 46s)** — 66/66 tests, 0 failed
- CodeQL: pass (twice)
- Trivy: pass (20s)
- npm audit: pass (31s)
- Vercel: pass

## Spec Compliance Matrix

### S-MOD.8 — outer defensive catch does not leak error.message

| Test | Status |
|---|---|
| `useCreateOrder.test.ts > S-MOD.8 > throws from assembleOrderData — orderError MUST NOT contain error.message substrings` | ✅ COMPLIANT — 7 probed substrings all absent |
| `useCreateOrder.test.ts > S-MOD.8 > orderError MUST be byte-identical to checkoutOrderErrors fallback` | ✅ COMPLIANT — string equality pinned |

### S-RET.1..S-RET.7 — Order Upsert Retry Contract

| Scenario | Test | Status |
|---|---|---|
| S-RET.1 network throw retries | `network throw on attempt 1 retries; success on attempt 2 keeps orderError null and fires clearCart + onSuccess exactly once` | ✅ COMPLIANT |
| S-RET.2 5xx retries then 200 | `5xx on attempts 1 and 2 retries; success on attempt 3 fires success hooks exactly once` | ✅ COMPLIANT |
| S-RET.3 409 is terminal | `409 on attempt 1 is terminal — no second attempt fires; orderError equals the conflict copy` | ✅ COMPLIANT |
| S-RET.4 4xx is terminal | `400 on attempt 1 is terminal — no second attempt fires; orderError equals the validation copy` | ✅ COMPLIANT |
| S-RET.5 exhausted → friendly fallback | `3 transient failures in a row surface the friendly fallback banner; clearCart + onSuccess do NOT fire` | ✅ COMPLIANT |
| S-RET.6 D-lock wire body preserved | `wire body and orderId are byte-identical across attempts; only the X-Trace-Id rotates` | ✅ COMPLIANT |
| S-RET.7 isCreatingOrder stays true | `isCreatingOrder holds true across the retry window — verified by observing all 3 fetch attempts complete before the final flip` | ✅ COMPLIANT (structural) |

Compliance summary: 8/8 scenarios compliant (native count: 1 MODIFIED scenario + 7 ADDED scenarios).

## Deviations

1. **Implementation strategy: chained PRs.** Original sdd-apply produced a single 444 LOC commit that exceeded the 400-line review budget. Per user decision, F8 split into chained PRs (PR #146 catch-leak = 89 LOC; PR #148 retry = 300 LOC). Each PR independently passes triple-gate and CI. Banner-copy invariant (S-MOD.8) lands first, so PR #148's retry-loop contract is unambiguous.
2. **S-RET.7 structural verification.** Strict TDD for S-RET.7 with fake timers + React state batching is fragile. The test verifies the invariant structurally: if `isCreatingOrder` had flipped false between attempts, the retry loop would have aborted and the 3 fetch attempts would not complete. This is recorded in the test's comment as the chosen verification strategy.
3. **Helper location: file-local.** F8 design chose inline retry (no new module) over extracting `withRetry`. Justification: only one concrete consumer today; promotion to shared helper deferred until a second consumer exists. Documented in the apply-progress carry-forward.

## Pre-Existing Flakes Disclosed

- `test/integration/image-allowlist.test.ts C3.S1` — flake documented in F5 verify-report (obs #1915) and F7 verify-report (obs #1915). Reproducible at low rate; second-run passes 3/3. NOT a regression introduced by F8. No code change to address (test logic, not app logic).
- `tests/e2e/checkout-order-upsert.spec.ts` Firefox cart-priming flakes documented in F7 verify-report. NOT touched by F8.

## Carry-Forward Items

1. **F4 spec drift.** The canonical `openspec/specs/checkout-error-display/spec.md` does not contain the S-MOD.1..S-MOD.7 scenarios that F4 archive composed. F8 did NOT reconcile this drift (out of scope per F8 design). Reconciliation belongs to a separate change.
2. **`withRetry` extraction.** When a second consumer (e.g. `CheckoutForm` payment-intent flow) needs the same retry semantics, extract the inline helper to `src/lib/http/withRetry.ts`. Tracked as future work; F8 design explicitly deferred.
3. **Image-allowlist C3.S1 flake.** Pre-existing, not F8. Disclosed above.
4. **F9 — payment-errors Test 2.** Was deferred from F4; still pending as a separate change.

## Public API Surface

`src/features/checkout/hooks/useCreateOrder.ts` public hook contract is unchanged:
- Inputs: `(options?: { onSuccess?: (orderId) => void; clearCart?: () => void })`
- Outputs: `{ createOrder, isCreatingOrder, orderError, clearOrderError }`

`src/app/checkout/page.tsx:35-37` consumer continues to work without change (uses only `createOrder`, `isCreatingOrder`, `orderError`).

## Files Changed (final vs main before F8)

| File | Insertions | Deletions |
|---|---|---|
| `src/features/checkout/hooks/useCreateOrder.ts` | 103 | 9 (net) |
| `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` | 197 | ~16 (existing rewrites for the deleted retry-after-error tests) |

Total: ~300 LOC added/modified across the chained PRs.

## Next Step

Ready for archive (sdd-archive). The canonical `checkout-error-display/spec.md` needs the MODIFIED block (S-MOD.8 added to `Friendly Error Mapping for Stripe Codes`) and the new `Order Upsert Retry Contract` requirement applied. Archive moves the change folder under `openspec/changes/archive/2026-09-23-follow-ups-sprint-5-stripe-upsert-f8-use-create-order-resilience/` and runs `gentle-ai sdd-archive-compose` to merge the deltas into main.
