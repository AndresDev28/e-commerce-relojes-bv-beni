# Design: Slice B (DEBT-05 conductual)

## Context

This design implements Slice B of DEBT-05: the conductual / behavioral follow-ups (#3 Stripe provider consolidation, #5 silent error swallow, #8 page-interface convention) that were intentionally deferred from Slice A (PR #77, 2026-07-23). It locks in D1 (page-owned `<ErrorMessage>` for `/checkout`, form silent), D2 (single PR, ~150-250 lines), D3 (`retryHandler.ts` logs out of scope), and D4 (`ErrorMessage` smoke test — see WU-4.4 verdict below). Headline risks: provider-instance drift (mitigated by WU-3.1 RED test), UX duplication (mitigated by WU-4.3 form suppression), and `paymentError` state staleness (mitigated by R8 clear-on-retry).

## Goals / Non-Goals

**Goals**
- **WU-3.1**: RED test proving `CheckoutForm` reads Stripe context from the layout-level `StripeProviderWrapper` (no page-level `<Elements>`).
- **WU-3.2**: Remove redundant `loadStripe` / `Elements` / `<Elements>` / `getStripePublishableKey` from `src/app/checkout/page.tsx`; rely on `RootLayout → StripeProviderWrapper`.
- **WU-3.3**: Prepend `@remarks` JSDoc to 7 prop-less pages (see Component Changes).
- **WU-4.1**: RED test — mock `CheckoutForm`, fire `onError(localizedMessage)`, assert page renders one localized `<ErrorMessage>`.
- **WU-4.2**: Page-level `<ErrorMessage>` driven by `paymentError` state set from `CheckoutForm.onError`.
- **WU-4.3**: `CheckoutForm` suppresses internal `setErrorMessage`/`setErrorSuggestion` when `onError` is provided.
- **WU-4.4**: Verify existing `src/components/ui/__tests__/ErrorMessage.test.tsx` (14 tests) still passes — no new tests needed.

**Non-Goals**
- `src/lib/stripe/retryHandler.ts` console.log cleanup (D3).
- `useCreateOrder`'s `orderError` banner normalization (`src/app/checkout/page.tsx:87-116`).
- Backend changes.
- Route guard changes.
- JSDoc lint rule (review-time only).

## Architecture Overview

```
RootLayout (src/app/layout.tsx)
  └── CartProvider
      └── AuthProviderWrapper
          └── FavoritesProvider
              └── StripeProviderWrapper           [singleton getStripe()]
                  └── AppShell
                      └── children
                          └── /checkout page       [no <Elements>, owns <ErrorMessage>]
                              └── CheckoutForm     [silent — calls onError(string)]
```

**Error state flow**: `CheckoutForm` calls `onError(localizedMessage)` → page's `setPaymentError` → page renders `<ErrorMessage variant="error" message={paymentError} role="alert" aria-live="assertive" />`. The form no longer renders its own `<ErrorMessage>`.

## Component Changes

### WU-3.1 + WU-3.2 — Stripe provider consolidation

- **Singleton import**: `import { getStripe } from '@/lib/stripe/client'` (module-level memoization, `src/lib/stripe/client.ts:49`).
- **Provider mount**: `<StripeProviderWrapper>` is rendered at `src/app/layout.tsx:42` inside the FavoritesProvider. Already wraps the entire tree.
- **File**: `src/app/checkout/page.tsx`. **Delete**: lines 17 (`loadStripe`), 19 (`Elements`), 20 (`getStripePublishableKey`), 22-27 (`getStripePromise`), 37 (`useState`), 125-132 (`<Elements stripe=...>`). Imports collapse to just `PaymentIntent` type.

### WU-3.3 — JSDoc convention on 7 prop-less pages

Template (prepended above each `export default function`):

```tsx
/**
 * @remarks
 * Route-level page component. Prop-less by design — derives all data from
 * hooks/contexts (e.g., useAuth, useCart) per the "pages own no props"
 * convention (DEBT-05 #8). Renders UI only; no business logic.
 */
```

| File | Default export |
|---|---|
| `src/app/page.tsx` | `Home` |
| `src/app/carrito/page.tsx` | `CartPage` |
| `src/app/favoritos/page.tsx` | `FavoritesPage` |
| `src/app/checkout/page.tsx` | `CheckoutPage` |
| `src/app/(auth)/login/page.tsx` | `LoginPage` |
| `src/app/(auth)/registro/page.tsx` | `RegisterPage` |
| `src/app/mi-cuenta/pedidos/page.tsx` | `OrdersPage` |

### WU-4.1 — RED test (greenfield)

- **File**: `src/app/checkout/__tests__/page.test.tsx` (CREATE).
- **Mocks**: `vi.mock('@/features/checkout', ...)` exposes a stub `CheckoutForm` that captures the `onError` prop; `vi.mock('next/navigation', ...)` for `useRouter`.
- **Asserts** (must FAIL initially):
  1. Captured `onError` is a function.
  2. Calling it with `handleStripeError({ code: 'card_declined', ... }).localizedMessage` updates the page DOM.
  3. The page renders `<ErrorMessage>` with the mapped Spanish text (`getByText`); raw `"Your card was declined."` is absent (`queryByText` returns null).
  4. `<Elements>` is NOT present in the page tree (verifies WU-3.2).

### WU-4.2 — Page-level `<ErrorMessage>`

- **File**: `src/app/checkout/page.tsx`. Replace `handleError = (_error: string) => {}` (line 76) with:

```tsx
const [paymentError, setPaymentError] = useState<string | null>(null)
const handleError = useCallback((error: string) => {
  setPaymentError(error)
  // Clear stale error when the user retries submission.
  setPaymentError(null) // (debounced; see R8)
}, [])
```

Render `{paymentError && <ErrorMessage variant="error" message={paymentError} className="mb-6" />}` between the breadcrumbs and the `<h1>` (line 83).

### WU-4.3 — `CheckoutForm` silent

- **File**: `src/features/checkout/components/CheckoutForm.tsx`. At line 153 (existing `handleStripeError(error)` call), wrap the `setErrorMessage`/`setErrorSuggestion` calls (lines 154-156) and the inline `<ErrorMessage>` render (lines 199-209) behind an `if (!onError)` guard. The `onError?.(processedError.localizedMessage)` call (line 157) remains unconditional — it is the page's signal.

### WU-4.4 — `ErrorMessage` coverage verdict

**`src/components/ui/__tests__/ErrorMessage.test.tsx` already exists** with 14 tests covering every R-CED-2 scenario:

| R-CED-2 scenario | Existing test(s) |
|---|---|
| Renders passed message text | `Basic render > should render error message with text` (lines 8-13) |
| Default variant exposes alert semantics | `Basic render > default error variant` (15-21) + `Accesibilidad > role="alert"` (102-106) + `aria-live="assertive"` (120-127) |
| Non-error variant exposes status semantics | `Variants > warning` (34-41), `info` (43-50) + `Accesibilidad > role="status"` (108-118) + `aria-live="polite"` (129-136) |

**Action**: WU-4.4 = verify existing tests still pass under the new import surface. Do NOT add new tests — D4 is REDUNDANT given existing coverage.

## Data Flow

1. User clicks "Pay" → `CheckoutForm.handleSubmit` calls `stripe.confirmPayment(...)`.
2. Stripe SDK responds with `{ error: { code, message } }`.
3. `CheckoutForm` runs `handleStripeError(error)` → `{ localizedMessage, suggestion? }` from `STRIPE_ERROR_MESSAGES` (or `DEFAULT_ERROR_MESSAGE`).
4. `CheckoutForm` invokes `onError?.(processedError.localizedMessage)`. Internal `setErrorMessage`/`setErrorSuggestion` are skipped (WU-4.3).
5. Page receives the callback → `setPaymentError(localizedMessage)`.
6. Page re-renders → `<ErrorMessage variant="error" message={paymentError} />` (single alert, `role="alert"`, `aria-live="assertive"`).
7. `X-Trace-Id` preserved on the `/api/create-payment-intent` call (handled by `src/lib/api.ts`, cross-ref `api-traceability`).

## Testing Strategy

- **Strict TDD**: WU-4.1 RED first → WU-4.2 + WU-4.3 (turn GREEN).
- **Command**: `npx vitest run --maxWorkers=2` (mandatory per `AGENT.md`).
- **Tests added**: WU-4.1 (page integration, greenfield) + WU-4.4 = 0 new test files (verify existing 14).
- **Tests NOT added**: provider singleton is hard to integration-test; rely on layout-level singleton verification + manual smoke in dev (Stripe test-mode declined card).
- **Accessibility**: RED test asserts `role="alert"` is present exactly once on payment-error (R-CED-2 + D1).

## Risks

| ID | Severity | Mitigation |
|---|---|---|
| **R2** Provider-instance drift | Low-Med | WU-3.1 RED test asserts no `<Elements>` on the page; layout singleton is the source of truth. |
| **R3** JSDoc convention drift | Low | Review-time only; recommend a follow-up lint rule (out of scope). |
| **R7** `CheckoutForm.onError` signature stability | New, Low | Document in JSDoc above `CheckoutForm`: `onError?: (localizedMessage: string) => void`. Future slices must not change the shape. |
| **R8** `paymentError` staleness after successful retry | New, Low-Med | Spec implementation: clear `paymentError` at the start of every `handleSubmit` invocation (set to `null` before `stripe.confirmPayment`). Prevents a stale alert after a successful retry. |

## Commit Order

1. **Commit 1** — WU-3 (provider consolidation + JSDoc). Mechanical, low risk, GREEN first to lock the layout-context contract.
2. **Commit 2** — WU-4.1 RED test. Fails. Locks the contract: one localized alert, no raw Stripe text, no `<Elements>` on the page.
3. **Commit 3** — WU-4.2 + WU-4.3 (page-level `<ErrorMessage>` + form suppression). Turns the RED GREEN. Focused UX review surface.
4. **Commit 4** — WU-4.4 verification commit (no file change expected; CI run shows the 14 existing tests still pass).

Rationale: cheap mechanical first, RED second (locks the contract before any UX code lands), GREEN+refactor last. Avoids reviewers context-switching between Stripe internals and UX in the same commit.

## Out of Scope

- `src/lib/stripe/retryHandler.ts` console.log cleanup (D3) — 6 diagnostic logs, same family as DEBT-05 #1, explicitly deferred.
- `useCreateOrder`'s `orderError` banner normalization — cosmetic, separate concern.
- Backend changes — none required.
- JSDoc lint rule — review-time convention only.

## Open Questions

None. All exploration open questions resolved by locked decisions D1-D4. R7 and R8 are documented design risks, not blockers.
