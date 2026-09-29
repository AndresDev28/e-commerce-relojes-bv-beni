# Design: follow-ups/sprint-5-stripe-upsert/F2-confirmation-redirect

## Technical Approach

Single-owner navigation via a page-local `isOrderInFlight` guard in `CheckoutPage`. The flag is `useState<boolean>` (not a discriminated union — `orderError` already IS the error channel, mirroring it into page state creates a derived-state second source of truth).

Set: first statement of `handleSuccess`, synchronous — batches with `setIsCreatingOrder(true)` in the same continuation and commits strictly before the awaited PUT resolves, so the `clearCart`-triggered render can never observe `false`. Setting after `createOrder` reopens the race window.

Reset: dedicated effect on `orderError` truthy only. NOT on success (flag must outlive the final render — resetting reopens the race). NOT on unmount (state dies with the instance; mount-scoped lifetime is what makes stale-flag impossible on back-navigation).

Two consultation points:
1. The empty-cart `useEffect` at `page.tsx:55` — if `isOrderInFlight`, do NOT push `/tienda`.
2. The render early-return at `page.tsx:74` — same guard prevents mid-navigation null-render.

`useCreateOrder` is untouched. The D-lock wire body (`{ userId, paymentIntentId, items, subtotal, shipping, paymentInfo }` per `useCreateOrder.ts:73-80`), `X-Trace-Id` injection, and `checkoutOrderErrors` mapping are preserved by absence from the diff.

**Capability delta = 1** (frontend only, new `checkout-confirmation-redirect` capability). No backend, no schema, no API contract change.

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Flag type | `useState<boolean>` | Rejected `'idle'\|'in-flight'\|'error'` union: `orderError` already owns the error channel. Mirroring creates derived-state duplication. |
| 2 | Flag location | Component-local in `CheckoutPage` | Rejected `useRef` (impure render reads, not dep-tracked). Rejected context (no second consumer). |
| 3 | Set timing | First statement of `handleSuccess`, synchronous | `handleSuccess` runs in async continuation. Synchronous `setState` batches with hook's `setIsCreatingOrder(true)` and commits before awaited PUT resolves. Sets after `createOrder` would reopen the race window. |
| 4 | Reset trigger | Dedicated effect on `orderError` truthy only | Reset on success would let a final render observe `false` and trigger empty-cart effect. Reset on unmount is redundant — state dies with instance. |
| 5 | Consultation sites | Empty-cart effect + render early-return | Effect gates the redirect; render gates mid-navigation null-render. Both must consult the same flag. |
| 6 | Hook surface | Untouched | D-lock, X-Trace-Id, error mapping all preserved by construction. |
| 7 | `useCreateOrder.onSuccess` API | Preserve (deferred removal) | Not load-bearing for this regression. Cleanup would be a separate change with its own blast radius. |
| 8 | Test mock pattern | Mutable `let mockUser` in `page.test.tsx` | Existing mocks are static module-level factories; race simulation requires mutation. Widening without changing defaults keeps 6 existing tests green. |
| 9 | E2E assertion | Strict `toHaveURL` replacing permissive block | Comment + PUT-count poll preserved; only the redirect-tolerance assertion is replaced. |

## Data Flow

```
handleSuccess()                                  ← in CheckoutPage
  ├── setIsOrderInFlight(true)                   ← SYNCHRONOUS, FIRST LINE
  ├── createOrder()                              ← calls useCreateOrder hook
  │     ├── setIsCreatingOrder(true)             ← hook-internal, batches with above
  │     ├── PUT /api/orders/by-order-id/{orderId} ← D-lock body + X-Trace-Id
  │     └── on resolve:
  │           ├── if 200: clearCart() → router.push('/order-confirmation?orderId=…')
  │           └── if !200: setOrderError(checkoutOrderErrors(s, b))
  │
  ├── useEffect([cartItems.length === 0]):
  │     └── if !isOrderInFlight: router.push('/tienda')
  │           ↑ suppressed while guard is true
  │
  └── useEffect([orderError truthy]):
        └── setIsOrderInFlight(false)
              ↑ ONLY reset path; survives successful navigation

Render early-return (page.tsx:74):
  └── if (checkout-guard / loading / error): return null
        ↑ also consults isOrderInFlight
```

## File-by-File Change List

| File | Action | ~Lines | Satisfies |
|------|--------|--------|-----------|
| `src/app/checkout/page.tsx` | Modify | ~25 | R1, R2, R4 |
| `src/app/checkout/__tests__/page.test.tsx` | Modify (mutable mocks + 4 new tests + widened `onSuccess` ref) | ~90 | S1.1, S2.1, S2.2, S4.1 |
| `tests/e2e/checkout-order-upsert.spec.ts` | Modify (strict URL at 184–188; poll kept) | ~10 | R3/S3.1 |
| `useCreateOrder.ts` | **NOT touched** (verified against source) | 0 | R5 by construction |
| `CheckoutForm.tsx` | **NOT touched** | 0 | (out of scope) |
| `order-confirmation/page.tsx` | **NOT touched** | 0 | R3 contract preserved |
| `CartContext.tsx` | **NOT touched** | 0 | (out of scope) |
| `useCreateOrder.test.ts` (15 existing tests) | **NOT modified**, kept green | 0 | (regression guard) |

