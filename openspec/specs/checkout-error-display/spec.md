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

#### Scenario: Outer defensive catch in useCreateOrder.createOrder does not leak error.message (S-MOD.8, F8)

- GIVEN `useCreateOrder.createOrder` is invoked and `doCreateOrder` throws an `Error` whose `message` contains a non-user-facing substring (an internal path, a stack frame line, a URL, or a Stripe SDK error string)
- WHEN the outer `try/catch` in `createOrder` runs
- THEN `setOrderError` MUST be called with `checkoutOrderErrors(0, null, { paymentIntentId })` — the friendly fallback copy
- AND the resulting `orderError` banner MUST NOT contain any substring of `error.message`
- AND the resulting `orderError` MUST NOT contain any stack frame line, URL path, or Stripe API string
- AND the resulting `orderError` MUST be byte-identical to the banner produced by the transport-fail branch for the same `paymentIntentId` — the catch is a true defensive net, not a divergent path

### Requirement: Order Upsert Retry Contract (F8)

The order-upsert flow inside `useCreateOrder.doCreateOrder` MUST retry the PUT against `/api/orders/by-order-id/:orderId` on transient outcomes only. The retry contract MUST hold:

- Retry triggers MUST be limited to network throws (fetch rejects, abort errors) and HTTP 5xx responses (500, 502, 503, 504).
- HTTP 4xx (including 400, 401, 403, 404) MUST NOT trigger a retry — those responses are terminal and the existing mapper handles them.
- HTTP 409 MUST NOT trigger a retry (F4 invariant: a 409 reaching the browser is already post-convergence, see `checkoutOrderErrors` 409 branch).
- The total number of attempts MUST be capped at 3 (one initial plus up to two retries).
- The retry loop MUST re-send the same `wireBody` (same `userId`, `paymentIntentId`, `items`, `subtotal`, `shipping`, `paymentInfo`) and the same `orderId` path parameter on every attempt — D-lock invariant.
- Each attempt MUST carry a fresh `X-Trace-Id` from `newTraceId()` — A-4 invariant.
- `isCreatingOrder` MUST stay `true` across all retry attempts (no flicker) and MUST transition to `false` only on the final outcome (success or terminal failure).
- `clearCart` and `onSuccess` MUST fire exactly once and only on the final 2xx; they MUST NOT fire on any non-final-success path (retry exhausted, 4xx, 409).
- Backoff between attempts MUST be exponential with a base delay of at least 500 ms.

#### Scenario: S-RET.1 — network throw triggers retry

- GIVEN the PUT to `/api/orders/by-order-id/:orderId` rejects with a network error on attempt 1
- WHEN the retry loop runs
- THEN attempt 2 fires the same PUT with the same `orderId` and a fresh `X-Trace-Id`
- AND on attempt 2 returning 2xx, `orderError` stays `null`
- AND `clearCart` and `onSuccess` (when provided) fire exactly once after attempt 2

#### Scenario: S-RET.2 — 5xx retries up to 3 attempts then succeeds

- GIVEN the PUT returns HTTP 503 on attempt 1, HTTP 503 on attempt 2, and HTTP 200 on attempt 3
- WHEN the retry loop completes
- THEN `orderError` MUST be `null`
- AND `clearCart` MUST have fired exactly once
- AND `onSuccess` MUST have fired exactly once with the server orderId

#### Scenario: S-RET.3 — 409 is terminal, never retried

- GIVEN the PUT returns HTTP 409 on attempt 1
- WHEN the retry loop checks the response
- THEN no second attempt fires
- AND `orderError` MUST equal the 409 copy from `checkoutOrderErrors` (the conflict copy for the matching `paymentIntentId`)
- AND `clearCart` MUST NOT have fired

#### Scenario: S-RET.4 — 4xx is terminal, never retried

- GIVEN the PUT returns HTTP 400 on attempt 1
- WHEN the retry loop checks the response
- THEN no second attempt fires
- AND `orderError` MUST equal the 400 copy from `checkoutOrderErrors`

#### Scenario: S-RET.5 — exhausted retries surface the friendly fallback banner

