# Delta for checkout-error-display

**Change**: `follow-ups/sprint-5-stripe-upsert/F8-use-create-order-resilience`
**Baseline**: `openspec/specs/checkout-error-display/spec.md` (87 lines, 4 requirements). Read before writing; the S-MOD.* scenarios that F4 added to this capability are NOT present in the current canonical file (F4 archive composed delta specs but the resulting MODIFIED block is not in main). F8 therefore MODIFIES the existing baseline as it stands today; the F4 S-MOD scenarios, when reconciled, are additive to this delta and do not conflict.

Unchanged, therefore omitted from this delta:
- `Single Page-Level Payment Error Alert` (lines 9-34) — Stripe SDK flow, not touched by F8.
- `ErrorMessage Component Contract` (lines 36-58) — UI component contract, not touched by F8.
- `Trace ID Preservation Through Error Path` (lines 60-69) — checkout error path; F8 reuses the same `newTraceId()` helper on every retry attempt, so this requirement is already sufficient and needs no edit.

## MODIFIED Requirements

### Requirement: Friendly Error Mapping for Stripe Codes
The page-level error alert MUST render only friendly Spanish strings from `STRIPE_ERROR_MESSAGES` (or `DEFAULT_ERROR_MESSAGE` for unknown codes). Raw Stripe codes (card_declined, insufficient_funds, expired_card, etc.) and raw English error messages MUST NOT appear in the visible DOM.
(Previously: same text, no behavioral change — preserved verbatim from baseline.)

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

#### Scenario: S-MOD.8 — outer defensive catch in useCreateOrder.createOrder does not leak error.message
- GIVEN `useCreateOrder.createOrder` is invoked and `doCreateOrder` throws an `Error` whose `message` contains a non-user-facing substring (an internal path, a stack frame line, a URL, or a Stripe SDK error string)
- WHEN the outer `try/catch` in `createOrder` runs
- THEN `setOrderError` MUST be called with `checkoutOrderErrors(0, null, { paymentIntentId })` — the friendly fallback copy
- AND the resulting `orderError` banner MUST NOT contain any substring of `error.message`
- AND the resulting `orderError` MUST NOT contain any stack frame line, URL path, or Stripe API string
- AND the resulting `orderError` MUST be byte-identical to the banner produced by the transport-fail branch (useCreateOrder line 98-104) for the same `paymentIntentId` — the catch is a true defensive net, not a divergent path

## ADDED Requirements

### Requirement: Order Upsert Retry Contract
The order-upsert flow inside `useCreateOrder.doCreateOrder` MUST retry the PUT against `/api/orders/by-order-id/:orderId` on transient outcomes only. The retry contract MUST hold:

- Retry triggers MUST be limited to network throws (fetch rejects, abort errors) and HTTP 5xx responses (500, 502, 503, 504).
- HTTP 4xx (including 400, 401, 403, 404) MUST NOT trigger a retry — those responses are terminal and the existing mapper handles them.
- HTTP 409 MUST NOT trigger a retry (F4 invariant: a 409 reaching the browser is already post-convergence, see `checkoutOrderErrors` 409 branch).
- The total number of attempts MUST be capped at 3 (one initial plus up to two retries).
- The retry loop MUST re-send the same `wireBody` (same `userId`, `paymentIntentId`, `items`, `subtotal`, `shipping`, `paymentInfo`) and the same `orderId` path parameter on every attempt — D-lock invariant.
- Each attempt MUST carry a fresh `X-Trace-Id` from `newTraceId()` — A-4 invariant.
- `isCreatingOrder` MUST stay `true` across all retry attempts (no flicker) and MUST transition to `false` only on the final outcome (success or terminal failure).
- `clearCart` and `onSuccess` MUST fire exactly once and only on the final 2xx; they MUST NOT fire on any non-final-success path (retry exhausted, 4xx, 409).
- Backoff between attempts MUST be exponential with a base delay of at least 500 ms (concrete shape — exact base and multiplier — is a design concern, not part of this spec).

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

## REMOVED Requirements

None — no requirement is deleted outright.

## RENAMED Requirements

None.

---

## Drift note (informational, not part of the delta)

The F4 archive composed a delta spec for `checkout-error-display` that added S-MOD.1 through S-MOD.7 scenarios under a new `Payment-Intent Friendly Error Mapping` requirement. The current canonical file does not contain those scenarios, suggesting F4 archive composed the delta but the MODIFIED block was not promoted into main. F8 does NOT attempt to reconcile that drift in this change — reconciliation of the F4 delta belongs to a separate change (or to the F4 archive re-run). F8 only adds its own MODIFIED + ADDED blocks on top of the baseline as it stands today.
