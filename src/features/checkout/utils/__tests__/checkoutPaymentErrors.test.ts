/**
 * RED suite — paymentIntentErrors mapper (design A-1/A-2, spec
 * checkout-error-display S1.1–S1.4 + S4.1).
 *
 * The mapper is the ONLY place where the /api/create-payment-intent HTTP,
 * network, and parse failures become friendly Spanish UI copy. It must be
 * pure, status-first (5xx > 4xx > 0/network), and must NEVER echo backend
 * strings from `body.error`, `body.message`, or nested `body.error.message`
 * — even when those bodies are saturated with raw backend text (S4.1).
 */
import { describe, it, expect } from 'vitest'
import { STRIPE_ERROR_MESSAGES } from '@/lib/stripe/errorMessages'

const RAW_LEAK = 'Internal Server Error'

describe('paymentIntentErrors — 5xx branch (S1.1)', () => {
  it('returns STRIPE_ERROR_MESSAGES.api_error for 500 with flat { error } body', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(500, { error: RAW_LEAK })

    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
    expect(message).not.toContain(RAW_LEAK)
  })

  it('returns STRIPE_ERROR_MESSAGES.api_error for 500 with nested error.message body', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(500, { error: { message: RAW_LEAK } })

    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
    expect(message).not.toContain(RAW_LEAK)
  })

  it('returns STRIPE_ERROR_MESSAGES.api_error for 500 with top-level message body', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(500, { message: RAW_LEAK })

    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
    expect(message).not.toContain(RAW_LEAK)
  })

  it('returns STRIPE_ERROR_MESSAGES.api_error for the entire 5xx range', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    for (const status of [500, 502, 503, 504]) {
      expect(paymentIntentErrors(status, { error: RAW_LEAK })).toBe(
        STRIPE_ERROR_MESSAGES.api_error
      )
    }
  })
})

describe('paymentIntentErrors — 4xx branch (S1.2)', () => {
  it('returns Spanish validation copy for 400 with flat error body', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(400, { error: 'malformed request' })

    expect(message).toContain('No pudimos procesar tu método de pago')
    expect(message).not.toContain('malformed request')
  })

  it('returns Spanish session copy for 401', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(401, { error: 'unauthorized' })

    expect(message).toContain('sesión')
    expect(message).toContain('Iniciá sesión')
    expect(message).not.toContain('unauthorized')
  })

  it('returns Spanish permission copy for 403', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(403, { error: 'forbidden' })

    expect(message).toContain('permiso')
    expect(message).not.toContain('forbidden')
  })

  it('returns Spanish rate-limit copy for 429', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(429, { error: 'too many requests' })

    expect(message).toContain('Demasiadas peticiones')
    expect(message).toContain('Esperá')
    expect(message).not.toContain('too many requests')
  })

  it('returns the generic 4xx Spanish fallback for other 4xx codes', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(418, { error: "I'm a teapot" })

    expect(message).toContain('No pudimos procesar tu método de pago')
    expect(message).not.toContain('teapot')
  })
})

describe('paymentIntentErrors — network / no-status branch (S1.3)', () => {
  it('returns STRIPE_ERROR_MESSAGES.network_error for status 0 (fetch threw)', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    expect(paymentIntentErrors(0, undefined)).toBe(
      STRIPE_ERROR_MESSAGES.network_error
    )
  })

  it('returns STRIPE_ERROR_MESSAGES.network_error for status NaN', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    expect(paymentIntentErrors(NaN, undefined)).toBe(
      STRIPE_ERROR_MESSAGES.network_error
    )
  })

  it('returns STRIPE_ERROR_MESSAGES.network_error for status undefined', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    expect(paymentIntentErrors(undefined as unknown as number, undefined)).toBe(
      STRIPE_ERROR_MESSAGES.network_error
    )
  })

  it('returns STRIPE_ERROR_MESSAGES.network_error for non-number status', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    expect(paymentIntentErrors('foo' as unknown as number, undefined)).toBe(
      STRIPE_ERROR_MESSAGES.network_error
    )
  })
})

describe('paymentIntentErrors — parse failure branch (S1.4)', () => {
  it('handles undefined body gracefully for a 5xx status', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(500, undefined)

    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
  })

  it('handles null body gracefully for a 4xx status', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(400, null)

    expect(message).toContain('No pudimos procesar tu método de pago')
  })

  it('handles array body gracefully for a 5xx status', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(500, [])

    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
  })

  it('handles string body gracefully for a 4xx status', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    const message = paymentIntentErrors(400, 'just a string')

    expect(message).toContain('No pudimos procesar tu método de pago')
    expect(message).not.toContain('just a string')
  })
})

describe('paymentIntentErrors — defensive no-leak guarantee (S4.1)', () => {
  it('does not leak raw "Internal Server Error" from any body shape', async () => {
    const { paymentIntentErrors } = await import('../checkoutPaymentErrors')

    // Saturated body that hits every defensive read path the mapper must NOT
    // perform: flat error, top-level message, nested error.message. Even
    // with this body the mapper must produce STRIPE_ERROR_MESSAGES.api_error.
    const saturatedBody = {
      error: RAW_LEAK,
      message: RAW_LEAK,
      error_message: RAW_LEAK,
    } as unknown

    const message = paymentIntentErrors(500, saturatedBody)

    expect(message).not.toContain(RAW_LEAK)
    expect(message).toBe(STRIPE_ERROR_MESSAGES.api_error)
  })
})