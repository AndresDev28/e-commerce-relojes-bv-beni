# Delta: Checkout Error Display

## Purpose

Slice B adds a page-owned payment-error alert for the `/checkout` Stripe flow, replacing the silent `handleError = () => {}` swallow with a page-level `<ErrorMessage>` driven by `handleStripeError`. The form's inline alert is suppressed when the page takes over, so the user sees exactly one localized alert per payment failure. Cross-references `api-traceability` for `X-Trace-Id` propagation.

## Requirements

### Requirement: Single Page-Level Payment Error Alert

The `/checkout` page MUST render exactly one visible `<ErrorMessage>` as the canonical surface for Stripe payment failures. `CheckoutForm` MUST NOT render its own inline `<ErrorMessage>` for the same event. When `CheckoutForm.onError(localizedMessage)` fires, the page MUST update its error state with the already-localized Spanish string and render the alert.

#### Scenario: Declined card surfaces one localized alert

- GIVEN the user is on `/checkout` with a valid session and items in the cart
- WHEN the Stripe SDK reports `code: 'card_declined'` and `CheckoutForm.onError(localizedMessage)` fires
- THEN the page MUST render exactly one visible `<ErrorMessage>` with the mapped Spanish text
- AND the form's internal `<ErrorMessage>` MUST NOT render the same text
- AND the raw Stripe English text MUST NOT appear in the visible DOM

#### Scenario: Network or API error surfaces retry-friendly alert

- GIVEN the Stripe SDK reports `api_error` or `timeout` during checkout
- WHEN `CheckoutForm.onError(localizedMessage)` fires with the mapped Spanish text
- THEN the page MUST render an `<ErrorMessage>` with that text
- AND the rendered text MUST come from `STRIPE_ERROR_MESSAGES[code]` or `DEFAULT_ERROR_MESSAGE` for unknown codes

#### Scenario: Order-creation failure uses separate banner

- GIVEN the payment succeeds but `useCreateOrder` reports a 5xx via `orderError`
- WHEN the user reads the page
- THEN the page MUST render the existing inline `orderError` block
- AND the page-level payment-error alert MUST NOT render
- AND the `orderError` banner MUST remain visually unchanged by this change

### Requirement: ErrorMessage Component Contract

`ErrorMessage` MUST accept a `message: string` prop and an optional `variant: 'error' | 'warning' | 'info'` (default `'error'`). It MUST expose an accessible role and live region: `error` → `role="alert"` + `aria-live="assertive"`; `warning` and `info` → `role="status"` + `aria-live="polite"`.

#### Scenario: Renders passed message text

- GIVEN `<ErrorMessage message="Mi tarjeta fue rechazada" />`
- WHEN the component is rendered
- THEN the visible text "Mi tarjeta fue rechazada" MUST be present
- AND it MUST be reachable via `getByText(...)`

#### Scenario: Default variant exposes alert semantics

- GIVEN `<ErrorMessage message="X" />` (no variant)
- WHEN the component is rendered
- THEN the root element MUST have `role="alert"` and `aria-live="assertive"`

#### Scenario: Non-error variant exposes status semantics

- GIVEN `<ErrorMessage message="X" variant="warning" />`
- WHEN the component is rendered
- THEN the root element MUST have `role="status"` and `aria-live="polite"`
- AND it MUST NOT have `role="alert"`

### Requirement: Trace ID Preservation Through Error Path

Every API call from the checkout error path — including `CheckoutForm`'s `/api/create-payment-intent` fetch and any retry — MUST include an `X-Trace-Id` header. Cross-references `api-traceability` Requirement "Trace Id on Outgoing API Calls" (already mandates this for `src/lib/api.ts`). The checkout error path MUST honor the same contract.

#### Scenario: Payment-intent request carries trace id

- GIVEN `CheckoutForm` triggers a payment
- WHEN the form fetches `/api/create-payment-intent`
- THEN the request MUST include an `X-Trace-Id` header
- AND any retry via `retryWithBackoff` within the same submission MUST reuse the same trace id

### Requirement: Friendly Error Mapping for Stripe Codes

The page-level error alert MUST render only friendly Spanish strings from `STRIPE_ERROR_MESSAGES` (or `DEFAULT_ERROR_MESSAGE` for unknown codes). Raw Stripe codes (`card_declined`, `insufficient_funds`, `expired_card`, etc.) and raw English error messages MUST NOT appear in the visible DOM.

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
