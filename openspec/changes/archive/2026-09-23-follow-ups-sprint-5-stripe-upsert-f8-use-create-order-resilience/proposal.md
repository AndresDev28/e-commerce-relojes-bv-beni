# Proposal: follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience

## Intent

`src/features/checkout/hooks/useCreateOrder.ts` still has one defensive failure path that violates the friendly-error rule from `AGENT.md:51`: the outer `createOrder` catch at `useCreateOrder.ts:136-144` interpolates raw `error.message` into the user-facing order banner instead of routing through `checkoutOrderErrors(...)`. This change closes that leak so the defensive catch produces the same safe support copy already used by the no-user branch (`useCreateOrder.ts:48-53`) and the transport-failure branch (`useCreateOrder.ts:98-104`).

This proposal also addresses backend roadmap gap #3 documented in `../e-commerce-relojes-bv-beni-api/docs/roadmapToProduction.md` and confirmed in the exploration: after a successful payment, transient network or 5xx failures during the UPSERT PUT still force the user straight into a support banner even though the backend contract is already idempotent on `orderId`. The chosen direction is the exploration recommendation — Approach 1, an inline 3-attempt exponential retry inside `useCreateOrder.ts` — so the frontend absorbs transient failures without widening scope to shared retry infrastructure.

## Scope

### In Scope
- Replace the outer `createOrder` catch in `src/features/checkout/hooks/useCreateOrder.ts:136-144` with `checkoutOrderErrors(0, null, { paymentIntentId })` so no raw error text reaches the UI.
- Add inline retry-with-backoff to the UPSERT PUT flow in `src/features/checkout/hooks/useCreateOrder.ts` using 3 attempts, 500 ms base delay, and exponential backoff.
- Extend the `checkout-error-display` capability with spec-level behavior for no-leak defensive handling and transient retry semantics on the checkout order-registration path.

### Out of Scope
- Backend changes to the order endpoint or idempotency contract.
- Extracting a shared `withRetry` helper or modifying other checkout/network hooks.
- Changes to `src/app/checkout/page.tsx`, `CheckoutForm.tsx`, or other consumers of `useCreateOrder`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `checkout-error-display`: extend the checkout order-error contract to forbid raw defensive-catch leakage and to define bounded retry behavior for transient UPSERT failures, including terminal handling for 4xx and 409 outcomes.

## Approach

Adopt the exploration's recommended Approach 1 and keep the resilience logic local to `src/features/checkout/hooks/useCreateOrder.ts`. The hook will assemble the D-lock wire body once, resend that exact body and `orderId` path parameter on each retry attempt, and rotate `X-Trace-Id` per attempt to preserve the A-4 traceability invariant. `isCreatingOrder` remains true across the full retry window, `orderError` is only set on a terminal failure, and success callbacks continue to fire only after the final 2xx response.

Retry trigger table committed from the exploration:

| Outcome | Retry? | Handling |
|---------|--------|----------|
| `fetch` throws (network / abort) | Yes | Retry up to 3 attempts with 500 ms exponential backoff |
| 5xx (`500`, `502`, `503`, `504`) | Yes | Retry up to 3 attempts with the same wire body |
| 4xx (`400`, `401`, `403`, `404`) | No | Map immediately through `checkoutOrderErrors(...)` |
| `409` | No | Treat as terminal per the F4 post-convergence invariant |
| 2xx | No | Success path; clear cart / success flow runs once |

The outer catch remains a defensive net only, but after this change it becomes behaviorally identical to the transport-failure branch by always calling `checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id })` instead of interpolating unknown exception text.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/checkout/hooks/useCreateOrder.ts` | Modified | Replace the raw defensive-catch banner at lines 136-144 and add inline retry/backoff around the UPSERT PUT while preserving D-lock body reuse and per-attempt trace IDs. |
| `openspec/specs/checkout-error-display/spec.md` | Modified | Baseline capability whose delta will be extended with the no-leak defensive catch scenario and transient retry scenarios referenced by the exploration. |
| `openspec/changes/follow-ups-sprint-5-stripe-upsert-F8-use-create-order-resilience/specs/checkout-error-display/spec.md` | New | Planned delta spec location for the S-MOD / S-RET additions that define the changed checkout behavior. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Retry logic accidentally retries terminal 409 or other 4xx responses | Medium | Keep the trigger table explicit in the spec and proposal; treat 409 and other 4xx as terminal mapper paths with no second request. |
| Retried requests drift from the original D-lock payload and break idempotent expectations | Medium | Assemble `wireBody` once before the loop and resend the same body and `orderId` on every attempt; only rotate `X-Trace-Id`. |
| Success side effects fire more than once across retries | Low | Keep `clearCart` and `onSuccess` after the final successful response only; no side effects during retry attempts. |
| Added backoff slightly increases user wait time on failure | Low | Bound retries to 3 attempts with 500 ms base exponential delays and limit retries to transient network / 5xx conditions only. |

## Rollback Plan

Revert the `src/features/checkout/hooks/useCreateOrder.ts` resilience changes and the `checkout-error-display` spec delta together; any implementation-aligned tests revert with that same rollback.

## Dependencies

- F4 friendly-error mapping is already merged and provides the terminal 409 invariant and tone precedent.
- F7 D-lock/order-in-flight work is already merged and provides the wire-body/idempotency precedent this retry strategy preserves.
- No backend change is required because the existing order UPSERT contract is already idempotent on `orderId`.

## Success Criteria

- [ ] The outer defensive catch in `src/features/checkout/hooks/useCreateOrder.ts:136-144` no longer exposes raw `error.message` content to the user-facing banner.
- [ ] `useCreateOrder` retries only transient outcomes (network throws and 5xx responses) using 3 attempts, 500 ms base delay, and exponential backoff.
- [ ] `409` and other terminal 4xx responses remain single-attempt outcomes mapped immediately through `checkoutOrderErrors(...)`.
- [ ] Each retry attempt reuses the same D-lock wire body and `orderId` while rotating `X-Trace-Id` per attempt.
- [ ] The proposal leaves the change within a single-PR scope under the 400-line review budget forecast captured in the exploration.
