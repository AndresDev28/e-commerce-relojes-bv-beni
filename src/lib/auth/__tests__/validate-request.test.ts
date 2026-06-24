/**
 * Unit tests for requireUser — JWT validation via Strapi /api/users/me.
 *
 * COVERAGE:
 * - 401 missing Authorization header
 * - 401 malformed Authorization header
 * - 401 expired/invalid JWT (Strapi returns 401)
 * - 200 valid user (Strapi returns user with id)
 * - 500 Strapi error (non-401 failure)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requireUser } from '@/lib/auth/validate-request'
import { NextRequest } from 'next/server'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders')

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(401)
      const body = await result.error.json()
      expect(body.error).toBe('Unauthorized - JWT token required')
      expect(result.error.headers.get('X-Trace-Id')).toBeTruthy()
    }
  })

  it('returns 401 when Authorization header is malformed', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { Authorization: 'InvalidFormat' },
    })

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(401)
      const body = await result.error.json()
      expect(body.error).toBe('Unauthorized - Invalid token format')
      expect(result.error.headers.get('X-Trace-Id')).toBeTruthy()
    }
  })

  it('returns 401 when JWT is expired (Strapi returns 401)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { Authorization: 'Bearer expired-token' },
    })

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(401)
      const body = await result.error.json()
      expect(body.error).toBe('Sesión expirada. Inicia sesión de nuevo.')
    }

    // Verify Strapi was called with the correct token
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer expired-token',
          'X-Trace-Id': expect.any(String),
        }),
      })
    )
  })

  it('returns 200 with user when JWT is valid', async () => {
    const mockUser = { id: 42, email: 'test@example.com' }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    const result = await requireUser(request)

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.user.id).toBe(42)
      expect(result.user.email).toBe('test@example.com')
    }

    // Verify Strapi was called with both auth and trace-id
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
          'X-Trace-Id': expect.any(String),
        }),
      })
    )
  })

  it('returns 500 when Strapi returns a non-401 error', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(500)
      const body = await result.error.json()
      expect(body.error).toBe('No pudimos verificar tu sesión. Intentá de nuevo.')
    }
  })

  it('returns 500 when Strapi response has no user id', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: 'test@example.com' }), // no id field
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(500)
    }
  })
})
