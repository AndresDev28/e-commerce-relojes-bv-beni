import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requireUser } from '@/lib/auth/validate-request'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

function authedRequest(jwt: string) {
  const request = new NextRequest('http://localhost:3000/api/test')
  request.cookies.set(SESSION_COOKIE, jwt)
  return request
}

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 401 when no session cookie is present', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders')

    const result = await requireUser(request)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(401)
      const body = await result.error.json()
      expect(body.error).toBe('No tienes una sesión activa. Inicia sesión.')
      expect(result.error.headers.get('X-Trace-Id')).toBeTruthy()
    }
  })

  it('returns 401 when JWT is expired (Strapi returns 401)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('', { status: 401 })
    )

    const result = await requireUser(authedRequest('expired-token'))

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(401)
      const body = await result.error.json()
      expect(body.error).toBe('Sesión expirada. Inicia sesión de nuevo.')
    }

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

  it('returns user + jwtToken on success', async () => {
    const mockUser = { id: 42, email: 'test@example.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), { status: 200 })
    )

    const result = await requireUser(authedRequest('valid-token'))

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.user.id).toBe(42)
      expect(result.user.email).toBe('test@example.com')
      expect(result.jwtToken).toBe('valid-token')
    }

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

  it('returns 502 when Strapi returns a non-401 error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('', { status: 500 })
    )

    const result = await requireUser(authedRequest('valid-token'))

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(502)
      const body = await result.error.json()
      expect(body.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    }
  })

  it('returns 502 when Strapi response has no user id', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'test@example.com' }), { status: 200 })
    )

    const result = await requireUser(authedRequest('valid-token'))

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(502)
    }
  })

  it('returns 502 when Strapi is unreachable', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

    const result = await requireUser(authedRequest('valid-token'))

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error.status).toBe(502)
    }
  })

  it('forwards X-Trace-Id from incoming request', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { 'X-Trace-Id': 'incoming-trace' },
    })
    request.cookies.set(SESSION_COOKIE, 'jwt')
    await requireUser(request)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1337/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Trace-Id': 'incoming-trace',
        }),
      })
    )
  })
})