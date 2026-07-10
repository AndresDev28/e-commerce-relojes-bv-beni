import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
  const traceHeaders = { 'X-Trace-Id': traceId }

  let body: { identifier?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida.' },
      { status: 400, headers: traceHeaders }
    )
  }

  const { identifier, password } = body

  if (
    typeof identifier !== 'string' ||
    typeof password !== 'string' ||
    !identifier.trim() ||
    !password
  ) {
    return NextResponse.json(
      { error: 'Usuario y contraseña son obligatorios.' },
      { status: 400, headers: traceHeaders }
    )
  }

  let strapiResponse: Response
  try {
    strapiResponse = await fetch(`${API_URL}/api/auth/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
      },
      body: JSON.stringify({ identifier, password }),
    })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos contactar el servidor. Inténtalo de nuevo.' },
      { status: 502, headers: traceHeaders }
    )
  }

  if (!strapiResponse.ok) {
    return NextResponse.json(
      { error: 'Credenciales inválidas.' },
      { status: 401, headers: traceHeaders }
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