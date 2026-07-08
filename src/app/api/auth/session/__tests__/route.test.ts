import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/auth/session/route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns user: null when no cookie is present', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session')

    const response = await GET(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toBeNull()
    expect(response.headers.get('X-Trace-Id')).toBeTruthy()
  })

  it('returns user when cookie is valid', async () => {
    const mockUser = { id: 5, username: 'jane', email: 'jane@test.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockUser), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${SESSION_COOKIE}=valid-jwt` },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toEqual(mockUser)

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[1]?.headers).toMatchObject({
      Authorization: 'Bearer valid-jwt',
    })
  })

  it('clears the cookie and returns user: null on Strapi 401', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 401 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${SESSION_COOKIE}=stale-jwt` },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toBeNull()

    const setCookie = response.cookies.get(SESSION_COOKIE)
    expect(setCookie?.value).toBe('')
    expect(setCookie?.maxAge).toBe(0)
  })

  it('returns 502 when Strapi is unreachable', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network'))

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${SESSION_COOKIE}=jwt` },
    })

    const response = await GET(request)
    expect(response.status).toBe(502)
  })

  it('returns 502 when Strapi returns non-401 error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 500 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { cookie: `${SESSION_COOKIE}=jwt` },
    })

    const response = await GET(request)
    expect(response.status).toBe(502)
  })

  it('forwards X-Trace-Id from incoming request to Strapi', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, username: 'u', email: 'e' }), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: {
        cookie: `${SESSION_COOKIE}=jwt`,
        'X-Trace-Id': 'session-trace-abc',
      },
    })

    await GET(request)

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[1]?.headers).toMatchObject({
      'X-Trace-Id': 'session-trace-abc',
    })
  })
})