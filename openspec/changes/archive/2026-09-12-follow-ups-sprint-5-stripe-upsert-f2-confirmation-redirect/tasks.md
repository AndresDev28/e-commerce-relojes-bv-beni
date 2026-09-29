# Tasks: follow-ups-sprint-5-stripe-upsert-f2-confirmation-redirect

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~125 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR with 3 work-unit commits |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A (single PR) |

Decision needed before apply: **No**
Chained PRs recommended: **No**
Chain strategy: **N/A**
400-line budget risk: **Low**

## Work-Unit Commit Split (single PR)

| Unit | Goal | Files | Test command | Rollback |
|------|------|-------|--------------|----------|
| 1 | RED tests (5 new tests) | `src/app/checkout/__tests__/page.test.tsx`, `tests/e2e/checkout-order-upsert.spec.ts` | `npx vitest run --maxWorkers=2 src/app/checkout/__tests__/page.test.tsx` | Revert commit; no prod change yet |
| 2 | GREEN implementation (page.tsx + mock widening) | `src/app/checkout/page.tsx`, `src/app/checkout/__tests__/page.test.tsx` | Same as Unit 1 | Revert commit; tests would fail again but no regression |
| 3 | Triple-gate sweep | (no file change) | `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build` | N/A (verification only) |

## Group A — RED Tests (write first, watch them fail)

- [x] **A1 [R3, S1.1]** RED: Unit test "successful checkout navigates to `order-confirmation?orderId=<server-id>` and never to `tienda`". File: `src/app/checkout/__tests__/page.test.tsx`. Acceptance: assert `router.push` called with `order-confirmation?orderId=…` and NOT with `tienda`. Estimated: +20 lines. **Implemented in 44de431.**

- [x] **A2 [R2, S2.1]** RED: Unit test "cart empty at mount navigates to `tienda`". File: same. Acceptance: assert `router.push` called with `tienda` on initial render when cart is empty. Estimated: +15 lines. **Implemented in 44de431** (regression-prevention test — already passes on pre-fix code).

- [x] **A3 [R1, S2.2]** RED: Unit test "race window — `clearCart` during in-flight does not trigger `tienda` push". File: same. Acceptance: invoke `handleSuccess`, resolve PUT 200, force cart to `[]`, assert no `tienda` push and `order-confirmation` push did fire. Estimated: +25 lines. **Implemented in 44de431.**

- [x] **A4 [R4, S4.1]** RED: Unit test "PUT 4xx surfaces friendly `orderError`, no navigation". File: same. Acceptance: assert `orderError` banner text (Spanish), `router.push` not called with either route, cart remains populated. Estimated: +20 lines. **Implemented in 44de431** (regression-prevention test — already passes on pre-fix code).

- [x] **A5 [R3, S3.1]** RED: E2E strict URL assertion. File: `tests/e2e/checkout-order-upsert.spec.ts`. Acceptance: replace permissive block at lines 184–188 with `await expect(page).toHaveURL(/order-confirmation?orderId=FAKE_ORDER_ID/)`. Estimated: +10 lines (replace, not add). PUT-count poll preserved. **Implemented in 44de431.**

## Group B — GREEN Implementation (smallest change to make tests pass)

- [x] **B1 [R1]** GREEN: Add `isOrderInFlight` state + synchronous set in `handleSuccess`. File: `src/app/checkout/page.tsx`. Acceptance: tests A1, A3 pass; existing tests still pass. Estimated: +10 lines (1 import, 1 `useState`, 1 setter at top of `handleSuccess`). **Implemented in 584d585** — `setIsOrderInFlight(true)` is the FIRST statement of `handleSuccess`, before `createOrder`.

- [x] **B2 [R1, R2]** GREEN: Consult flag in empty-cart `useEffect`. File: same. Acceptance: test A2 passes; A1, A3 still pass. Estimated: +5 lines (early-return guard inside effect). **Implemented in 584d585** — added `&& !isOrderInFlight` to the empty-cart branch and to deps.

- [x] **B3 [R1, R2]** GREEN: Consult flag in render early-return. File: same. Acceptance: mid-navigation render is safe (verified manually or via additional test). Estimated: +5 lines (add `isOrderInFlight` to early-return condition). **Implemented in 584d585** — added `|| isOrderInFlight` to the early-return condition.

- [x] **B4 [R4]** GREEN: Reset flag effect on `orderError` truthy. File: same. Acceptance: test A4 passes; A1, A2, A3 still pass. Estimated: +5 lines (dedicated `useEffect`). **Implemented in 584d585** — dedicated `useEffect([orderError])` calls `setIsOrderInFlight(false)` when truthy.

## Group C — Keep-Green / Refactor

- [x] **C1** Verify `useCreateOrder.test.ts` (15 tests) still passes. Command: `npx vitest run --maxWorkers=2 src/features/checkout/hooks/__tests__/useCreateOrder.test.ts`. Acceptance: 15/15 pass. **Verified: 15/15 pass on 584d585.**

- [x] **C2** Verify existing `page.test.tsx` tests (6 pre-existing) still pass after mock widening. Command: `npx vitest run --maxWorkers=2 src/app/checkout/__tests__/page.test.tsx`. Acceptance: 6/6 pre-existing + 4/4 new = 10/10 pass. **Verified: 10/10 pass on 584d585.**

- [x] **C3** Widen `onSuccess` mock ref signature to `(paymentIntent: unknown, orderId: string) => void` matching real `CheckoutFormProps`. File: `src/app/checkout/__tests__/page.test.tsx`. Acceptance: TypeScript compiles; no test count change. **Implemented in 44de431.**

- [x] **C4** Triple-gate sweep. Commands: `npx vitest run --maxWorkers=2 && npx tsc --noEmit && npm run build`. Acceptance: all three exit 0. Final size: ~125 changed lines. **Verified on 584d585: vitest 1106/1106 (exit 0), tsc (exit 0), build (exit 0). Final size: 272 insertions + 29 deletions = 301 lines (above ~125 estimate but well within the 400-line review budget).**

## Group D — Optional Documentation (deferred)

- [ ] **D1 (deferred)** Document the race in `AGENT.md` or a follow-up NOTES file. Out of scope for F2; the spec, design, and archify artifact already document the race.

## Follow-up (out of scope, deferred)

- Remove the unused optional `useCreateOrder.onSuccess` API. Latent foot-gun (per design key learning #1) but not load-bearing for F2's regression. Should be a separate change with its own blast radius analysis.

## Total Task Count

- Group A: 5 RED tests
- Group B: 4 GREEN implementation units
- Group C: 4 keep-green / refactor
- Group D: 0 (deferred)
- **Total: 13 active tasks + 1 deferred**

## Estimated Total Changed Lines

~125 (page.tsx ~25 + tests ~90 + e2e ~10). Under 400 budget → single PR.
