# Specification: checkout-error-display (delta)

## Purpose

Extend the existing `checkout-error-display` capability to cover HTTP, network, and JSON-parse failures from the `api/create-payment-intent` route in `CheckoutForm`, in addition to the already-covered Stripe SDK errors. The current implementation passes raw backend error text directly to the user-facing `<ErrorMessage>`, violating AGENT.md:51 (frontend rule requiring all backend errors to be mapped before reaching users).

This delta is additive to the existing requirement block. The original requirement "Friendly Error Mapping for Stripe Codes" and its two scenarios remain unchanged.

## Requirements

### Requirement: Payment-Intent Friendly Error Mapping

A pure function `paymentIntentErrors(status: number, body: unknown): string` MUST exist in `src/features/checkout/utils/checkoutPaymentErrors.ts` that maps every `api/create-payment-intent` failure mode to friendly Spanish copy. The function MUST NOT return any raw backend string from `body.error`, `body.message`, or nested `body.error.message`.

Branch precedence is **status-first** (5xx wins over 4xx wins over 0/network):

- **HTTP 5xx (500, 502, 503, 504)**: MUST return `STRIPE_ERROR_MESSAGES.api_error`.
- **HTTP 4xx**: MUST return fixed Spanish copy keyed to the status code:
  - 400 → validation copy ("No pudimos procesar tu método de pago. Verificá los datos e intentá nuevamente.")
  - 401 → session copy
  - 403 → permission copy
  - 429 → rate-limit copy
  - other 4xx → generic validation fallback
- **HTTP status 0 / undefined / NaN** (network failure, fetch throw, abort): MUST return `STRIPE_ERROR_MESSAGES.network_error`.
- **Unparseable body** (when `response.json()` throws): the caller passes `undefined`; the mapper returns the appropriate Spanish fallback for the status.

#### Scenario: 500 Internal Server Error surfaces as Spanish copy

- GIVEN the `api/create-payment-intent` route returns HTTP 500 with body `{ error: 'Internal Server Error' }`
- WHEN `paymentIntentErrors(500, body)` is called
- THEN the return value equals `STRIPE_ERROR_MESSAGES.api_error` exactly
- AND the return value does NOT contain the substring `'Internal Server Error'`.

#### Scenario: 400 surfaces as Spanish validation fallback

- GIVEN body `{ error: 'malformed request' }`
- WHEN `paymentIntentErrors(400, body)` is called
- THEN the return value is a Spanish validation fallback.
- AND the return value does NOT contain `'malformed request'`.

#### Scenario: Network failure surfaces as Spanish network copy

- GIVEN `status = 0` (fetch threw)
- WHEN `paymentIntentErrors(0, undefined)` is called
- THEN the return value equals `STRIPE_ERROR_MESSAGES.network_error`.

#### Scenario: Parse failure handled by caller

- GIVEN `response.json()` throws (network mid-response, truncated body, etc.)
- WHEN the caller catches and calls `paymentIntentErrors(response.status ?? 0, undefined)`
- THEN the return value is a Spanish fallback appropriate for the status.

### Requirement: CheckoutForm Integration

`CheckoutForm.tsx` MUST call `paymentIntentErrors` after every `api/create-payment-intent` fetch failure (HTTP 4xx/5xx, network throw, parse throw) before invoking `onError`. The `response.json()` call MUST be wrapped (`.catch(() => undefined)`) so parse failure routes through the mapper, not a raw throw.

The `R7` callback signature `(localizedMessage: string) => void` MUST remain unchanged — the change is in WHAT is passed (always localized), not in HOW.

#### Scenario: 500 propagates Spanish through onError

- GIVEN `CheckoutForm` submits payment
- WHEN `api/create-payment-intent` returns 500 with `{ error: 'Internal Server Error' }`
- THEN `<ErrorMessage>` (in the page that owns the alert) renders the `STRIPE_ERROR_MESSAGES.api_error` Spanish copy
- AND the literal text `'Internal Server Error'` does NOT appear in the DOM.

#### Scenario: Network throw propagates Spanish network copy

- GIVEN `CheckoutForm` submits payment
- WHEN the fetch throws (network failure)
- THEN `<ErrorMessage>` renders `STRIPE_ERROR_MESSAGES.network_error`.

### Requirement: Public API Exposure

`paymentIntentErrors` MUST be exported from `src/features/checkout/index.ts` for parity with `checkoutOrderErrors`.

#### Scenario: Module resolution succeeds

- GIVEN any consumer
- WHEN `import { paymentIntentErrors } from '@/features/checkout'` is executed
- THEN the import resolves without error.

### Requirement: Unit Coverage and No-Leak Guarantee

Unit tests MUST cover all four branches (5xx, 4xx, network, parse) AND a defensive case proving that the raw text `'Internal Server Error'` from any input body shape (flat `error`, top-level `message`, nested `error.message`) NEVER appears in the mapper output.

#### Scenario: Defensive no-leak under saturated body

- GIVEN input body `{ error: 'Internal Server Error', message: 'Internal Server Error', error: { message: 'Internal Server Error' } }`
- WHEN `paymentIntentErrors(500, body)` is called
- THEN the return value does NOT contain the substring `'Internal Server Error'`.

### Modified Requirement: Friendly Error Mapping for Stripe Codes

The existing requirement block (originally covering Stripe SDK errors via `handleStripeError` at `CheckoutForm.tsx:166-173`) is now extended in scope to also cover the payment-intent HTTP/network/parse failures via `paymentIntentErrors`. The original requirement text and its two scenarios remain unchanged. The new delta adds the payment-intent mapper as an additional surface for friendly mapping in the same flow.

### Requirement: Existing UPSERT Mapping Isolation

The `checkoutOrderErrors` mapper for the order UPSERT flow MUST remain untouched. This change is additive to the checkout error display contract.

#### Scenario: Existing checkoutOrderErrors tests untouched

- GIVEN the existing `checkoutOrderErrors` unit tests
- WHEN this change lands
- THEN all existing tests pass without modification.

## Out of Scope

- `useCreateOrder.ts:137-143` catch leak (separate ticket, F8 candidate)
- `payment-errors.spec.ts` Test 2 (unauthenticated redirect; F9 candidate)
- Backend error response redesign
- Login/register error flows
- Global error boundaries
- Toast notifications vs inline alert UX decisions

## Acceptance Criteria Recap

1. AC1: After `500 { error: 'Internal Server Error' }`, `<ErrorMessage>` shows `STRIPE_ERROR_MESSAGES.api_error`; raw text absent from DOM
2. AC2: After `400 { error: 'malformed request' }`, mapper returns Spanish validation copy (unit)
3. AC3: After fetch throws, mapper returns `STRIPE_ERROR_MESSAGES.network_error` (unit)
4. AC4: After `.json()` throws, mapper returns Spanish parse copy (unit)
5. AC5: `payment-errors.spec.ts` Test 1 is live and passing
6. AC6: `paymentIntentErrors` exported from `src/features/checkout/index.ts`
7. AC7: R6 kept-green — `useCreateOrder`, `useCheckout`, page tests, `checkout-order-upsert.spec.ts`, `favorites-error-feedback.spec.ts` pass untouched
8. AC8: Triple gate (`vitest --maxWorkers=2`, `tsc --noEmit`, `npm run build`) all exit 0

## Open Architectural Decisions

None. Strict fixed-copy approach pre-resolved in proposal as the default (D1).
