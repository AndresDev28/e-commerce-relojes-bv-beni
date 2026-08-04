/**
 * Tests for updateFavoritesService + validateFavoritesList.
 *
 * Covers the cookie-based favorites write service that powers PUT /api/favorites.
 * Mirrors the patterns used in getOrderByIdService.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

const baseParams = {
  jwtToken: 'jwt-token-abc',
  userId: 42,
  traceId: 'trace-xyz',
  favorites: ['p-1', 'p-2', 'p-3'],
}

describe('updateFavoritesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('URL, method, body and headers', () => {
    it('calls PUT /api/users/{userId} with the JSON body and the three required headers', async () => {
      const { updateFavoritesService } = await import(
        '../updateFavoritesService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      await updateFavoritesService(baseParams)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toBe('http://localhost:1337/api/users/42')
      expect(init?.method).toBe('PUT')
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token-abc',
        'X-Trace-Id': 'trace-xyz',
      })
      expect(JSON.parse(init?.body as string)).toEqual({
        favorites: ['p-1', 'p-2', 'p-3'],
      })
    })
  })

  describe('502 — Strapi failure (byte-identical Spanish string)', () => {
    it('returns 502 with the exact Spanish string when response is not ok', async () => {
      const { updateFavoritesService } = await import(
        '../updateFavoritesService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await updateFavoritesService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos guardar tus favoritos. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })

    it('returns 502 when fetch throws (network error)', async () => {
      const { updateFavoritesService } = await import(
        '../updateFavoritesService'
      )
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('network down')
      )

      const result = await updateFavoritesService(baseParams)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(502)
        const body = await result.error.json()
        expect(body.error).toBe(
          'No pudimos guardar tus favoritos. Inténtalo de nuevo.'
        )
        expect(result.error.headers.get('X-Trace-Id')).toBe('trace-xyz')
      }
    })
  })

  describe('200 — success', () => {
    it('returns {success: true} when Strapi accepts the update', async () => {
      const { updateFavoritesService } = await import(
        '../updateFavoritesService'
      )
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, favorites: ['p-1', 'p-2', 'p-3'] }),
      } as Response)

      const result = await updateFavoritesService(baseParams)

      expect('success' in result).toBe(true)
      if ('success' in result) {
        expect(result.success).toBe(true)
      }
    })
  })
})

describe('validateFavoritesList', () => {
  it('returns invalid_shape when value is not an array', async () => {
    const { validateFavoritesList } = await import(
      '../updateFavoritesService'
    )
    const result = validateFavoritesList({ foo: 'bar' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe('invalid_shape')
    }
  })

  it('returns invalid_item when an entry is not a non-empty string', async () => {
    const { validateFavoritesList } = await import(
      '../updateFavoritesService'
    )

    const result1 = validateFavoritesList(['p-1', 42, 'p-3'])
    expect(result1.valid).toBe(false)
    if (!result1.valid) {
      expect(result1.reason).toBe('invalid_item')
    }

    const result2 = validateFavoritesList(['p-1', '   ', 'p-3'])
    expect(result2.valid).toBe(false)
    if (!result2.valid) {
      expect(result2.reason).toBe('invalid_item')
    }
  })

  it('returns too_many when the list exceeds MAX_FAVORITES', async () => {
    const { validateFavoritesList } = await import(
      '../updateFavoritesService'
    )
    const { MAX_FAVORITES } = await import('../getFavoritesService')
    const oversized = Array.from({ length: MAX_FAVORITES + 1 }, (_, i) =>
      String(i)
    )

    const result = validateFavoritesList(oversized)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe('too_many')
    }
  })

  it('returns {valid: true, favorites} when all entries are non-empty strings', async () => {
    const { validateFavoritesList } = await import(
      '../updateFavoritesService'
    )

    const result = validateFavoritesList(['p-1', 'p-2', 'p-3'])
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.favorites).toEqual(['p-1', 'p-2', 'p-3'])
    }
  })
})