## Test Approach

### Per-requirement test map

| Requirement | Test type | File | Test name | RED/GREEN |
|-------------|-----------|------|-----------|-----------|
| R1 (guard) | Unit | `page.test.tsx` | `success_redirects_to_confirmation_and_never_to_tienda` | NEW |
| R1 (guard) | Unit | `page.test.tsx` | `isOrderInFlight_set_synchronously_before_createOrder` | NEW |
| R2 (mount policy) | Unit | `page.test.tsx` | `empty_cart_at_mount_redirects_to_tienda` | NEW |
| R2 (race window) | Unit | `page.test.tsx` | `clearCart_during_in_flight_does_not_trigger_tienda_push` | NEW |
| R3 (success URL) | E2E | `checkout-order-upsert.spec.ts` | `final URL strict assertion` | MODIFIED block |
| R4 (failure path) | Unit | `page.test.tsx` | `orderError_truthy_suppresses_navigation_and_resets_guard` | NEW |
| R5 (D-lock) | Unit + E2E | existing tests in `useCreateOrder.test.ts` + e2e payload asserts | (kept green) | KEPT |
| R5 (X-Trace-Id) | Unit | existing in `useCreateOrder.test.ts` | (kept green) | KEPT |
| R6 (error mapping) | Unit | existing in `useCreateOrder.test.ts` | (kept green) | KEPT |

### Race window deterministic test (S2.2)

The S2.2 scenario is timing-sensitive. The unit test simulates the race deterministically by:
1. Mounting `CheckoutPage` with a populated cart mock.
2. Capturing the `router.push` mock.
3. Invoking `handleSuccess` synchronously — this triggers the `setIsOrderInFlight(true)` + `createOrder` chain.
4. Resolving the `createOrder` promise with 200.
5. Asserting that after `clearCart` fires (mock the cart context to set `cartItems` to `[]` synchronously), `router.push` was called with `/order-confirmation?orderId=…` and NOT with `/tienda`.

The strict e2e URL assertion (S3.1) provides end-to-end coverage of the same race.

### Kept-green gate (must pass before apply exits)

- 6 existing page tests in `page.test.tsx`
- 15 existing hook tests in `useCreateOrder.test.ts`
- 409 existing e2e tests in `tests/e2e/`

## AGENT.md Compliance Check

- **Screaming Architecture** — feature/component boundaries preserved; route-layer (`src/app/checkout/page.tsx`) is the only delivery-side change.
- **Atomic Design** — no new components; flag is page-local state.
- **TypeScript interfaces** — flag is `useState<boolean>`; `onSuccess` mock ref widened to `(paymentIntent: unknown, orderId: string) => void` matching real `CheckoutFormProps`.
- **X-Trace-Id** — `useCreateOrder` untouched, so trace behavior preserved.
- **Friendly error mapping** — single `checkoutOrderErrors` point still routed.
- **Vitest command** — `npx vitest run --maxWorkers=2` per AGENT.md; tests run under this.
- **Form validation** — N/A.
- **PII protection** — N/A.

## Threat Matrix

N/A — no shell, subprocess, VCS, or process boundary touched. Single-component frontend change with no infra surface.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Stale `isOrderInFlight` after user back-navigates | Low | Mount-scoped state; dies with the instance |
| React 19 concurrent rendering tears the synchronous set | Low | `useState` commits synchronously in event handlers; `handleSuccess` runs in Stripe's `onSuccess` callback |
| E2E URL assertion flakiness | Low | `FAKE_ORDER_ID` is deterministic from the mocked payment-intent |
| Mock widening breaks 6 existing page tests | Low | Widening preserves default values; verified by reading the existing mock structure |
| D-lock contract regression | Very Low | `useCreateOrder` is not in the diff; existing assertions stay green |
| Rollback | Very Low | Single revert of `page.tsx` + `page.test.tsx` + e2e block; no DB or schema |

## Out of Scope (reaffirmed)

- Backend permissions (closed in F1).
- UPSERT contract (D-locked by parent cycle).
- Stripe retry policy.
- `checkoutOrderErrors` mapper refactor.
- `/order-confirmation` page redesign.
- Removing the unused `useCreateOrder.onSuccess` API — **deferred**. Preserved as a latent foot-gun for a future cleanup PR. Not load-bearing for this regression; removal has its own blast radius and is not on F2's critical path.

## Size Estimate

~125 changed lines (page.tsx ~25 + tests ~90 + e2e ~10). Comfortably under the 400-line review budget → **single PR, Low risk**.

## Open Architectural Decisions

**None.** Direction pre-approved; spec records no open architectural decisions.
