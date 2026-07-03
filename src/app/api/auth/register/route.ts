import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
  const traceHeaders = { 'X-Trace-Id': traceId }

  let body: { username?: unknown; email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida.' },
      { status: 400, headers: traceHeaders }
    )
  }

  const { username, email, password } = body

  if (
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !username.trim() ||
    !email.trim() ||
    !password
  ) {
    return NextResponse.json(
      { error: 'Usuario, email y contraseña son obligatorios.' },
      { status: 400, headers: traceHeaders }
    )
  }

  let strapiResponse: Response
  try {
    strapiResponse = await fetch(`${API_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
      },
      body: JSON.stringify({ username, email, password }),
    })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos contactar el servidor. Inténtalo de nuevo.' },
      { status: 502, headers: traceHeaders }
    )
  }

  if (!strapiResponse.ok) {
    let errorBody: { error?: { message?: string } } = {}
    try {
      errorBody = await strapiResponse.json()
    } catch {}
    const message = errorBody.error?.message ?? 'No pudimos crear la cuenta.'
    return NextResponse.json(
      { error: message },
      { status: strapiResponse.status, headers: traceHeaders }
    )
  }

  const data = (await strapiResponse.json()) as {
    jwt?: unknown
    user?: unknown
  }

  if (typeof data.jwt !== 'string' || !data.user || typeof data.user !== 'object') {
    return NextResponse.json(
      { error: 'Respuesta inválida del servidor de autenticación.' },
      { status: 502, headers: traceHeaders }
    )
  }

  const response = NextResponse.json({ user: data.user }, { headers: traceHeaders })
  setSessionCookie(response, data.jwt)
  return response
}