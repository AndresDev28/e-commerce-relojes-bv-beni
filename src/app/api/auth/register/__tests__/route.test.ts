import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when body is missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', email: 'a@b.com', password: 'x' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('obligatorios')
  })

  it('returns 400 on malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: 'not-json',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('forwards Strapi error message on 4xx responses', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { message: 'Email already taken' } }),
        { status: 400 }
      )
    )

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'newuser',
        email: 'taken@test.com',
        password: 'pass123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Email already taken')
  })

  it('returns 502 when Strapi is unreachable', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network'))

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'u',
        email: 'e@e.com',
        password: 'p',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(502)
  })

  it('returns 502 when Strapi response is missing jwt or user', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'u',
        email: 'e@e.com',
        password: 'p',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(502)
  })

  it('returns 200 with user and sets cookie on success', async () => {
    const mockUser = { id: 42, username: 'newuser', email: 'new@test.com' }
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ jwt: 'jwt-reg', user: mockUser }), { status: 200 })
    )

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'newuser',
        email: 'new@test.com',
        password: 'pass123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.user).toEqual(mockUser)

    const setCookie = response.cookies.get(SESSION_COOKIE)
    expect(setCookie?.value).toBe('jwt-reg')
    expect(setCookie?.httpOnly).toBe(true)
  })

  it('forwards X-Trace-Id to Strapi', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ jwt: 'jwt', user: { id: 1, username: 'u', email: 'e' } }),
        { status: 200 }
      )
    )

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': 'register-trace-id',
      },
      body: JSON.stringify({
        username: 'u',
        email: 'e@e.com',
        password: 'p',
      }),
    })

    await POST(request)

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[1]?.headers).toMatchObject({
      'X-Trace-Id': 'register-trace-id',
    })
  })
})