- GIVEN the PUT fails three times with HTTP 5xx (or three times with network errors, or a mix)
- WHEN the retry loop exhausts
- THEN `orderError` MUST equal the fallback copy returned by `checkoutOrderErrors(0, null, { paymentIntentId })`
- AND `orderError` MUST NOT contain any raw status code, response body substring, or stack trace fragment
- AND `isCreatingOrder` MUST be `false`
- AND `clearCart` MUST NOT have fired

#### Scenario: S-RET.6 — D-lock wire body preserved across retries

- GIVEN the retry loop fires attempt 2 after attempt 1 fails with a transient outcome
- WHEN attempt 2 sends its PUT
- THEN the request body MUST equal the attempt-1 body byte-for-byte (same `userId`, same `paymentIntentId`, same `items`, same `subtotal`, same `shipping`, same `paymentInfo`)
- AND the URL path MUST contain the same `orderId`
- AND the `X-Trace-Id` header MUST differ from attempt 1 (fresh trace per attempt)

#### Scenario: S-RET.7 — isCreatingOrder stays true across retries

- GIVEN the PUT is in its retry window
- WHEN any consumer reads `isCreatingOrder`
- THEN the value MUST be `true` (no false-true transitions between attempts)
- AND the value transitions to `false` exactly once, after the final outcome

### Requirement: Unauthenticated Visitor Redirect

When an unauthenticated visitor navigates to `/checkout`, the page MUST redirect them to `/login?redirect=<encoded current path>` before any checkout UI renders. The redirect contract MUST hold:

- The redirect fires only after `useAuth().hydrateSession()` resolves (`!isLoading`) and after cart hydration (`isHydrated`).
- The unauthenticated branch wins over the empty-cart branch when both conditions are true (`!user` is evaluated BEFORE `cartItems.length === 0` at `src/app/checkout/page.tsx:65-77`).
- The redirect target preserves the originating path via `encodeURIComponent(pathname)` so the login form can return the visitor to `/checkout` after successful authentication.
- When the visitor is authenticated but has no items in their cart, the existing empty-cart redirect to `/tienda` continues to apply (no regression).
- When the visitor is authenticated with an order-creation PUT in-flight (F7 race guard), the empty-cart bounce MUST NOT fire — the `orderInFlightRef` keeps the CheckoutForm mounted until the PUT resolves.

Test 2 of `tests/e2e/payment-errors.spec.ts` asserts this requirement end-to-end via the Playwright browser.

#### Scenario: S-UNAUTH.1 — Direct navigation to /checkout as guest redirects to /login

- GIVEN an unauthenticated visitor (no `bv_session` cookie; `/api/auth/session` returns `{ user: null }`) navigates directly to `/checkout`
- WHEN `useAuth.hydrateSession()` resolves with `{user: null}` and `isHydrated` flips true
- THEN the page MUST call `router.push('/login?redirect=' + encodeURIComponent(pathname))` BEFORE rendering any `<CheckoutForm>` or Stripe `<Elements>` UI
- AND the visitor's final URL MUST match `/login?redirect=%2Fcheckout`

#### Scenario: S-UNAUTH.2 — Guest with empty cart still bounces to /login (not /tienda)

- GIVEN an unauthenticated visitor with no items in their cart
- WHEN `useAuth.hydrateSession()` resolves
- THEN the redirect MUST target `/login?redirect=...`, NOT `/tienda`
- AND the `!user` branch MUST be evaluated BEFORE the empty-cart branch in the page's redirect effect

#### Scenario: S-UNAUTH.3 — Authenticated visitor with empty cart bounces to /tienda

- GIVEN an authenticated visitor with no items in their cart and no in-flight order
- WHEN the page resolves
- THEN the redirect MUST target `/tienda`, not `/login`
- AND the page MUST NOT render CheckoutForm

#### Scenario: S-UNAUTH.4 — In-flight order prevents empty-cart bounce during PUT

- GIVEN an authenticated visitor with no items in their cart AND an order-creation PUT in-flight (`orderInFlightRef.current === true` per F7 race guard)
- WHEN the page resolves
- THEN the empty-cart redirect MUST NOT fire
- AND the page MUST keep rendering `<CheckoutForm>` until the PUT resolves
- AND the F7 race guard contract is preserved (F8's `useCreateOrder` retry semantics remain untouched)
