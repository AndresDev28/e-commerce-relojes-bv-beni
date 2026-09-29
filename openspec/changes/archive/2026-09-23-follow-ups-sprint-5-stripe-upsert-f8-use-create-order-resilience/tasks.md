# Tasks: follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 130–200 (initial estimate); final per-PR: 89 (catch-leak) + 300 (retry) |
| 400-line budget risk | Low (per PR; full F8 was 444 and split) |
| Chained PRs recommended | Yes (stacked-to-main) |
| Suggested split | PR #1 catch-leak → main → PR #2 retry → main |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | S-MOD.8 catch leak fix | PR #1 (#146, MERGED) | `npx vitest run src/features/checkout/hooks/__tests__/useCreateOrder.test.ts --maxWorkers=2` | `tests/e2e/checkout-order-upsert.spec.ts` (chromium) | Revert commit `2cbc215` on `frontend/F8-catch-leak` |
| 2 | S-RET.1..S-RET.7 inline retry | PR #2 (#148, MERGED) | `npx vitest run src/features/checkout/hooks/__tests__/useCreateOrder.test.ts --maxWorkers=2` (24/24) | `tests/e2e/checkout-order-upsert.spec.ts` (chromium + firefox) | Revert commit `3e3f0f0` on `frontend/F8-retry` |

## Phase 1: Foundation — Catch Leak Fix (S-MOD.8)

- [x] 1.1 RED test: throws from `assembleOrderData` with a dangerous `error.message`; assert `orderError` contains NONE of 7 probed substrings (`TypeError`, `/Users/dev/project`, `foo.ts:42`, stack frame markers, etc). File: `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` (new `describe('S-MOD.8')` block). Acceptance: 1 case FAILS against the original code (banner contains the substrings).
- [x] 1.2 GREEN: replace the outer `catch` body in `useCreateOrder.createOrder` (lines 136-144) with `setOrderError(checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id }))`. Rename unused `error` parameter to `_error` (TypeScript-eslint convention). File: `src/features/checkout/hooks/useCreateOrder.ts`. Acceptance: 1.1 RED test PASSES; all 15 pre-existing tests still PASS; `npx tsc --noEmit` clean; `npm run build` clean.
- [x] 1.3 Commit + push: subject `fix(checkout): close useCreateOrder outer catch leak (S-MOD.8)`. SHA: `2cbc215`. PR: #146 (MERGED into main at `ccc62e6`).

## Phase 2: Core Implementation — Inline Retry Loop (S-RET.1..S-RET.7)

- [x] 2.1 RED test S-RET.1: network throw on attempt 1; success on attempt 2 keeps `orderError` null, fires `clearCart` + `onSuccess` exactly once. File: `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` (new `describe('inline retry with backoff (S-RET.1..S-RET.7)')`). Acceptance: 1 case FAILS (only 1 fetch attempt today).
- [x] 2.2 RED test S-RET.2: 5xx on attempts 1 and 2; success on attempt 3. Acceptance: 1 case FAILS.
- [x] 2.3 RED test S-RET.3: 409 on attempt 1 → no second attempt, conflict copy. Acceptance: 1 case FAILS (terminal 409 should NOT retry today, but the new code changes the trigger table).
- [x] 2.4 RED test S-RET.4: 400 on attempt 1 → no second attempt, validation copy. Acceptance: 1 case FAILS.
- [x] 2.5 RED test S-RET.5: 3 transient failures (mix of network throws + 5xx) → friendly fallback banner, no leak of `error.message` substrings, `clearCart`/`onSuccess` do NOT fire. Acceptance: 1 case FAILS.
- [x] 2.6 RED test S-RET.6: wire body and `orderId` byte-identical across attempts; only `X-Trace-Id` rotates. Acceptance: 1 case FAILS.
- [x] 2.7 RED test S-RET.7: `isCreatingOrder` holds true across the retry window (verified structurally: 3 fetch attempts complete before final flip). Acceptance: 1 case FAILS.
- [x] 2.8 GREEN: implement the inline retry loop in `useCreateOrder.doCreateOrder`. Capture `wireBody` and `upsertUrl` once before the loop (D-lock). Build fresh `X-Trace-Id` per attempt. `MAX_ORDER_UPSERT_ATTEMPTS = 3`, `ORDER_UPSERT_BACKOFF_BASE_MS = 500`, exponential. File-local helpers `isRetryableOrderUpsertStatus`, `sleep`. File: `src/features/checkout/hooks/useCreateOrder.ts`. Acceptance: 7 RED tests PASS; all 17 pre-existing tests still PASS; `npx tsc --noEmit` clean; `npm run build` clean.
- [x] 2.9 Commit + push: subject `feat(checkout): bounded inline retry for transient UPSERT failures (S-RET.1..S-RET.7)`. SHA: `3e3f0f0`. PR: #148 (MERGED into main at `5e8aea4`).

