/**
 * RED suite — upsertOrderService (tasks 2.1, spec S2.1–S2.2, design A-2/A-4/A-8).
 *
 * Status preservation is the core contract: bounded 400/403/409 responses
 * MUST surface with their status and structured body intact — the legacy
 * createOrderService 502-collapse (F6) must NOT be inherited here.
 * Transport failure is the ONLY path allowed to synthesize a 502, and it
 * must carry the trace id (S2.2).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  makeUpsertWirePayload,
  makeUpsertSuccessEnvelope,
  makeUpsertErrorEnvelope,
  MOCK_ORDER_ID,
  MOCK_TRACE_ID,
} from '@/__tests__/__fixtures__/orderPayload'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

const rawBody = JSON.stringify(makeUpsertWirePayload())

const baseParams = {
  jwtToken: 'jwt-upsert-abc',
  traceId: MOCK_TRACE_ID,
  orderId: MOCK_ORDER_ID,
  rawBody,
}

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

describe('upsertOrderService — request composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends PUT to the by-order-id path with Auth, trace and verbatim body (S1.6 boundary, A-2)', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(200, makeUpsertSuccessEnvelope())
    )

    await upsertOrderService(baseParams)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(global.fetch).mock.calls[0]
    expect(url).toBe(
      `http://localhost:1337/api/orders/by-order-id/${MOCK_ORDER_ID}`
    )
    expect(init?.method).toBe('PUT')
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-upsert-abc',
      'X-Trace-Id': MOCK_TRACE_ID,
    })
    // Body forwarded as the same raw string — no parse/re-serialize.
    expect(init?.body).toBe(rawBody)
  })

  it('encodes special characters in the orderId path segment (threat: fixed upstream)', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(200, makeUpsertSuccessEnvelope())
    )

    await upsertOrderService({ ...baseParams, orderId: 'ORD/a b&c' })

    const [url] = vi.mocked(global.fetch).mock.calls[0]
    expect(url).toContain('/api/orders/by-order-id/ORD%2Fa%20b%26c')
    // Upstream host stays pinned to API_URL — no attacker-controlled host.
    expect(String(url).startsWith('http://localhost:1337')).toBe(true)
  })
})

describe('upsertOrderService — bounded status preservation (S2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns { status: 200, body } with the success envelope preserved', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    const envelope = makeUpsertSuccessEnvelope()
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(200, envelope))

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(200)
    expect(result.body).toEqual(envelope)
  })

  it('returns { status: 400, body } for a validation envelope — NOT collapsed to 502', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    const envelope = makeUpsertErrorEnvelope(
      400,
      'BadRequestError',
      'userId is required'
    )
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(400, envelope))

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(400)
    expect(result.body).toEqual(envelope)
  })

  it('returns { status: 403, body } for an ownership envelope (D6)', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    const envelope = makeUpsertErrorEnvelope(
      403,
      'ForbiddenError',
      'You can only modify your own orders'
    )
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(403, envelope))

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(403)
    expect(result.body).toEqual(envelope)
  })

  it('returns { status: 409, body } for an idempotency conflict (D4) — does not throw', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    const envelope = makeUpsertErrorEnvelope(
      409,
      'ConflictError',
      'paymentIntentId does not match existing order'
    )
    vi.mocked(global.fetch).mockResolvedValueOnce(jsonResponse(409, envelope))

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(409)
    expect(result.body).toEqual(envelope)
  })
})

describe('upsertOrderService — transport failure → synthesized 502 (S2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 502 with friendly Spanish message and traceId when fetch rejects', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(502)
    const body = result.body as {
      data: null
      error: { status: number; name: string; message: string; details: { traceId: string } }
    }
    expect(body.data).toBeNull()
    expect(body.error.status).toBe(502)
    expect(body.error.name).toBe('BadGatewayError')
    expect(body.error.message).toContain('No pudimos')
    expect(body.error.message).toBe(
      'No pudimos contactar al servidor. Inténtalo de nuevo.'
    )
    expect(body.error.details.traceId).toBe(MOCK_TRACE_ID)
  })

  it('returns 502 with traceId when a 200 response body is unparseable', async () => {
    const { upsertOrderService } = await import('../upsertOrderService')
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('invalid json')
      },
    } as unknown as Response)

    const result = await upsertOrderService(baseParams)

    expect(result.status).toBe(502)
    const body = result.body as {
      error: { status: number; details: { traceId: string } }
    }
    expect(body.error.status).toBe(502)
    expect(body.error.details.traceId).toBe(MOCK_TRACE_ID)
  })
})
