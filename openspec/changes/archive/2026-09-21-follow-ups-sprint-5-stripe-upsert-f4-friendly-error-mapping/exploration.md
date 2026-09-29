# Exploration: follow-ups/sprint-5-stripe-upsert/F4-friendly-error-mapping

## Current State

`AGENT.md:51` requires backend errors to be mapped to friendly user-facing copy before reaching the UI. The CheckoutForm payment-intent flow currently bypasses this rule.

### Raw-error path

- `src/features/checkout/components/CheckoutForm.tsx:69-82` fetches `api/create-payment-intent` and throws `errorData.error` verbatim when the response is non-2xx.
- `src/features/checkout/components/CheckoutForm.tsx:89-94` forwards `error.message` unchanged through `onError`.
- `src/app/checkout/page.tsx:88-90` stores it as `paymentError`.
- `src/app/checkout/page.tsx:96-103` renders it directly via `<ErrorMessage>`.
- `src/features/checkout/components/CheckoutForm.tsx:166-173` already maps Stripe SDK errors via `handleStripeError` (existing correct pattern to mirror).

`useCreateOrder` correctly maps UPSERT errors at `useCreateOrder.ts:106-114`, but its defensive catch path at `useCreateOrder.ts:137-143` still interpolates raw `error.message` (separate compliance gap, tracked as F8 follow-up).

### Existing mappers (both wrong for payment-intent)

- `src/features/checkout/utils/checkoutOrderErrors.ts:1-101` — designed for order UPSERT. Default fallback at line 79-81 says "tu pago fue procesado pero no pudimos registrar tu orden", which is semantically false for payment initialization (no charge exists yet).
- `src/lib/api.ts:38-55` — general status-based mapper. Its 400 branch at line 44-50 echoes nested Strapi `error.message` (own leak).

### Backend response shape

- `src/app/api/create-payment-intent/route.ts:24-53` returns flat `{ error: string }`.
- `createPaymentIntentService.ts:41-47, 53-59, 95-101, 157-163` returns flat `error` strings.
- `validate-request.ts:18-23, 46-60` returns flat auth/session errors.

The backend already emits Spanish copy in most cases (e.g., `INSUFFICIENT_STOCK`). Infra-level 500s and network failures are the gap.

### Skipped `payment-errors.spec.ts`

- `tests/e2e/payment-errors.spec.ts:21-25` skip comment cites:
  - Pre-existing breakage after `#127` CartContext refactor
  - Secondary test pollution
  - Second test reportedly passes only after the first test's failed attempt
- Test 1 (lines 26-48): mocks `api/create-payment-intent` with `500 { error: 'Internal Server Error' }` and asserts the raw string at line 48 — **encodes the AGENT.md violation directly**.
- Test 2 (lines 51-61): only validates unauthenticated checkout redirection. Unrelated to error mapping.

### Related patterns

- `src/lib/api.ts:141-152` — `fetchApiFull` demonstrates mapping before throwing.
- `src/lib/api/__tests__/api-security.test.ts:85-119` — verifies friendly 500/401/403 output.
- `src/lib/stripe/errorHandler.ts:80-138` — maps Stripe SDK errors to localized copy.
- `src/components/ui/ErrorMessage.tsx:47-83` — accessible alert semantics.
- `tests/e2e/favorites-error-feedback.spec.ts:36-54, 78-94` — verifies friendly UI text, alert semantics, and retry behavior.
- `tests/e2e/checkout-order-upsert.spec.ts:227-262` — already covers friendly 409 order persistence errors.
- `tests/e2e/checkout-order-upsert.spec.ts:113-140` — proven cart-priming pattern (used by F4 Test 1).

### Affected Areas

- `src/features/checkout/components/CheckoutForm.tsx:69-100` — raw payment-intent error propagation.
- `src/app/checkout/page.tsx:88-103` — renders forwarded text in the user-facing alert.
- `src/features/checkout/utils/checkoutOrderErrors.ts:1-101` — existing UPSERT-specific mapper (do NOT reuse).
- `src/features/checkout/index.ts:7` — exports `checkoutOrderErrors`; will add `paymentIntentErrors` next to it.
- `src/app/api/create-payment-intent/route.ts:24-53` — returns flat `{ error: string }` responses.
- `tests/e2e/payment-errors.spec.ts:21-61` — both tests currently skipped; Test 1 is F4 scope.
- `src/lib/api.ts:38-55` — existing general/status mapper, currently unused by checkout.

## Approaches Evaluated

1. **Dedicated payment-intent mapper** — new pure function for HTTP/network/parse failures. Correct payment-specific semantics, handles flat and nested envelopes safely, easy unit coverage. Recommended.
2. **Reuse `mapApiError` directly** — minimal code, existing status coverage. Rejected: generic catalog wording; network errors need separate handling; nested Strapi 400 branch can expose `error.message`.
3. **Generalize `checkoutOrderErrors`** — add payment-intent modes. Rejected: couples unrelated order-persistence and payment-initialization semantics; increases regression risk.
4. **Normalize only in the route** — ensure `api/create-payment-intent` always returns friendly text. Rejected: insufficient protection; mocked/malformed/future backend responses can still leak.

## Out of Scope

- `useCreateOrder.ts:137-143` catch leak → F8 candidate
- `payment-errors.spec.ts` Test 2 (unauthenticated redirect) → F9 candidate
- Backend error response redesign
- Login/register error flows
- Global error boundaries
- Toast notifications vs inline alert UX
- Reusing `checkoutOrderErrors` or `mapApiError`
