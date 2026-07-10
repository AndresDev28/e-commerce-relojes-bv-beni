import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { readSessionJwt } from '@/lib/auth/session'

export interface AuthUser {
  id: number
  [key: string]: unknown
}

export async function requireUser(
  request: NextRequest
): Promise<{ user: AuthUser; jwtToken: string } | { error: NextResponse }> {
  const traceId = getTraceId(request)

  const jwtToken = readSessionJwt(request)

  if (!jwtToken) {
    return {
      error: NextResponse.json(
        { error: 'No tienes una sesión activa. Inicia sesión.' },
        { status: 401, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let userResponse: Response
  try {
    userResponse = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
        'X-Trace-Id': traceId,
      },
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (userResponse.status === 401) {
    return {
      error: NextResponse.json(
        { error: 'Sesión expirada. Inicia sesión de nuevo.' },
        { status: 401, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!userResponse.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let user: AuthUser
  try {
    user = (await userResponse.json()) as AuthUser
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!user.id) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return { user, jwtToken }
}
