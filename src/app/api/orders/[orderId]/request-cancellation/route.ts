import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { requestCancellationService } from '@/features/orders'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { orderId } = await params

    let body: { reason?: unknown }
    try {
      body = (await request.json()) as { reason?: unknown }
    } catch {
      return NextResponse.json(
        { error: 'Solicitud inválida.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const reason = body.reason
    if (typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'Indícanos el motivo de la cancelación.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    if (reason.length > 500) {
      return NextResponse.json(
        {
          error:
            'El motivo de la cancelación no puede superar los 500 caracteres. Reduce el texto a 500 caracteres como máximo y vuelve a intentarlo para que podamos procesar tu solicitud.',
        },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const result = await requestCancellationService({
      user: authResult.user,
      jwtToken: authResult.jwtToken,
      traceId,
      orderId,
      reason,
    })

    if ('error' in result) return result.error

    return NextResponse.json(result.data, {
      headers: { 'X-Trace-Id': traceId },
    })
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
