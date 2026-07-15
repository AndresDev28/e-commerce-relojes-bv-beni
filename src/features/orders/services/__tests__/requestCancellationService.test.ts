import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AuthUser } from '@/lib/auth/validate-request'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

const baseParams = {
  user: { id: 42 } as AuthUser,
  jwtToken: 'jwt-token-abc',
  traceId: 'trace-xyz',
  orderId: 'ORD-1234567890-A',
  reason: 'Ya no lo necesito',
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

describe('requestCancellationService', () => {
  let toISOStringSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    toISOStringSpy = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2025-06-15T12:00:00.000Z')
  })

  afterEach(() => {
    toISOStringSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  describe('CANCELLABLE_STATUSES', () => {
    it('exports the correct set of cancellable statuses', async () => {
      const { CANCELLABLE_STATUSES } = await import(
        '../requestCancellationService'
      )
      expect([...CANCELLABLE_STATUSES]).toEqual(['pending', 'paid', 'processing'])
    })
  })

  describe('Two-call flow — URL, headers, and PUT body', () => {
    it('performs GET lookup then PUT update, both with correct URLs, headers, and body', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect(global.fetch).toHaveBeenCalledTimes(2)

      // CALL 1 — GET lookup
      const [getUrl, getInit] = vi.mocked(global.fetch).mock.calls[0]
      expect(getUrl).toBe(
        'http://localhost:1337/api/orders?filters[orderId][$eq]=ORD-1234567890-A&populate=*'
      )
      expect(getInit?.method).toBe('GET')
      expect(getInit?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token-abc',
        'X-Trace-Id': 'trace-xyz',
      })

      // CALL 2 — PUT update
      const [putUrl, putInit] = vi.mocked(global.fetch).mock.calls[1]
      expect(putUrl).toBe('http://localhost:1337/api/orders/doc-1')
      expect(putInit?.method).toBe('PUT')
      expect(putInit?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token-abc',
        'X-Trace-Id': 'trace-xyz',
      })

      // PUT body — exact shape with byte-identical Spanish string
      const putBody = JSON.parse(putInit?.body as string)
      expect(putBody).toEqual({
        data: {
          orderStatus: 'cancellation_requested',
          cancellationReason: 'Ya no lo necesito',
          cancellationDate: '2025-06-15T12:00:00.000Z',
          statusChangeNote:
            'El cliente ha solicitado la cancelación del pedido. Motivo: Ya no lo necesito',
        },
      })

      // Success result
      expect('data' in result).toBe(true)
      if ('data' in result) {
        expect(result.data).toEqual({
          success: true,
          message: 'Solicitud de cancelación enviada correctamente',
        })
      }
    })

    it('uses String(id) as fallback when documentId is missing', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 7,
              attributes: {
                orderId: 'ORD-1234567890-A',
                orderStatus: 'pending',
                user: { id: 42 },
              },
            },
          ],
        }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response)

      await requestCancellationService(baseParams)

      const [putUrl] = vi.mocked(global.fetch).mock.calls[1]
      expect(putUrl).toBe('http://localhost:1337/api/orders/7')
    })

    it('encodes special characters in orderId for the GET lookup URL', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildStrapiPayload({ orderId: 'ORD/a b&c' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response)

      await requestCancellationService({
        ...baseParams,
        orderId: 'ORD/a b&c',
      })

      const [getUrl] = vi.mocked(global.fetch).mock.calls[0]
      expect(getUrl).toContain(
        'filters[orderId][$eq]=ORD%2Fa%20b%26c'
      )
    })
  })

  describe('502 — Strapi failure (byte-identical Spanish string)', () => {
    it('returns 502 when GET lookup response is not ok', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos enviar la solicitud. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
      // Only 1 fetch call — GET failed, no PUT
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns 502 when GET lookup fetch throws (network error)', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos enviar la solicitud. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when GET lookup JSON parse fails', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('invalid json')
        },
      } as unknown as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos enviar la solicitud. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when PUT update response is not ok', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos enviar la solicitud. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('returns 502 when PUT update fetch throws (network error)', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload(),
      } as Response)

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos enviar la solicitud. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })

  describe('404 — IDOR non-owner (never 403)', () => {
    it('returns 404 when the order owner id differs from user.id', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ user: { id: 999 } }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
      // Only 1 fetch call — IDOR caught before PUT
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns 404 when order has no user field', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ user: undefined }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
      }
    })

    it('returns 404 when no order matches the orderId', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
        const body = await result.error.json()
        expect(body.error).toBe('Pedido no encontrado')
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 404 when returned order has a different orderId', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ orderId: 'ORD-OTHER' }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(404)
      }
    })
  })

  describe('400 — non-cancellable status (no PUT performed)', () => {
    it('returns 400 when order status is not in CANCELLABLE_STATUSES', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ orderStatus: 'shipped' }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(400)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No se puede cancelar un pedido en estado: shipped'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
      // Only 1 fetch call — status check before PUT
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns 400 for double-click on already-cancellation_requested status (KEPT, not 200)', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildStrapiPayload({ orderStatus: 'cancellation_requested' }),
      } as Response)

      const result = await requestCancellationService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(400)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No se puede cancelar un pedido en estado: cancellation_requested'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
      // Only 1 fetch call — no PUT for non-cancellable
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('X-Trace-Id on every error response', () => {
    it('carries X-Trace-Id on 502 error', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response)

      const result = await requestCancellationService(baseParams)
      if ('error' in result) {
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('carries X-Trace-Id on 404 error', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      const result = await requestCancellationService(baseParams)
      if ('error' in result) {
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('carries X-Trace-Id on 400 error', async () => {
      const { requestCancellationService } = await import(
        '../requestCancellationService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => buildStrapiPayload({ orderStatus: 'delivered' }),
      } as Response)

      const result = await requestCancellationService(baseParams)
      if ('error' in result) {
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })
})
