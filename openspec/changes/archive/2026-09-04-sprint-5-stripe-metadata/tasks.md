# Tasks: Sprint 5 — Stripe PaymentIntent Metadata

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~220–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR: `frontend/sprint-5-stripe-metadata-paymentintent` |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (N/A — single PR) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Server-authoritative Stripe metadata and orderId plumbing | Single PR | `npx vitest run --maxWorkers=2 src/features/checkout/services/__tests__/createPaymentIntentService.test.ts src/features/checkout/hooks/__tests__/useCreateOrder.test.ts src/app/api/create-payment-intent/__tests__/route.test.ts` | N/A — manual Stripe test mode smoke per design Testing Strategy | Drop `metadata.orderId`/`metadata.userId` from service; revert hook to local `generateOrderId()` |

## Phase 1: Test Foundation (RED)

- [x] 1.1 Create `src/features/checkout/services/__tests__/createPaymentIntentService.test.ts` with failing tests for metadata preservation, empty `userId` fail-closed behavior, throwing orderId generation, pre-Stripe generation, and distinct sequential orderIds.
- [x] 1.2 Create `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` with failing tests that the payload uses the supplied `orderId` verbatim and `generateOrderId()` is never called.
- [x] 1.3 Extend `src/app/api/create-payment-intent/__tests__/route.test.ts` with failing tests for Stripe metadata, response `orderId`, and ignoring body-supplied `userId` in favor of the session id.
- [x] 1.4 Extend `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` with a failing test that `onSuccess` receives the server response `orderId`.

## Phase 2: Core Implementation (GREEN)

- [x] 2.1 Modify `src/features/checkout/services/createPaymentIntentService.ts` to accept `userId`, generate/validate `orderId` before Stripe, preserve legacy metadata, add both identity fields, and return `orderId`.
- [x] 2.2 Modify `src/features/checkout/hooks/useCreateOrder.ts` to remove local `generateOrderId()` and accept the canonical `orderId` argument for order assembly and navigation/callbacks.
- [x] 2.3 Modify `src/app/api/create-payment-intent/route.ts` to retain `user` from `requireUser()` and pass `userId: String(user.id)`; never use request-body `userId`.

## Phase 3: Client Wiring

- [x] 3.1 Modify `src/features/checkout/components/CheckoutForm.tsx` to capture response `orderId`, pass it through `onSuccess(paymentIntent, orderId)`, and leave the frozen `onError` signature unchanged.
- [x] 3.2 Modify `src/app/checkout/page.tsx` to forward `orderId` from `CheckoutForm.onSuccess` into `createOrder`/`useCreateOrder`.

## Phase 4: Verification

- [x] 4.1 Run `npx vitest run --maxWorkers=2`; confirm all RED tests are GREEN and existing checkout/error scenarios remain passing.
- [x] 4.2 Run `npm run build`; confirm TypeScript and production build pass.
- [ ] 4.3 Optionally run `npx vitest run --maxWorkers=2 --coverage` to confirm new paths are covered.
- [ ] 4.4 Record the proposal success-criteria checklist in the PR description; post-merge, inspect 10 Stripe test-mode PaymentIntents for unique orderIds and matching userIds.
