import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { getOrdersService, createOrderService } from '@/features/orders'

interface CreateOrderBody {
  orderId?: unknown
  items?: unknown
  subtotal?: unknown
  shipping?: unknown
  total?: unknown
  orderStatus?: unknown
  paymentIntentId?: unknown
  paymentInfo?: unknown
}

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { user, jwtToken } = authResult

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const userIdParam = searchParams.get('user')

    const result = await getOrdersService({
      user,
      jwtToken,
      traceId,
      page,
      userIdParam,
    })

    if ('error' in result) return result.error

    return NextResponse.json(
      { data: result.data, meta: result.meta },
      { headers: { 'X-Trace-Id': traceId } }
    )
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error
    const { jwtToken } = authResult

    let body: CreateOrderBody
    try {
      body = (await request.json()) as CreateOrderBody
    } catch {
      return NextResponse.json(
        { error: 'Solicitud inválida.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const { orderId, items, subtotal, shipping, total, orderStatus, paymentIntentId, paymentInfo } = body

    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json(
        { error: 'Falta el identificador del pedido.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'El pedido debe incluir al menos un producto.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }
    if (
      typeof subtotal !== 'number' ||
      typeof shipping !== 'number' ||
      typeof total !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Los importes del pedido son inválidos.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const result = await createOrderService({
      jwtToken,
      traceId,
      input: { orderId, items, subtotal, shipping, total, orderStatus, paymentIntentId, paymentInfo },
    })

    if ('error' in result) return result.error

    return NextResponse.json(result.data, { headers: { 'X-Trace-Id': traceId } })
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}