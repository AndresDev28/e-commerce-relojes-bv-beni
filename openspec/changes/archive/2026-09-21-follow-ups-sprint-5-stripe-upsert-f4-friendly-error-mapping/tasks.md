# Tasks: follow-ups/sprint-5-stripe-upsert/F4-friendly-error-mapping

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~191 (proposal) / confirmed (design) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single PR |
| Decision needed before apply | No |

Implementation order: RED → GREEN → keep-green sweep. Single PR (not chained — F4 is ~191 lines, under 400-line budget).

## Group A — RED Tests (write first, watch fail)

- [ ] **A1 [R1, AC1, S1.1]** RED: Unit tests for `paymentIntentErrors` — 5xx branch returns `STRIPE_ERROR_MESSAGES.api_error` for various body shapes (flat `error`, nested `error.message`, top-level `message`, undefined body). File: `src/features/checkout/utils/__tests__/checkoutPaymentErrors.test.ts` (+25 lines). Acceptance: 4-5 cases FAIL (module doesn't exist yet).

- [ ] **A2 [R1, AC2, S1.2]** RED: Unit tests for 4xx branch — returns Spanish validation copy, NOT raw backend text (400/401/403/429/other). File: same (+15 lines). Acceptance: 5 cases FAIL.

- [ ] **A3 [R1, AC3, S1.3]** RED: Unit tests for status 0 / undefined / NaN — returns `STRIPE_ERROR_MESSAGES.network_error`. File: same (+10 lines). Acceptance: 4 cases FAIL.

- [ ] **A4 [R1, AC4, S1.4]** RED: Unit tests for parse failure — undefined/null/array/string body. File: same (+15 lines). Acceptance: 4 cases FAIL.

- [ ] **A5 [R1, AC4, S4.1]** RED: Defensive no-leak — input with raw "Internal Server Error" in 3 fields → output does NOT contain substring. File: same (+15 lines). Acceptance: 1 case FAILS.

- [ ] **A6 [R2, AC7, S2.1]** RED: CheckoutForm test — mock `api/create-payment-intent` returns 500 → submit → assert Spanish visible AND 'Internal Server Error' absent. File: `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` (+15 lines). Acceptance: 1 case FAILS (current code passes raw error).

- [ ] **A7 [R2, AC7, S2.1]** RED: CheckoutForm test — mock fetch throws (network) → assert `network_error` Spanish visible. File: same (+10 lines). Acceptance: 1 case FAILS.

- [ ] **A8 [R3, AC6, S3.1]** RED: Module resolution test — `import { paymentIntentErrors } from '@/features/checkout'` succeeds. File: same CheckoutForm test or a dedicated import test (+5 lines). Acceptance: import FAILS (module doesn't export it).

- [ ] **A9 [R6, AC5, S5.1]** RED: E2E Test 1 un-skip — prime cart (mirror `checkout-order-upsert.spec.ts:113-140`), mock 500, assert Spanish visible AND 0 occurrences of 'Internal Server Error'. File: `tests/e2e/payment-errors.spec.ts` (+20 lines, un-skip Test 1). Acceptance: Test 1 currently skipped, will FAIL once un-skipped (asserts obsolete raw-text).

Commit (RED group): `test(checkout): RED tests for friendly payment-intent error mapping`

WATCH tests FAIL before moving to GREEN.

## Group B — GREEN Implementation (smallest change to make tests pass)

- [ ] **B1 [R1]** GREEN: Create `src/features/checkout/utils/checkoutPaymentErrors.ts` with the `paymentIntentErrors(status: number, body: unknown): string` function. Status-first branch precedence: 5xx wins (returns `STRIPE_ERROR_MESSAGES.api_error`), 4xx wins (status-keyed Spanish copy), 0/NaN/undefined wins (returns `STRIPE_ERROR_MESSAGES.network_error`). Neutral tuteo copy for 4xx. Never reads `body.error`, `body.message`, or `body.error.message`. (+45 lines). Acceptance: A1-A5 tests green.

- [ ] **B2 [R3]** GREEN: Add `paymentIntentErrors` to `src/features/checkout/index.ts` exports. (+1 line). Acceptance: A8 import resolves.

- [ ] **B3 [R2]** GREEN: Modify `src/features/checkout/components/CheckoutForm.tsx` lines 69-97: wrap `response.json()` in `.catch(() => undefined)`; call `paymentIntentErrors(response?.status ?? 0, parsedBody ?? undefined)`; pass result to `onError`. For fetch-throws: `paymentIntentErrors(0, undefined)`. `R7` signature unchanged. (+15 lines). Acceptance: A6, A7 tests green.

- [ ] **B4 [AC5, S5.1]** GREEN: Modify `tests/e2e/payment-errors.spec.ts` — un-skip Test 1, rewrite asserts to require Spanish copy visible + 0 'Internal Server Error' occurrences. (+20 lines, -10 obsolete). Acceptance: A9 test passes locally (verify phase runs Playwright).

Commit subjects (4 commits):
- `feat(checkout): add paymentIntentErrors mapper for friendly Spanish errors`
- `fix(checkout): route payment-intent errors through friendly Spanish mapper`
- `chore(checkout): export paymentIntentErrors from feature public API`
- `test(e2e): re-enable payment-errors Test 1 with friendly Spanish assertions`

WATCH all RED tests now PASS.

## Group C — Keep-Green / Refactor

- [ ] **C1**: Triple-gate sweep. Commands: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`. Acceptance: all 3 exit 0. Document any pre-existing flake (image-allowlist.test.ts C3.S1 is known).

- [ ] **C2**: Regression guard (R6/AC7). Verify these existing tests still pass untouched:
  - `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts`
  - `src/features/cart/hooks/__tests__/useCart.test.ts` (if exists)
  - `src/app/__tests__/page.test.tsx`
  - `src/app/checkout/__tests__/page.test.tsx`
  - `tests/e2e/checkout-order-upsert.spec.ts`
  - `tests/e2e/favorites-error-feedback.spec.ts`
  - `tests/e2e/payment-errors.spec.ts` Test 2 (still skipped, no behavior change)

## Group D — Documentation Follow-ups (deferred)

- [ ] **D1 (deferred)**: `useCreateOrder.ts:137-143` catch leak → track as F8 in verify-report.md
- [ ] **D2 (deferred)**: `payment-errors.spec.ts` Test 2 (unauthenticated redirect) → track as F9 in verify-report.md
- [ ] **D3 (deferred)**: BUG-REDIRECT-TIENDA (engram #1890) → track as F7 in verify-report.md

## Total Task Count

- Group A (RED): 9
- Group B (GREEN): 4
- Group C (keep-green): 2
- Group D (deferred): 3 (registered, not in F4 scope)
- **Total: 15 active tasks + 3 deferred**

## Estimated Total Changed Lines

- New file: 45 (mapper) + 80 (mapper tests) = 125
- Modified: 15 (CheckoutForm) + 30 (CheckoutForm tests) + 1 (index) + 20 (payment-errors.spec) = 66
- **Combined: ~191 lines** (per proposal, confirmed by design; well under 400-line budget → single PR)

## Implementation Order

1. Apply Unit 1 (RED group A) → commit → verify RED fails
2. Apply Unit 2 (GREEN group B) → commit per B1/B2/B3/B4 → verify GREEN
3. Apply Unit 3 (keep-green C1, C2) → verify triple gate

Single PR push; release-please handles versioning.

## Open Architectural Decisions

None. Strict fixed-copy approach pre-resolved in proposal as D1.
