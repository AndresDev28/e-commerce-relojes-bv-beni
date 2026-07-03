/**
 * Unit tests for security hardening in api.ts:
 * - X-Trace-Id header injection
 * - Friendly error mapping
 * - Single-fetch getProducts (no double-fetch)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProducts } from '@/lib/api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('api.ts security hardening', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: {
            pagination: { page: 1, pageSize: 8, pageCount: 1, total: 0 },
          },
        }),
    })
    vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://127.0.0.1:1337')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('X-Trace-Id injection', () => {
    it('includes X-Trace-Id header on paginated getProducts call', async () => {
      await getProducts({ page: 1, pageSize: 8 })

      const callOptions = mockFetch.mock.calls[0][1] as RequestInit
      expect(callOptions).toBeDefined()
      expect(callOptions.headers).toBeDefined()
      expect((callOptions.headers as Record<string, string>)['X-Trace-Id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('includes X-Trace-Id header on backward-compatible getProducts call', async () => {
      await getProducts()

      const callOptions = mockFetch.mock.calls[0][1] as RequestInit
      expect(callOptions).toBeDefined()
      expect(callOptions.headers).toBeDefined()
      expect((callOptions.headers as Record<string, string>)['X-Trace-Id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('generates a unique trace id per call', async () => {
      await getProducts({ page: 1, pageSize: 8 })
      await getProducts({ page: 2, pageSize: 8 })

      const headers1 = (mockFetch.mock.calls[0][1] as RequestInit)
        .headers as Record<string, string>
      const headers2 = (mockFetch.mock.calls[1][1] as RequestInit)
        .headers as Record<string, string>
      const traceId1 = headers1['X-Trace-Id']
      const traceId2 = headers2['X-Trace-Id']
      expect(traceId1).not.toBe(traceId2)
    })
  })

  describe('friendly error mapping', () => {
    it('maps 404 to friendly Spanish message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'No se encontraron los datos solicitados.'
      )
    })

    it('maps 500 to friendly Spanish message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'Error temporal del servidor. Intenta de nuevo más tarde.'
      )
    })

    it('maps 401 to session expired message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'Sesión expirada. Inicia sesión de nuevo.'
      )
    })

    it('maps 403 to permission denied message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'No tienes permiso para acceder a este recurso.'
      )
    })

    it('maps 429 to rate limit message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
      )
    })

    it('extracts Strapi error message from 400 body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid filter parameter' },
          }),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'Invalid filter parameter'
      )
    })

    it('falls back to generic message for unknown 400 without body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({}),
      })

      await expect(getProducts({ page: 1, pageSize: 8 })).rejects.toThrow(
        'La solicitud no es válida. Verifica los datos e intenta de nuevo.'
      )
    })
  })

  describe('single-fetch getProducts', () => {
    it('issues exactly one fetch call for paginated request', async () => {
      await getProducts({ page: 1, pageSize: 8 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('issues exactly one fetch call for backward-compatible request', async () => {
      await getProducts()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('includes sort params in the single fetch URL', async () => {
      await getProducts({ page: 1, pageSize: 8, sort: 'price-asc' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callUrl = mockFetch.mock.calls[0][0] as string
      expect(callUrl).toContain('sort%5B0%5D=price%3Aasc')
      expect(callUrl).toContain('sort%5B1%5D=id%3Aasc')
    })
  })
})
