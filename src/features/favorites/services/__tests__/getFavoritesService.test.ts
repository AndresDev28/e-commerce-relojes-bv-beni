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
        'http://localhost:1337/api/users/me?populate[favorites][populate]=image'
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
    it('returns {favorites: <Product[]>} when payload is well-formed, defaulting to []', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      // Case 1: explicit favorites array (real Strapi object shape)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            {
              id: 'p-1',
              documentId: 'p-1',
              name: 'Watch A',
              price: 100,
              stock: 1,
            },
            {
              id: 'p-2',
              documentId: 'p-2',
              name: 'Watch B',
              price: 200,
              stock: 2,
            },
            {
              id: 'p-3',
              documentId: 'p-3',
              name: 'Watch C',
              price: 300,
              stock: 3,
            },
          ],
        }),
      } as Response)

      const result1 = await getFavoritesService(baseParams)
      expect('favorites' in result1).toBe(true)
      if ('favorites' in result1) {
        expect(result1.favorites).toHaveLength(3)
        expect(result1.favorites.every((p) => typeof p.id === 'string')).toBe(true)
        expect(result1.favorites.map((p) => p.id).sort()).toEqual([
          'p-1',
          'p-2',
          'p-3',
        ])
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

    it('normalizes raw Strapi favorite objects (numeric id) to canonical Product[] with string ids', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      // Real Strapi response shape: numeric id, documentId, partial fields
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            {
              id: 1,
              documentId: 'p-1',
              name: 'Casio LA670WEA-1EF',
              price: 3990,
              stock: 5,
            },
            {
              id: 2,
              documentId: 'p-2',
              name: 'Casio LA670WEA-8AEF',
              price: 4590,
              stock: 3,
            },
          ],
        }),
      } as Response)

      const result = await getFavoritesService(baseParams)

      expect('favorites' in result).toBe(true)
      if (!('favorites' in result)) return

      expect(result.favorites).toHaveLength(2)
      // Every id is a string (canonical Product.id is string)
      expect(result.favorites.every((p) => typeof p.id === 'string')).toBe(true)
      expect(result.favorites[0]?.id).toBe('1')
      expect(result.favorites[1]?.id).toBe('2')
      // Strapi fields flow through
      expect(result.favorites[0]?.name).toBe('Casio LA670WEA-1EF')
      expect(result.favorites[0]?.price).toBe(3990)
      expect(result.favorites[0]?.stock).toBe(5)
      // Defensive fallbacks applied for omitted fields
      expect(result.favorites[0]?.images).toEqual([])
      expect(result.favorites[0]?.href).toBe('')
      expect(result.favorites[0]?.description).toBe('')
    })

    it('normalizes a single favorite with documentId fallback when id is absent', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            {
              documentId: 'ab12cd34',
              name: 'Casio',
              price: 100,
              stock: 1,
            },
          ],
        }),
      } as Response)

      const result = await getFavoritesService(baseParams)

      expect('favorites' in result).toBe(true)
      if (!('favorites' in result)) return

      expect(result.favorites).toHaveLength(1)
      expect(result.favorites[0]?.id).toBe('ab12cd34')
      expect(result.favorites[0]?.name).toBe('Casio')
    })

    it('returns canonical Product[] even when Strapi sends mixed-type favorites (some string id, some numeric)', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            { id: 'p-1', name: 'A', price: 10, stock: 1 },
            { id: 2, name: 'B', price: 20, stock: 2 },
          ],
        }),
      } as Response)

      const result = await getFavoritesService(baseParams)

      expect('favorites' in result).toBe(true)
      if (!('favorites' in result)) return

      expect(result.favorites).toHaveLength(2)
      expect(result.favorites[0]?.id).toBe('p-1')
      expect(result.favorites[1]?.id).toBe('2')
      expect(result.favorites.every((p) => typeof p.id === 'string')).toBe(true)
    })

    it('hydrates populated Strapi `image` objects into absolute URLs on canonical Product[]', async () => {
      const { getFavoritesService } = await import('../getFavoritesService')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            {
              id: 1,
              documentId: 'p-1',
              name: 'Casio',
              price: 3990,
              stock: 5,
              image: [{ id: 1, url: '/uploads/casio.jpg' }],
            },
          ],
        }),
      } as Response)

      const result = await getFavoritesService(baseParams)

      expect('favorites' in result).toBe(true)
      if (!('favorites' in result)) return

      expect(result.favorites).toHaveLength(1)
      expect(result.favorites[0]?.images).toEqual([
        'http://localhost:1337/uploads/casio.jpg',
      ])
    })
  })
})