/**
 * Tests for GET/PUT /api/favorites.
 *
 * Covers the cookie-based favorites route handlers:
 *  - requireUser session validation
 *  - 502/500 error mapping
 *  - request body validation (JSON shape, favorites shape)
 *  - X-Trace-Id propagation in every response (success and error)
 *  - Delegation to getFavoritesService / updateFavoritesService
 *
 * Mirrors the patterns used in src/app/api/orders/__tests__/route.test.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, PUT } from '../route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { MAX_FAVORITES } from '@/features/favorites/services/getFavoritesService'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

// --- GET /api/favorites ---

describe('GET /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('[FAV-R-1] returns 401 if no session cookie is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/favorites')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe(
      'No tienes una sesión activa. Inicia sesión.'
    )
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-R-2] returns 200 with favorites from the service when session is valid', async () => {
    global.fetch = vi
      .fn()
      // requireUser → /api/users/me
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      // getFavoritesService → /api/users/me?populate=favorites
      // Real Strapi shape: numeric id, documentId, partial fields
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          favorites: [
            {
              id: 1,
              documentId: 'p-1',
              name: 'Watch A',
              price: 100,
              stock: 1,
            },
            {
              id: 2,
              documentId: 'p-2',
              name: 'Watch B',
              price: 200,
              stock: 2,
            },
          ],
        }),
      })

    const request = new NextRequest('http://localhost:3000/api/favorites')
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Service normalizes to canonical Product[] with string ids
    expect(data.favorites).toHaveLength(2)
    expect(data.favorites.every((p: { id: unknown }) => typeof p.id === 'string')).toBe(true)
    expect(data.favorites.map((p: { id: string }) => p.id).sort()).toEqual([
      '1',
      '2',
    ])
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-R-3] returns 502 when getFavoritesService returns an error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    const request = new NextRequest('http://localhost:3000/api/favorites')
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe(
      'No pudimos cargar tus favoritos. Inténtalo de nuevo.'
    )
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-R-4] echoes the inbound X-Trace-Id when the caller provides one', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ favorites: [] }),
      })

    const request = new NextRequest(
      'http://localhost:3000/api/favorites',
      {
        headers: { 'X-Trace-Id': 'trace-from-caller-get' },
      }
    )
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await GET(request)

    expect(response.headers.get('X-Trace-Id')).toBe('trace-from-caller-get')
  })

  it('[FAV-R-5] returns 502 when requireUser gets a non-ok response from /api/users/me', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const request = new NextRequest('http://localhost:3000/api/favorites')
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-R-6] returns 502 when requireUser fetch throws a network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))

    const request = new NextRequest('http://localhost:3000/api/favorites')
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})

// --- PUT /api/favorites ---

describe('PUT /api/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('[FAV-W-1] returns 401 if no session cookie is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      body: JSON.stringify(['p-1']),
    })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe(
      'No tienes una sesión activa. Inicia sesión.'
    )
  })

  it('[FAV-W-2] returns 400 when request body is not valid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Solicitud inválida.')
  })

  it('[FAV-W-3] returns 400 when body is not an array of favorite ids', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('La lista de favoritos no es válida.')
  })

  it('[FAV-W-7] returns 400 when favorites list exceeds MAX_FAVORITES', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.from({ length: MAX_FAVORITES + 1 }, (_, i) => String(i))),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(`La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.`)
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-W-4] returns 200 with the new favorites on success', async () => {
    global.fetch = vi
      .fn()
      // requireUser → /api/users/me
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      // updateFavoritesService → PUT /api/users/{userId}
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, favorites: ['p-1', 'p-2'] }),
      })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['p-1', 'p-2']),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.favorites).toEqual(['p-1', 'p-2'])
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('[FAV-W-5] returns 502 when updateFavoritesService returns an error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['p-1']),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe(
      'No pudimos guardar tus favoritos. Inténtalo de nuevo.'
    )
  })

  it('[FAV-W-6] echoes the inbound X-Trace-Id when the caller provides one', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 42, email: 'user@example.com' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const request = new NextRequest(
      'http://localhost:3000/api/favorites',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': 'trace-from-caller-put',
        },
        body: JSON.stringify(['p-1']),
      }
    )
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)

    expect(response.headers.get('X-Trace-Id')).toBe('trace-from-caller-put')
  })

  it('[FAV-W-8] returns 502 when requireUser gets a non-ok response from /api/users/me on PUT', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const request = new NextRequest('http://localhost:3000/api/favorites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['p-1']),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    expect(response.headers.get('X-Trace-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})