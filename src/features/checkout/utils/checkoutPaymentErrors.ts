/**
 * Pure friendly-error mapper for the payment-intent HTTP path
 * (design A-1/A-2, spec checkout-error-display S1.1–S1.4).
 *
 * The CheckoutForm calls this for every failure mode of
 * `api/create-payment-intent`:
 *
 *   - non-2xx response → `paymentIntentErrors(response.status, parsedBody)`
 *   - fetch throws (network abort, DNS failure, offline) → `paymentIntentErrors(0, undefined)`
 *   - `.json()` throws (truncated body, mid-response disconnect) →
 *     the caller passes `undefined` for body so the status decides the copy
 *
 * Branch precedence is status-first (5xx > 4xx > 0/network) so a 500 with an
 * unparseable body still maps to `STRIPE_ERROR_MESSAGES.api_error` and never
 * falls through to a 4xx parse fallback. The mapper NEVER echoes backend
 * text — `body.error`, `body.message`, or `body.error.message` are never read,
 * even when the body is saturated with raw English (S4.1).
 */

import { STRIPE_ERROR_MESSAGES } from '@/lib/stripe/errorMessages'

const COPY = {
  validation400:
    'No pudimos procesar tu método de pago. Verificá los datos e intentá nuevamente.',
  session401: 'Tu sesión expiró. Iniciá sesión de nuevo.',
  permission403: 'No tenés permiso para realizar esta acción.',
  rateLimit429:
    'Demasiadas peticiones. Esperá un momento e intentá nuevamente.',
  generic4xx:
    'No pudimos procesar tu método de pago. Intentá nuevamente.',
} as const

/**
 * Return `true` iff `status` is a finite integer that JavaScript would treat
 * as a valid HTTP status (0 or 100-599). Anything else (NaN, undefined, a
 * string, a float, Infinity) routes to the network fallback.
 */
function isValidStatus(status: unknown): status is number {
  return (
    typeof status === 'number' &&
    Number.isFinite(status) &&
    !Number.isNaN(status) &&
    Number.isInteger(status)
  )
}

/**
 * Map a bounded payment-intent failure to friendly Spanish UI copy.
 * Pure: no I/O, no mutation of inputs, identical output for identical input.
 */
export function paymentIntentErrors(status: number, body: unknown): string {
  // Status-first branch precedence. Body is ignored entirely — the mapper
  // NEVER echoes backend strings (defensive guarantee, S4.1).
  void body

  // Non-numeric or non-integer status (NaN, undefined, "foo", 1.5, Infinity)
  // → network failure fallback.
  if (!isValidStatus(status)) {
    return STRIPE_ERROR_MESSAGES.network_error
  }

  // 5xx (500-599) → infra-level server error. Wins over 4xx so a 500 with
  // unparseable body still maps to api_error, not the 4xx parse fallback.
  if (status >= 500 && status < 600) {
    return STRIPE_ERROR_MESSAGES.api_error
  }

  // 4xx (400-499) → status-keyed Spanish copy.
  if (status >= 400 && status < 500) {
    switch (status) {
      case 400:
        return COPY.validation400
      case 401:
        return COPY.session401
      case 403:
        return COPY.permission403
      case 429:
        return COPY.rateLimit429
      default:
        return COPY.generic4xx
    }
  }

  // status === 0 (fetch threw, network abort) or any other integer outside
  // the 4xx/5xx windows → network failure fallback.
  return STRIPE_ERROR_MESSAGES.network_error
}