## Phase 3: Testing / Verification

- [x] 3.1 Triple-gate sweep: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`. All three MUST exit 0. Pre-existing flake (`test/integration/image-allowlist.test.ts` C3.S1) disclosed in F5/F7 verify-report — second-run passes.
- [x] 3.2 Spec scenario sweep: 1 MODIFIED requirement (S-MOD.8 added) + 1 ADDED requirement `Order Upsert Retry Contract` (S-RET.1..S-RET.7). All 8 scenarios pinned by automated tests in `useCreateOrder.test.ts`. Structural verification done at apply time.
- [x] 3.3 First CI run baseline: both PRs ran on GitHub Actions. PR #146 E2E 3m 6s pass; PR #148 E2E 2m 46s pass. No CI flake attributable to F8 changes. Pre-existing image-allowlist flake reproducible at low rate; second-run pass.
- [x] 3.4 Rollback rehearsal (implicit via PRs): each PR independently revertable. PR #146 reverts the catch leak. PR #148 reverts the retry loop. Both bounded to the `useCreateOrder.ts` file surface plus its tests; no other consumer changed.
- [x] 3.5 Final-state facts recorded: PR #146 MERGED at `ccc62e6`; PR #148 MERGED at `5e8aea4`. Diff per PR: #146 = 89 LOC, #148 = 300 LOC (both under 400-line budget).

## Phase 4: Cleanup / Documentation

- [x] 4.1 Spec drift disclosed: `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/` shows F4 added S-MOD.1..S-MOD.7 scenarios that are not in the current canonical `openspec/specs/checkout-error-display/spec.md`. F8 did NOT attempt to reconcile this drift (out of scope per F8 design). Reconciliation belongs to a separate change.
- [x] 4.2 `withRetry` extraction deferred: per F8 design, the inline retry stays in `useCreateOrder.ts` until a second consumer exists. `CheckoutForm` payment-intent flow could be that consumer but is not in F8 scope.
- [x] 4.3 Backoff shape: 500 ms base, exponential (500 ms, 1000 ms). Documented in code comments; tests use `vi.useFakeTimers()` so the actual wall-clock is irrelevant for the suite.

## Total Task Count

- Phase 1 (catch leak): 3
- Phase 2 (retry): 9
- Phase 3 (verification): 5
- Phase 4 (cleanup/docs): 3
- Total: 20 (all checked)

## Carry-forward

- F4 spec drift: not a regression introduced by F8, but `openspec/specs/checkout-error-display/spec.md` should have the S-MOD.1..S-MOD.7 scenarios. Future change to reconcile.
- `withRetry` extraction: tracked as future work when a second consumer (e.g. `CheckoutForm`) needs retry semantics.
- Image-allowlist flake baseline: pre-existing, not F8-attributable. Disclosed in F5/F7 verify-report.

## Total Task Count

- Phase 1 (catch leak): 3
- Phase 2 (retry): 9
- Phase 3 (verification): 5
- Phase 4 (cleanup/docs): 3
- Total: 20
