import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/login/route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when body is not valid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'not-json',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeTruthy()
    expect(response.headers.get('X-Trace-Id')).toBeTruthy()
  })

  it('returns 400 when identifier or password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '  ', password: '' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('obligatorios')
  })

  it('returns 401 when Strapi rejects credentials', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Invalid identifier or password' } }), {
        status: 401,
      })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@test.com', password: 'wrong' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Credenciales inválidas.')
  })

  it('returns 502 when Strapi is unreachable', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network down'))

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@test.com', password: 'pass' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(502)
  })

  it('returns 502 when Strapi response is missing jwt or user', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@test.com', password: 'pass' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(502)
  })

  it('returns 200 with user and sets httpOnly cookie on success', async () => {
    const mockUser = { id: 1, username: 'test', email: 'test@test.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jwt: 'jwt-abc', user: mockUser }), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'user@test.com', password: 'pass' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toEqual(mockUser)
    expect(body.jwt).toBeUndefined()

    const setCookie = response.cookies.get(SESSION_COOKIE)
    expect(setCookie?.value).toBe('jwt-abc')
    expect(setCookie?.httpOnly).toBe(true)
    expect(response.headers.get('X-Trace-Id')).toBeTruthy()
  })

  it('forwards X-Trace-Id to Strapi on the upstream call', async () => {
    const mockUser = { id: 1, username: 'test', email: 'test@test.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jwt: 'jwt', user: mockUser }), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': 'client-trace-id-1234',
      },
      body: JSON.stringify({ identifier: 'user@test.com', password: 'pass' }),
    })

    await POST(request)

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[1]?.headers).toMatchObject({
      'X-Trace-Id': 'client-trace-id-1234',
    })
  })
})