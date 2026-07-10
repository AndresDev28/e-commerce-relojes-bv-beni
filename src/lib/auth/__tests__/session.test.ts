import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  readSessionJwt,
} from '@/lib/auth/session'
import { NextRequest, NextResponse } from 'next/server'

describe('session cookie helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('SESSION_COOKIE constant', () => {
    it('is the string bv_session', () => {
      expect(SESSION_COOKIE).toBe('bv_session')
    })
  })

  describe('setSessionCookie', () => {
    it('sets an httpOnly cookie with the given JWT', () => {
      const res = NextResponse.json({ ok: true })
      setSessionCookie(res, 'jwt-token-123')

      const setCookie = res.cookies.get(SESSION_COOKIE)
      expect(setCookie?.value).toBe('jwt-token-123')
      expect(res.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true)
    })

    it('uses secure=false in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const res = NextResponse.json({ ok: true })
      setSessionCookie(res, 'jwt-token-dev')

      expect(res.cookies.get(SESSION_COOKIE)?.secure).toBe(false)
    })

    it('uses secure=true in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      const res = NextResponse.json({ ok: true })
      setSessionCookie(res, 'jwt-token-prod')

      expect(res.cookies.get(SESSION_COOKIE)?.secure).toBe(true)
    })

    it('sets sameSite to lax and path to /', () => {
      const res = NextResponse.json({ ok: true })
      setSessionCookie(res, 'jwt')

      const cookie = res.cookies.get(SESSION_COOKIE)
      expect(cookie?.sameSite).toBe('lax')
      expect(cookie?.path).toBe('/')
    })

    it('sets maxAge to 7 days (604800 seconds)', () => {
      const res = NextResponse.json({ ok: true })
      setSessionCookie(res, 'jwt')

      expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(604800)
    })
  })

  describe('clearSessionCookie', () => {
    it('clears the session cookie by setting it to empty with maxAge 0', () => {
      const res = NextResponse.json({ ok: true })
      clearSessionCookie(res)

      const cookie = res.cookies.get(SESSION_COOKIE)
      expect(cookie?.value).toBe('')
      expect(cookie?.maxAge).toBe(0)
    })

    it('preserves httpOnly and sameSite settings', () => {
      const res = NextResponse.json({ ok: true })
      clearSessionCookie(res)

      const cookie = res.cookies.get(SESSION_COOKIE)
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.sameSite).toBe('lax')
      expect(cookie?.path).toBe('/')
    })
  })

  describe('readSessionJwt', () => {
    it('returns null when no session cookie is present', () => {
      const request = new NextRequest('http://localhost:3000/api/test')
      expect(readSessionJwt(request)).toBeNull()
    })

    it('returns the JWT value when the cookie is present', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `${SESSION_COOKIE}=jwt-from-cookie`,
        },
      })
      expect(readSessionJwt(request)).toBe('jwt-from-cookie')
    })

    it('ignores other cookies and reads only the session cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: `other=value; ${SESSION_COOKIE}=target-jwt; third=stuff`,
        },
      })
      expect(readSessionJwt(request)).toBe('target-jwt')
    })
  })
})