import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { createPaymentIntentService } from '@/features/checkout'
import type { CartItem } from '@/types'

interface CreatePaymentIntentBody {
  items?: unknown
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { jwtToken } = authResult

    let body: CreatePaymentIntentBody
    try {
      body = (await request.json()) as CreatePaymentIntentBody
    } catch {
      return NextResponse.json(
        { error: 'Solicitud inválida.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const { items } = body
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'El pedido debe incluir al menos un producto.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const result = await createPaymentIntentService({
      jwtToken,
      traceId,
      input: { items: items as CartItem[] },
    })

    if ('error' in result) return result.error

    return NextResponse.json(result.data, {
      headers: { 'X-Trace-Id': traceId },
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear el intent de pago. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
