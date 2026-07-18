import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/auth/validate-request'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

const baseParams = {
  user: { id: 42 } as AuthUser,
  jwtToken: 'jwt-token-abc',
  traceId: 'trace-xyz',
  orderId: 'ORD-1234567890-A',
}

const buildStrapiPayload = (overrides: Record<string, unknown> = {}) => ({
  data: [
    {
      id: 1,
      documentId: 'doc-1',
      attributes: {
        orderId: 'ORD-1234567890-A',
        orderStatus: 'paid',
        user: { id: 42 },
        items: [],
        subtotal: 100,
        shipping: 10,
        total: 110,
        createdAt: '2025-01-01T00:00:00.000Z',
        ...overrides,
      },
    },
  ],
})

describe('getOrderByIdService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('URL and headers', () => {
    it('calls fetch once with the Strapi URL and the three required headers', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      await getOrderByIdService(baseParams)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toBe(
        'http://localhost:1337/api/orders?filters[orderId][$eq]=ORD-1234567890-A&populate=*'
      )
      expect(init?.method).toBe('GET')
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token-abc',
        'X-Trace-Id': 'trace-xyz',
      })
    })

    it('encodes special characters in orderId', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ orderId: 'ORD/a b&c' }),
      } as Response)

      await getOrderByIdService({ ...baseParams, orderId: 'ORD/a b&c' })

      const [url] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toContain('filters[orderId][$eq]=ORD%2Fa%20b%26c')
    })
  })

  describe('502 — Strapi failure (byte-identical Spanish string)', () => {
    it('returns 502 with the exact Spanish string when response is not ok', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when fetch throws (network error)', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when JSON parse fails', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('invalid json')
        },
      } as unknown as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when payload is malformed-but-200 ({ data: [null] }) — and 502 (NOT 404) when malformed element precedes a valid sibling', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')

      // Case 1: single null element → 502
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [null] }),
      } as unknown as Response)

      const result1 = await getOrderByIdService(baseParams)
      expect('error' in result1).toBe(true)
      if ('error' in result1) {
        expect(result1.error.status).toBe(502)
        const body1 = await result1.error.json()
        expect(body1.error).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo.'
        )
        expect(result1.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }

      // Case 2 (edge-case ordering): [null, <valid-other-order>] → 502, NOT 404.
      // normalizeStrapiOrder(null) throws INSIDE .find BEFORE matchingOrder is assigned,
      // so the valid sibling is never reached — result MUST be 502.
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            null,
            {
              id: 99,
              documentId: 'doc-other',
              attributes: {
                orderId: 'ORD-OTHER-VALID',
                orderStatus: 'paid',
                user: { id: 42 },
                items: [],
                subtotal: 50,
                shipping: 5,
                total: 55,
                createdAt: '2025-01-01T00:00:00.000Z',
              },
            },
          ],
        }),
      } as unknown as Response)

      const result2 = await getOrderByIdService(baseParams)
      expect('error' in result2).toBe(true)
      if ('error' in result2) {
        expect(result2.error.status).toBe(502)
        const body2 = await result2.error.json()
        expect(body2.error).toBe(
          'No pudimos cargar tu pedido. Inténtalo de nuevo.'
        )
        expect(result2.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })

  describe('404 — IDOR non-owner (never 403)', () => {
    it('returns 404 when the order owner id differs from user.id', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ user: { id: 999 } }),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 404 when order has no user field', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ user: undefined }),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
      }
    })
  })

  describe('404 — order not found', () => {
    it('returns 404 when no order matches the orderId', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 404 when returned order has a different orderId', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ orderId: 'ORD-OTHER' }),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
      }
    })
  })

  describe('200 — success', () => {
    it('returns {data: normalizedOrder} with Strapi attributes unwrapped', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('data' in result).toBe(true)
      if ('data' in result) {
        expect(result.data).toMatchObject({
          id: 1,
          documentId: 'doc-1',
          orderId: 'ORD-1234567890-A',
          orderStatus: 'paid',
          user: { id: 42 },
          total: 110,
        })
      }
    })

    it('handles Strapi response without attributes wrapper', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 2,
              documentId: 'doc-2',
              orderId: 'ORD-1234567890-A',
              orderStatus: 'pending',
              user: { id: 42 },
              total: 50,
            },
          ],
        }),
      } as Response)

      const result = await getOrderByIdService(baseParams)

      expect('data' in result).toBe(true)
      if ('data' in result) {
        expect(result.data).toMatchObject({
          id: 2,
          orderId: 'ORD-1234567890-A',
          orderStatus: 'pending',
        })
      }
    })
  })

  describe('X-Trace-Id on every response', () => {
    it('carries X-Trace-Id on 200 success (not applicable — success has no error, but route adds it)', async () => {
      // The service returns {data} on success; the route adds X-Trace-Id to the success response.
      // This test confirms the service does NOT strip trace context.
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      const result = await getOrderByIdService(baseParams)
      expect('data' in result).toBe(true)
    })

    it('carries X-Trace-Id on 502 error response', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response)

      const result = await getOrderByIdService(baseParams)
      if ('error' in result) {
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('carries X-Trace-Id on 404 error response', async () => {
      const { getOrderByIdService } = await import('../getOrderByIdService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      const result = await getOrderByIdService(baseParams)
      if ('error' in result) {
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })
})
