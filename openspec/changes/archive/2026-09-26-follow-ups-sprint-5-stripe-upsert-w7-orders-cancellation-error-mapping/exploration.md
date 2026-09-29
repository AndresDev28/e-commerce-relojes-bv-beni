# Exploration: W7 — Orders Cancellation Error Mapping

*(Combined with proposal in #1948; this mirror preserves the explore intent for archive traceability.)*

## Current State

`src/features/orders/services/requestCancellationService.ts:117` echoed the raw `orderData.orderStatus` enum value into a user-facing 400 response, violating AGENT.md:51. Same violation class that F4 (`CheckoutForm.tsx`) and F8 (`useCreateOrder.ts:191-201`, S-MOD.8) had closed, but for the orders flow cancellation path.

`src/features/orders/services/__tests__/requestCancellationService.test.ts` had TWO test assertions pinning the leaky behavior (L462 for `shipped`, L487 for `cancellation_requested`).

## Why this hole matters

After a customer requests cancellation and the backend reports a non-cancellable status (most commonly `shipped`), they would see `"No se puede cancelar un pedido en estado: shipped"` — leaking the internal snake_case enum value to the user-facing alert surface. Inconsistent with F4/F8 fix pattern at the user-facing surface.

## Affected Areas

- `src/features/orders/services/requestCancellationService.ts` — leaky line at L131 (verified post-edit; pre-edit L117)
- `src/features/orders/services/__tests__/requestCancellationService.test.ts` — assertions at L462 + L487

## Recommendation (summary)

Add a file-local `NON_CANCELLABLE_STATUS_COPY` map near `CANCELLABLE_STATUSES`, replace the leaky string interpolation with a map lookup + fallback, update both test assertions atomically per strict-TDD triangulation.

Full content in `proposal.md`.
