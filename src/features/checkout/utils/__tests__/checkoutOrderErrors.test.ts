/**
 * RED suite — checkoutOrderErrors mapper (tasks 2.3, spec S-MOD.1–S-MOD.5, design A-3/A-9).
 *
 * The mapper is the ONLY place where backend 400/403/409 envelopes become
 * friendly Spanish UI copy. It must be pure (S-MOD.5), must never leak raw
 * codes/English/other-user identifiers, must never suggest retry-by-replay
 * on 409 (S-MOD.3), and must keep the paymentIntentId support copy for
 * unknown statuses (S-MOD.4). Fixtures mirror the REAL nested envelope
 * (obs #1793); the flat `{ error: string }` form is accepted defensively.
 */
import { describe, it, expect } from 'vitest'
import {
  makeUpsertErrorEnvelope,
  UPSERT_ERROR_400_ITEMS,
  UPSERT_ERROR_403_OWNERSHIP,
  UPSERT_ERROR_409_PI_MISMATCH,
  UPSERT_ERROR_409_TERMINAL,
  MOCK_TRACE_ID,
  MOCK_PAYMENT_INTENT_ID,
} from '@/__tests__/__fixtures__/orderPayload'

describe('checkoutOrderErrors — 400 validation (S-MOD.1)', () => {
  it('maps the real nested 400 userId envelope to field-specific Spanish', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = makeUpsertErrorEnvelope(400, 'BadRequestError', 'userId is required')

    const message = checkoutOrderErrors(400, envelope)

    expect(message).toContain('sesión')
    expect(message).toContain('Inicia sesión de nuevo')
    expect(message).not.toContain('userId is required')
    expect(message).not.toContain('BadRequestError')
  })

  it('maps the 400 items envelope to cart-specific Spanish', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(400, UPSERT_ERROR_400_ITEMS)

    expect(message).toContain('carrito')
    expect(message).not.toContain('items must be an array')
  })

  it('maps a shipping validation 400 to the amounts Spanish (A-9 table)', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = makeUpsertErrorEnvelope(400, 'BadRequestError', 'shipping must be a number')

    const message = checkoutOrderErrors(400, envelope)

    expect(message).toBe(
      'Los importes del pedido no son válidos. Recarga la página e inténtalo de nuevo.'
    )
  })

  it('accepts the spec flat { error } shape defensively and returns Spanish (S-MOD.1)', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(400, { error: 'Falta el identificador del pedido.' })

    expect(message).toBe(
      'No pudimos validar los datos de tu pedido. Recarga la página e inténtalo de nuevo.'
    )
  })

  it('never leaks the raw backend English message for any 400 sub-case', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = makeUpsertErrorEnvelope(400, 'BadRequestError', 'subtotal must be a number')

    const message = checkoutOrderErrors(400, envelope)

    expect(message).not.toContain('must be a number')
    expect(message).not.toContain('subtotal')
    expect(message.length).toBeGreaterThan(0)
  })
})

describe('checkoutOrderErrors — 403 ownership (S-MOD.2)', () => {
  it('returns ownership Spanish and never echoes user identifiers', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = makeUpsertErrorEnvelope(
      403,
      'ForbiddenError',
      'userId 991 does not match authenticated user 42'
    )

    const message = checkoutOrderErrors(403, envelope)

    expect(message).toContain('otra cuenta')
    expect(message).not.toContain('991')
    expect(message).not.toContain('42')
    expect(message).not.toContain('ForbiddenError')
  })

  it('uses the single 403 copy for the ownership-variant message too', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(403, UPSERT_ERROR_403_OWNERSHIP)

    expect(message).toContain('Inicia sesión con la cuenta correcta')
  })
})

describe('checkoutOrderErrors — 409 idempotency (S-MOD.3)', () => {
  it('maps paymentIntentId mismatch to reconciliation copy with the payment id', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(409, UPSERT_ERROR_409_PI_MISMATCH, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })

    expect(message).toContain('un pago distinto')
    expect(message).toContain(MOCK_PAYMENT_INTENT_ID)
  })

  it('maps terminal-status conflicts without suggesting retry-by-replay', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(409, UPSERT_ERROR_409_TERMINAL, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })

    expect(message).toContain('no puede modificarse')
    expect(message.toLowerCase()).not.toContain('inténtalo de nuevo')
    expect(message.toLowerCase()).not.toContain('reintenta')
    expect(message.toLowerCase()).not.toContain('vuelve a intentar')
  })

  it('maps unrecognized 409 to the generic "revisa Mis Pedidos" reconciliation hint', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const { UPSERT_ERROR_409_GENERIC } = await import('@/__tests__/__fixtures__/orderPayload')

    const message = checkoutOrderErrors(409, UPSERT_ERROR_409_GENERIC, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })

    expect(message).toContain('Mis Pedidos')
    expect(message).toContain(MOCK_PAYMENT_INTENT_ID)
    expect(message.toLowerCase()).not.toContain('inténtalo de nuevo')
  })
})

describe('checkoutOrderErrors — unknown status fallback (S-MOD.4)', () => {
  it('keeps the paymentIntentId support copy for 500 responses', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = makeUpsertErrorEnvelope(500, 'InternalServerError', 'Something broke')

    const message = checkoutOrderErrors(500, envelope, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })

    expect(message).toContain('Tu pago fue procesado')
    expect(message).toContain(MOCK_PAYMENT_INTENT_ID)
    expect(message).not.toContain('Something broke')
  })

  it('returns the support copy without an undefined marker when paymentIntentId is absent', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')

    const message = checkoutOrderErrors(502, { data: null, error: {} })

    expect(message).toContain('soporte')
    expect(message).not.toContain('undefined')
  })
})

describe('checkoutOrderErrors — purity (S-MOD.5)', () => {
  it('returns identical output for identical input and does not mutate the input body', async () => {
    const { checkoutOrderErrors } = await import('../checkoutOrderErrors')
    const envelope = {
      ...UPSERT_ERROR_409_PI_MISMATCH,
      error: { ...UPSERT_ERROR_409_PI_MISMATCH.error, details: { traceId: MOCK_TRACE_ID } },
    }
    const snapshot = JSON.stringify(envelope)

    const first = checkoutOrderErrors(409, envelope, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })
    const second = checkoutOrderErrors(409, envelope, {
      paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    })

    expect(second).toBe(first)
    expect(JSON.stringify(envelope)).toBe(snapshot)
  })
})
