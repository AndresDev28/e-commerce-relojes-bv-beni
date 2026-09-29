# Exploration: follow-ups/sprint-5-stripe-upsert/F2-confirmation-redirect

## Current State

After `sprint-5-stripe-upsert` shipped at v1.8.0 (PR #130 + release-please #135 merged), `useCreateOrder` was rewired from INSERT-only `POST /api/orders` to atomic UPSERT `PUT /api/orders/by-order-id/{orderId}`. The rewrite introduced a **navigation race** that breaks the post-checkout redirect to `/order-confirmation?orderId=…` in production.

### Checkout success call path (v1.8.0)

```
Stripe payment_intent.succeeded
  → CheckoutForm.tsx:156-160
  → CheckoutPage.handleSuccess (page.tsx:78-86)
    → useCreateOrder.createOrder()
      → PUT /api/orders/by-order-id/{orderId}      ✓ 200 OK
      → clearCart()                                  ← cartItems → []
        → CheckoutPage useEffect (cart empty)        ← sees []
          → router.push('/tienda')                   ← RACE 1 (empty-cart effect)
      → router.push('/order-confirmation?orderId=…') ← RACE 2 (confirmation)
```

**Both redirects fire; the order is decided by React scheduling. Empirically `/tienda` wins.**

### Code references (post-merge v1.8.0)

| File | Line | Behavior |
|------|------|----------|
| `src/app/checkout/page.tsx` | 35–37 | `useCreateOrder({ clearCart })` — only `clearCart` passed; no `onSuccess` from production code |
| `src/app/checkout/page.tsx` | 47–59 | `useEffect` redirects to `/tienda` when cart is empty |
| `src/app/checkout/page.tsx` | 78–86 | `handleSuccess` calls `createOrder` |
| `src/app/checkout/page.tsx` | 148–153 | `onSuccess={handleSuccess}` belongs to `CheckoutForm`, NOT to `useCreateOrder` |
| `src/features/checkout/hooks/useCreateOrder.ts` | 118–124 | `clearCart()` then `router.push('/order-confirmation?orderId=…')` |
| `src/app/order-confirmation/page.tsx` | 7–24 | Consumes `orderId` query param; only redirects on missing id |
| `src/features/cart/context/CartContext.tsx` | 252–254 | `clearCart()` mutates cart state |
| `tests/e2e/checkout-order-upsert.spec.ts` | 184–188 | Permissive assertion: "either redirect wins" — allows the regression to pass green |
| `src/app/checkout/__tests__/page.test.tsx` | — | No post-success navigation coverage |

### Diff vs PR2 worktree (the earlier investigation surface)

The first exploration pass (#1837) ran against `frontend/SPRINT5-UPSERT-pr2-rewire`, which was stale on `d798edc` (v1.7.0). The fast-forward to v1.8.0 (HEAD `03253a3`) brought substantial changes:

- `useCreateOrder.ts` — 68 line changes (POST→PUT, `userId`, D-lock wire-body filter, X-Trace-Id, friendly error mapping, transport failure handling)
- `useCreateOrder.test.ts` — 519 new lines
- `tests/e2e/checkout-order-upsert.spec.ts` — 263 new lines

But the v1.8.0 rewrite **preserved**:
- The optional `useCreateOrder.onSuccess` API (still dead in production code)
- `clearCart()` ordering before the confirmation push
- The empty-cart effect that redirects to `/tienda`
- No production caller wiring `useCreateOrder.onSuccess`

### Original observation (#1813) — corrected diagnosis

Observation #1813 (the original F2 follow-up entry) said: "`useCreateOrder.ts:onSuccess` creates a recursive loop." On v1.8.0 main this diagnosis is **incorrect** — the recursive wiring is absent. The actual production defect is the competing redirect ownership described above. The optional `onSuccess` API is preserved as a latent foot-gun but not currently triggered.

### Test coverage gap

- `tests/e2e/checkout-order-upsert.spec.ts:184–188` explicitly tolerates EITHER `/tienda` OR `/order-confirmation` as the final URL. The comment in the file literally says "The PUT lands exactly once regardless of which redirect wins." This is exactly the coverage gap that let the regression ship to main.
- `src/app/checkout/__tests__/page.test.tsx` does not exercise post-success navigation at all.
- `src/features/checkout/hooks/__tests__/useCreateOrder.test.ts` tests hook behavior in isolation only.

### Backend SSOT (unchanged)

The PUT endpoint `PUT /api/orders/by-order-id/:orderId` was locked by the parent cycle. Wire body D-locked: `{ userId, paymentIntentId, items, subtotal, shipping, paymentInfo }` (no `orderId`, no `orderStatus`, no `total` — verified against `useCreateOrder.ts:73-80`). Backend response carries the canonical `orderId` for the redirect query string.

## Root Cause

Two components compete for navigation ownership after a successful order creation:

1. `CheckoutPage`'s empty-cart `useEffect` (page.tsx:47-59) fires on every `cartItems.length === 0`.
2. `useCreateOrder`'s success branch (useCreateOrder.ts:118-124) calls `clearCart()` BEFORE `router.push('/order-confirmation?orderId=…')`.

`clearCart()` mutates `cartItems` to `[]` synchronously, which triggers the empty-cart `useEffect` before the confirmation `router.push` resolves. Both `router.push` calls land in the navigation queue; React + Next Router pick one winner.

Category: **competing navigation ownership**, not React Query retry, not `useCallback`/`useEffect` dependency array, not onSuccess callback recursion.

## Blast Radius

- All successful checkouts on v1.8.0 main land on `/tienda` instead of `/order-confirmation`.
- Users miss the confirmation screen showing their orderId, total, and order status.
- `checkoutOrderErrors` (parent-cycle Spanish mapper) is unaffected — it's only invoked on non-2xx responses.
- D-locked PUT wire body is unaffected — the regression is purely in navigation, not in API contract.
- AGENT.md rules (X-Trace-Id, friendly errors, atomic design, Screaming Architecture) are preserved by absence of changes to the hook.
