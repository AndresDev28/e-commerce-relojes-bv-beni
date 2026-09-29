# Proposal: follow-ups/sprint-5-stripe-upsert/F2-confirmation-redirect

## Intent

`useCreateOrder` clears the cart before pushing `/order-confirmation?orderId=…`, while `CheckoutPage`'s empty-cart `useEffect` simultaneously pushes `/tienda`. The two compete and `/tienda` wins by React scheduling. Net effect: after a successful checkout the user lands on the storefront instead of the confirmation screen, losing the order summary.

This proposal introduces an **order-in-flight guard** in `CheckoutPage` so the empty-cart redirect is suppressed while an order is being persisted. After the guard, every successful PUT upsert lands on `/order-confirmation?orderId=<server-order-id>` and `/tienda` is reserved exclusively for cart-empty-at-mount.

The original observation (#1813) attributed the bug to a recursive `useCreateOrder.onSuccess` callback. That diagnosis is **incorrect** for v1.8.0 main — no production caller wires that callback. The real bug is competing redirect ownership, exposed by the v1.8.0 rewrite.

## Scope

### In Scope

- `src/app/checkout/page.tsx` — add `isOrderInFlight` page-local state, set synchronously in `handleSuccess` BEFORE `createOrder`, consulted by the empty-cart `useEffect` and the render early-return; reset only when `orderError` becomes truthy.
- `src/app/checkout/__tests__/page.test.tsx` — add 4 new unit tests covering S1.1 (success → `/order-confirmation`, never `/tienda`), S2.1 (cart empty at mount → `/tienda`), S2.2 (deterministic race simulation), S4.1 (failure → banner, no navigation). Widen `onSuccess` mock ref type to match real `CheckoutFormProps` signature `(paymentIntent, orderId)`.
- `tests/e2e/checkout-order-upsert.spec.ts` — replace the permissive block at lines 184–188 with a strict `toHaveURL(/\/order-confirmation\?orderId=${FAKE_ORDER_ID}/)` assertion. Preserve the PUT-count poll because it gates payload assertions downstream.

### Out of Scope

- Backend permissions / Strapi bootstrap (closed in `F1`).
- UPSERT contract (D-locked by parent cycle).
- Stripe retry policy.
- `checkoutOrderErrors` mapper refactor.
- `/order-confirmation` page redesign.
- Removing the optional `useCreateOrder.onSuccess` API (latent foot-gun, deferred — not load-bearing for this regression).

## Capabilities

### New Capabilities

- `checkout-confirmation-redirect`: page-local guard that suppresses competing empty-cart redirects while an order is in flight, and reserves `/tienda` for cart-empty-at-mount.

### Modified Capabilities

- None. No existing capability in `openspec/specs/` owns checkout redirect semantics.

## Approach

**Capability delta = 1** (frontend only).

Introduce a `useState<boolean>` named `isOrderInFlight` in `CheckoutPage`. Set it as the first statement of `handleSuccess`, **synchronously**, before invoking `createOrder`. The synchronous set batches with `useCreateOrder`'s internal `setIsCreatingOrder(true)` and commits strictly before the awaited PUT resolves, so the `clearCart`-triggered render never observes `false`.

Consult the flag in two places:
1. The empty-cart `useEffect` — if `isOrderInFlight` is true, do NOT redirect to `/tienda`.
2. The render early-return at `page.tsx:74` — same guard prevents a mid-navigation null-render.

Reset the flag via a dedicated effect on `orderError` becoming truthy only. NOT on success (the flag must outlive the final render). NOT on unmount (the state dies with the instance; mount-scoped lifetime is what prevents stale-flag).

`useCreateOrder` is **untouched**. D-lock wire body, X-Trace-Id, and `checkoutOrderErrors` mapping are preserved by absence from the diff.

**Strict TDD** (per `openspec/config.yaml`): T0 RED → T1 RED → T2 RED → T3 RED → T4 RED → GREEN → REFACTOR → GREEN.

LOC: ~125 (page.tsx ~25 + tests ~90 + e2e ~10).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/checkout/page.tsx` | Modified | Add `isOrderInFlight` state + set in `handleSuccess` + consult in effect + consult in early-return + reset effect on `orderError` |
| `src/app/checkout/__tests__/page.test.tsx` | Modified | Convert static mocks to mutable pattern; add 4 new RED tests; widen `onSuccess` signature |
| `tests/e2e/checkout-order-upsert.spec.ts` | Modified | Replace permissive block 184–188 with strict `toHaveURL` |
| `useCreateOrder.ts` | **NOT touched** | Preserves D-lock, X-Trace-Id, error mapping by construction |
| `CheckoutForm.tsx` | **NOT touched** | Stripe handling unchanged |
| `order-confirmation/page.tsx` | **NOT touched** | Consumes orderId as before |
| `CartContext.tsx` | **NOT touched** | `clearCart()` semantics unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Stale flag suppresses legitimate `/tienda` (e.g., user back-navigates) | Low | Mount-scoped state lifetime; reset only on `orderError`; `orderError` already gates any error UI |
| React 19 concurrent rendering tears the synchronous set | Low | `useState` setters are committed synchronously in React 19 event handlers; `handleSuccess` runs in the form's event callback, not in an effect |
| E2E race assertion flakiness | Low | FAKE_ORDER_ID is deterministic from the mocked payment-intent; `toHaveURL` waits up to Playwright's default timeout |
| D-lock contract regression | Very Low | `useCreateOrder` is not in the diff; existing PUT assertions stay green |
| Test file churn breaks 21 existing tests | Low | Mock widening preserves default values; 6 page tests + 15 hook tests verified stable |
| Rollback | Very Low | Single revert of page.tsx + page.test.tsx + e2e block; no DB or schema changes |

## Acceptance Criteria

1. After 200 PUT, the final URL is `/order-confirmation?orderId=<server-order-id>` in every successful checkout attempt.
2. Cart empty at page mount still redirects to `/tienda`.
3. PUT 4xx or 5xx shows the friendly `orderError` banner; no navigation, no `/order-confirmation`, no `/tienda`.
4. `X-Trace-Id` (UUIDv4) header present on every API call from `useCreateOrder`.
5. D-locked PUT wire body preserved: `{ userId, paymentIntentId, items, subtotal, shipping, paymentInfo }`. No `orderId`, no `orderStatus`, no `total`.
6. E2E `tests/e2e/checkout-order-upsert.spec.ts` asserts strict final URL; unit tests cover scenarios S1.1, S2.1, S2.2, S4.1.
