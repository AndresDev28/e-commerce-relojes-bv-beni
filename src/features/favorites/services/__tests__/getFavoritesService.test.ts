/**
 * Tests for getFavoritesService
 *
 * Covers the cookie-based favorites read service that powers GET /api/favorites.
 * Mirrors the patterns used in getOrderByIdService.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

const baseParams = {
  jwtToken: 'jwt-token-abc',
  traceId: 'trace-xyz',
}

describe('getFavoritesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('URL and headers', () => {
    it('calls fetch once with the Strapi me+favorites URL and the three required headers', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ favorites: ['p-1', 'p-2'] }),
      } as Response)

      await getFavoritesService(baseParams)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toBe(
        'http://localhost:1337/api/users/me?populate=favorites'
      )
      expect(init?.method).toBe('GET')
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token-abc',
        'X-Trace-Id': 'trace-xyz',
      })
    })
  })

  describe('502 — Strapi failure (byte-identical Spanish string)', () => {
    it('returns 502 with the exact Spanish string when response is not ok', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await getFavoritesService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tus favoritos. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when fetch throws (network error)', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('network down')
      )

      const result = await getFavoritesService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tus favoritos. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when JSON parse fails', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('invalid json')
        },
      } as unknown as Response)

      const result = await getFavoritesService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos cargar tus favoritos. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })

  describe('200 — success', () => {
    it('returns {favorites: <array>} when payload is well-formed, defaulting to []', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      // Case 1: explicit favorites array
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ favorites: ['p-1', 'p-2', 'p-3'] }),
      } as Response)

      const result1 = await getFavoritesService(baseParams)
      expect('favorites' in result1).toBe(true)
      if ('favorites' in result1) {
        expect(result1.favorites).toEqual(['p-1', 'p-2', 'p-3'])
      }

      // Case 2: missing favorites field defaults to empty array
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      const result2 = await getFavoritesService(baseParams)
      expect('favorites' in result2).toBe(true)
      if ('favorites' in result2) {
        expect(result2.favorites).toEqual([])
      }
    })
  })
})