import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { readSessionJwt } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request)
  const traceHeaders = { 'X-Trace-Id': traceId }

  const jwt = readSessionJwt(request)

  if (!jwt) {
    return NextResponse.json({ user: null }, { headers: traceHeaders })
  }

  let strapiResponse: Response
  try {
    strapiResponse = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        'X-Trace-Id': traceId,
      },
    })
  } catch {
    return NextResponse.json(
      { user: null, error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
      { status: 502, headers: traceHeaders }
    )
  }

  if (strapiResponse.status === 401) {
    const response = NextResponse.json({ user: null }, { headers: traceHeaders })
    response.cookies.set('bv_session', '', { path: '/', maxAge: 0 })
    return response
  }

  if (!strapiResponse.ok) {
    return NextResponse.json(
      { user: null, error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
      { status: 502, headers: traceHeaders }
    )
  }

  const user = await strapiResponse.json()
  return NextResponse.json({ user }, { headers: traceHeaders })
}