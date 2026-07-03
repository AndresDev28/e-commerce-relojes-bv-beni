import { NextRequest, NextResponse } from 'next/server'

export const SESSION_COOKIE = 'bv_session'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 604800,
}

export function setSessionCookie(res: NextResponse, jwt: string): void {
  res.cookies.set(SESSION_COOKIE, jwt, COOKIE_OPTIONS)
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  })
}

export function readSessionJwt(request: NextRequest): string | null {
  const cookie = request.cookies.get(SESSION_COOKIE)
  return cookie?.value ?? null
}
