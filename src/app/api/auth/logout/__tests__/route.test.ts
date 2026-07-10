import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/auth/logout/route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 and clears the session cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    const setCookie = response.cookies.get(SESSION_COOKIE)
    expect(setCookie?.value).toBe('')
    expect(setCookie?.maxAge).toBe(0)
  })

  it('includes X-Trace-Id in response headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: { 'X-Trace-Id': 'logout-trace-id' },
    })

    const response = await POST(request)
    expect(response.headers.get('X-Trace-Id')).toBe('logout-trace-id')
  })

  it('still clears cookie when Strapi call would fail (local state must reset)', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const setCookie = response.cookies.get(SESSION_COOKIE)
    expect(setCookie?.value).toBe('')
  })
})