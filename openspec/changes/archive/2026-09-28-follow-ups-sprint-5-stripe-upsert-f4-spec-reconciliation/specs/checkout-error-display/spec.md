# Delta for checkout-error-display

## Purpose

This delta reconciles the canonical `checkout-error-display` capability with the F4 friendly-error-mapping implementation that shipped on 2026-09-21. The F4 implementation (Payment-Intent friendly mapper, CheckoutForm integration, public API exposure, unit coverage, and UPSERT isolation) is already merged on the `main` branch, but its delta Requirements were never promoted to the canonical base spec. This delta closes that documentation gap without reopening any implementation decisions or changing shipped behavior.

This change is **docs-only**: no code, no tests, no contract changes. The five ADDED Requirements and one MODIFIED Requirement below describe behavior that is already implemented and shipped.

## ADDED Requirements

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

The `onError` callback signature `(localizedMessage: string) => void` MUST remain unchanged — the change is in WHAT is passed (always localized), not in HOW.

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

### Requirement: Existing UPSERT Mapping Isolation

The `checkoutOrderErrors` mapper for the order UPSERT flow MUST remain untouched. This change is additive to the checkout error display contract.

#### Scenario: Existing checkoutOrderErrors tests untouched

- GIVEN the existing `checkoutOrderErrors` unit tests
- WHEN this change lands
- THEN all existing tests pass without modification.

## MODIFIED Requirements

### Requirement: Friendly Error Mapping for Stripe Codes

The page-level error alert MUST render only friendly Spanish strings from `STRIPE_ERROR_MESSAGES` (or `DEFAULT_ERROR_MESSAGE` for unknown codes). Raw Stripe codes (`card_declined`, `insufficient_funds`, `expired_card`, etc.) and raw English error messages MUST NOT appear in the visible DOM.

(Previously: covered only Stripe SDK friendly mapping via `handleStripeError` and the order-creation defensive catch (S-MOD.8). Now also extends to payment-intent HTTP 5xx / HTTP 4xx / network (status 0) / parse failures via `paymentIntentErrors`, preserving all prior scenario contracts as additive rather than replacement.)

#### Scenario: Known Stripe code maps to localized Spanish string

- GIVEN `handleStripeError({ type: 'card_error', code: 'card_declined', message: 'Your card was declined.' })`
- WHEN the page-level error state updates with the resulting `localizedMessage`
- THEN the rendered alert MUST contain the Spanish text from `STRIPE_ERROR_MESSAGES['card_declined']`
- AND the raw English text "Your card was declined." MUST NOT appear in the visible DOM

#### Scenario: Unknown code falls back to default message

- GIVEN `handleStripeError({ type: 'unknown_error', code: 'totally_unmapped', message: 'Some raw English' })`
- WHEN the page-level error state updates
- THEN the rendered alert MUST contain `DEFAULT_ERROR_MESSAGE`
- AND neither the raw code value nor the raw English message MUST appear in the visible DOM

#### Scenario: Outer defensive catch in useCreateOrder.createOrder does not leak error.message (S-MOD.8, F8)

- GIVEN `useCreateOrder.createOrder` is invoked and `doCreateOrder` throws an `Error` whose `message` contains a non-user-facing substring (an internal path, a stack frame line, a URL, or a Stripe SDK error string)
- WHEN the outer `try/catch` in `createOrder` runs
- THEN `setOrderError` MUST be called with `checkoutOrderErrors(0, null, { paymentIntentId })` — the friendly fallback copy
- AND the resulting `orderError` banner MUST NOT contain any substring of `error.message`
- AND the resulting `orderError` MUST NOT contain any stack frame line, URL path, or Stripe API string
- AND the resulting `orderError` MUST be byte-identical to the banner produced by the transport-fail branch for the same `paymentIntentId` — the catch is a true defensive net, not a divergent path

#### Scenario: Payment-intent friendly mapping extends the R4 scope (S-MOD.9, F4)

- GIVEN the `paymentIntentErrors(status, body)` mapper at `src/features/checkout/utils/checkoutPaymentErrors.ts` covers HTTP 5xx, HTTP 4xx, network (status 0), and parse failures from `api/create-payment-intent`
- WHEN `CheckoutForm.tsx` submits a payment and the fetch fails (HTTP 4xx/5xx, network throw, parse throw)
- THEN `CheckoutForm` MUST route the error through `paymentIntentErrors` and pass the resulting friendly Spanish copy to `onError(localizedMessage)` — never the raw backend `body.error`, `body.message`, or nested `body.error.message`
- AND this scenario is ADDITIVE to the existing R4 scenarios (including S-MOD.8) — the Stripe SDK friendly-mapping contract remains unchanged
- AND cross-references the F4 delta spec archived at `openspec/changes/archive/2026-09-21-follow-ups-sprint-5-stripe-upsert-f4-friendly-error-mapping/specs/checkout-error-display/spec.md` for the full F4 scope-extension text

## REMOVED Requirements

None.

## RENAMED Requirements

None.

## Acceptance Criteria Recap

- `openspec/specs/checkout-error-display/spec.md` grows from 206 lines to the final post-append count (expected to land around 320 lines).
- The canonical `checkout-error-display` spec ends with exactly 11 requirements.
- Every F4 ADDED requirement and scenario is present in the canonical spec using verbatim text from the archived F4 delta.
- Existing `R4` contains a new additive scenario `S-MOD.9, F4` documenting the scope extension to payment-intent failures.
- Existing `S-MOD.8` remains byte-identical to the current base spec lines 89-96.
- No standalone requirement named `R5: onError Contract Preserved` is introduced; that contract remains covered within `R8` (= F4 R2 CheckoutForm Integration) scenarios.
- Triple gate green at apply time: `npx vitest run --maxWorkers=2`, `npx tsc --noEmit`, `npm run build` all exit 0 (confirms zero collateral damage despite docs-only change).
