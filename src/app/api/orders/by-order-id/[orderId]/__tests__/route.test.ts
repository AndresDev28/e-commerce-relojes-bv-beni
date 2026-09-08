/**
 * RED integration suite — PUT /api/orders/by-order-id/[orderId] proxy
 * (tasks 2.5, spec S1.1–S1.6, design A-1/A-4, threat matrix).
 *
 * The proxy is a thin delivery layer: requireUser, verbatim raw body,
 * status+body pass-through, X-Trace-Id forward + echo on success AND error.
 * The upsertOrderService is mocked so these tests assert the ROUTE contract
 * (what Strapi-side behavior the service owns is covered by its unit suite).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { PUT } from '../route'
import {
  makeUpsertSuccessEnvelope,
  UPSERT_ERROR_400_ITEMS,
  UPSERT_ERROR_403_OWNERSHIP,
  UPSERT_ERROR_409_PI_MISMATCH,
  MOCK_ORDER_ID,
  MOCK_TRACE_ID,
} from '@/__tests__/__fixtures__/orderPayload'
import * as ordersFeature from '@/features/orders'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

vi.mock('@/features/orders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/orders')>()
  return {
    ...actual,
    upsertOrderService: vi.fn(),
  }
})

const upsertOrderServiceMock = vi.mocked(ordersFeature.upsertOrderService)

/** Valid-session response for the FIRST fetch call made inside requireUser. */
const mockAuthenticatedUser = () => {
  vi.mocked(global.fetch).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ id: 42, username: 'buyer', email: 'buyer@example.com' }),
  } as Response)
}

const makePutRequest = (body?: string, headers: Record<string, string> = {}) => {
  const request = new NextRequest(
    `http://localhost:3000/api/orders/by-order-id/${MOCK_ORDER_ID}`,
    {
      method: 'PUT',
      headers,
      ...(body !== undefined ? { body } : {}),
    }
  )
  request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
  return request
}

const putParams = { params: Promise.resolve({ orderId: MOCK_ORDER_ID }) }

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[S1.1] 200 success preserves body', () => {
  it('returns 200 with the success envelope and echoes the trace id', async () => {
    mockAuthenticatedUser()
    const envelope = makeUpsertSuccessEnvelope()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 200, body: envelope })

    const response = await PUT(makePutRequest('{}', { 'X-Trace-Id': MOCK_TRACE_ID }), putParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(envelope)
    expect(response.headers.get('X-Trace-Id')).toBe(MOCK_TRACE_ID)
  })
})

describe('[S1.2–S1.4] bounded statuses pass through unchanged', () => {
  it.each([
    [400, UPSERT_ERROR_400_ITEMS],
    [403, UPSERT_ERROR_403_OWNERSHIP],
    [409, UPSERT_ERROR_409_PI_MISMATCH],
  ] as const)('forwards backend %i with the identical structured body (no 502 collapse)', async (status, envelope) => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status, body: envelope })

    const response = await PUT(
      makePutRequest('{}', { 'X-Trace-Id': MOCK_TRACE_ID }),
      putParams
    )
    const data = await response.json()

    expect(response.status).toBe(status)
    expect(data).toEqual(envelope)
  })
})

describe('[S1.5] X-Trace-Id forwarded + echoed on success and every error', () => {
  it('passes the inbound trace id to the service and echoes it on 200/400/403/409', async () => {
    for (const status of [200, 400, 403, 409] as const) {
      vi.clearAllMocks()
      global.fetch = vi.fn()
      mockAuthenticatedUser()
      upsertOrderServiceMock.mockResolvedValueOnce({ status, body: { stub: true } })

      const response = await PUT(
        makePutRequest('{}', { 'X-Trace-Id': MOCK_TRACE_ID }),
        putParams
      )

      const [, init] = vi.mocked(global.fetch).mock.calls[0]
      expect((init?.headers as Record<string, string>)['X-Trace-Id']).toBe(MOCK_TRACE_ID)
      expect(upsertOrderServiceMock).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: MOCK_TRACE_ID })
      )
      expect(response.headers.get('X-Trace-Id')).toBe(MOCK_TRACE_ID)
    }
  })

  it('generates a UUID trace id when the request has none and echoes it', async () => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 200, body: {} })

    const response = await PUT(makePutRequest('{}'), putParams)

    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(upsertOrderServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: response.headers.get('X-Trace-Id'),
      })
    )
  })
})

describe('[S1.6] body is forwarded verbatim', () => {
  it('hands the service the exact raw body string — no parse, no re-serialize', async () => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 200, body: {} })
    const rawBody =
      '{"userId":42,"paymentIntentId":"pi_x","items":[],"subtotal":1.5,"shipping": 10}'

    await PUT(makePutRequest(rawBody, { 'X-Trace-Id': MOCK_TRACE_ID }), putParams)

    expect(upsertOrderServiceMock).toHaveBeenCalledTimes(1)
    expect(upsertOrderServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody })
    )
  })

  it('forwards a malformed body unchanged so the backend owns validation (400 bounded)', async () => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 400, body: UPSERT_ERROR_400_ITEMS })
    const malformed = '{"userId":'

    const response = await PUT(makePutRequest(malformed), putParams)

    expect(upsertOrderServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody: malformed })
    )
    expect(response.status).toBe(400)
  })

  it('forwards an empty body unchanged (no proxy-level validation)', async () => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 400, body: UPSERT_ERROR_400_ITEMS })

    await PUT(makePutRequest(''), putParams)

    expect(upsertOrderServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawBody: '' })
    )
  })
})

describe('auth + routing contract', () => {
  it('rejects unauthenticated PUT with 401 before touching the service (threat)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)
    const request = new NextRequest(
      `http://localhost:3000/api/orders/by-order-id/${MOCK_ORDER_ID}`,
      { method: 'PUT', body: '{}' }
    )
    request.cookies.set(SESSION_COOKIE, 'expired-token')

    const response = await PUT(request, putParams)

    expect(response.status).toBe(401)
    expect(upsertOrderServiceMock).not.toHaveBeenCalled()
    expect(response.headers.get('X-Trace-Id')).toBeTruthy()
  })

  it('passes the decoded path orderId and the session jwt to the service', async () => {
    mockAuthenticatedUser()
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 200, body: {} })
    const encodedOrderId = 'ORD%2F123'

    const request = new NextRequest(
      `http://localhost:3000/api/orders/by-order-id/${encodedOrderId}`,
      { method: 'PUT', body: '{}' }
    )
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

    await PUT(request, { params: Promise.resolve({ orderId: 'ORD/123' }) })

    expect(upsertOrderServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'ORD/123', jwtToken: 'valid-jwt-token' })
    )
  })

  it('passes a service-synthesized 502 through with its structured body', async () => {
    mockAuthenticatedUser()
    const gateway = {
      data: null,
      error: { status: 502, name: 'BadGatewayError', message: 'x', details: { traceId: MOCK_TRACE_ID } },
    }
    upsertOrderServiceMock.mockResolvedValueOnce({ status: 502, body: gateway })

    const response = await PUT(makePutRequest('{}', { 'X-Trace-Id': MOCK_TRACE_ID }), putParams)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data).toEqual(gateway)
    expect(response.headers.get('X-Trace-Id')).toBe(MOCK_TRACE_ID)
  })
})
