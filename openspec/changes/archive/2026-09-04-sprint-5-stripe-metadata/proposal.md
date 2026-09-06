# Proposal: Sprint 5 — Stripe PaymentIntent Metadata (orderId + userId)

## Intent

`paymentIntents.create` sends no `metadata.orderId` nor `metadata.userId`, blocking reconciliation between Stripe and the backend Orders table (Sprint 5 Gap #2, severity HIGH). Closing it moves payment readiness from ~80–85% toward ~95% for soft launch.

## Scope

### In Scope

- Add `metadata.orderId` and `metadata.userId` to `stripe.paymentIntents.create` in `createPaymentIntentService` (existing metadata preserved).
- Move orderId generation from the client hook (`useCreateOrder`) to the server create-payment-intent flow, so the same id flows into metadata now and into the Order record later (Gap #1).
- Return `orderId` in the create-payment-intent response so the client consumes a server-authoritative value.

### Out of Scope

- Gap #1: webhook handling (`payment_intent.succeeded` / `payment_failed`) — backend cycle.
- Gap #3: retry on `useCreateOrder` — separate frontend cycle.
- Gap #4: `idempotencyKey` — separate frontend cycle.
- Any backend change.
- `generateOrderId()` internals — already server-safe in `src/lib/orders/`; no move needed.

## Capabilities

### New Capabilities

- `checkout-payment-intent`: server-authoritative PaymentIntent creation with reconciliation metadata (`orderId`, `userId`) and server-issued orderId.

### Modified Capabilities

- None (researched `openspec/specs/`; no existing spec covers payment-intent creation — `checkout-error-display` covers error surfacing only).

## Approach

1. Route: capture `user` from `requireUser()` (already returned, currently discarded) and pass `userId` to the service.
2. Service: generate `orderId = generateOrderId()` BEFORE `paymentIntents.create`; add both to `metadata`; include `orderId` in response data.
3. Client: `CheckoutForm` captures `orderId` from the response; `useCreateOrder` receives it instead of calling `generateOrderId()`.
4. Strict TDD is ACTIVE per `openspec/config.yaml` — apply phase MUST run RED-GREEN-REFACTOR with `npx vitest run --maxWorkers=2` (never raw `npx vitest`).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/checkout/services/createPaymentIntentService.ts` | Modified | Generate orderId; add `orderId`/`userId` metadata; return orderId |
| `src/app/api/create-payment-intent/route.ts` | Modified | Pass server-derived `user.id` to service |
| `src/features/checkout/hooks/useCreateOrder.ts` | Modified | Remove local `generateOrderId()`; receive orderId |
| `src/features/checkout/components/CheckoutForm.tsx` | Modified | Forward response orderId downstream |
| `src/app/api/create-payment-intent/__tests__/route.test.ts` | Modified | Cover metadata + orderId response |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| orderId generated at wrong layer → two orders with different ids | Med | Single generation point, server-side, BEFORE `paymentIntents.create` |
| userId spoofed if client-supplied | Low | MUST derive only from `requireUser()` session; never from request body |
| Additive response change breaks CheckoutForm | Low | Additive field; existing tests updated under TDD |

## Rollback Plan

Metadata-only change: revert = drop `metadata.orderId`/`metadata.userId` (and orderId plumbing) from `paymentIntents.create`. Low-risk rollback; no data migration.

## Dependencies

- Existing `requireUser()` (already provides `user.id` server-side).
- Future Gap #1 webhook (backend) consumes `metadata.orderId`.
- Strict TDD: `npx vitest run --maxWorkers=2`.

## Success Criteria

- [ ] Every PaymentIntent created by this flow has `metadata.orderId` and `metadata.userId` populated.
- [ ] No duplicate orderIds across the system (verify by inspecting 10 PaymentIntents in Stripe test mode).
- [ ] `useCreateOrder.ts` no longer calls `generateOrderId()` locally.
