import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'

interface CancellationBody {
  reason?: unknown
}

interface OrderLookupResponse {
  data: Array<{
    id: number
    documentId?: string
    orderId?: string
    orderStatus?: string
    [key: string]: unknown
  }>
}

const CANCELLABLE_STATUSES = ['pending', 'paid', 'processing'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error
    const { user, jwtToken } = authResult

    const { orderId } = await params

    let body: CancellationBody
    try {
      body = (await request.json()) as CancellationBody
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

    const lookupUrl = `${API_URL}/api/orders?filters[orderId][$eq]=${encodeURIComponent(orderId)}&populate=*`
    let lookupResponse: Response
    try {
      lookupResponse = await fetch(lookupUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
          'X-Trace-Id': traceId,
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    if (!lookupResponse.ok) {
      return NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    let payload: OrderLookupResponse
    try {
      payload = await lookupResponse.json()
    } catch {
      return NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const order = payload.data?.[0]
    if (!order || order.orderId !== orderId || (order as { user?: { id?: number } }).user?.id !== user.id) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404, headers: { 'X-Trace-Id': traceId } }
      )
    }

    if (!order.orderStatus || !CANCELLABLE_STATUSES.includes(order.orderStatus as typeof CANCELLABLE_STATUSES[number])) {
      return NextResponse.json(
        { error: `No se puede cancelar un pedido en estado: ${order.orderStatus}` },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const documentId = order.documentId ?? String(order.id)
    let updateResponse: Response
    try {
      updateResponse = await fetch(`${API_URL}/api/orders/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
          'X-Trace-Id': traceId,
        },
        body: JSON.stringify({
          data: {
            orderStatus: 'cancellation_requested',
            cancellationReason: reason.substring(0, 1000),
            cancellationDate: new Date().toISOString(),
            statusChangeNote: `El cliente ha solicitado la cancelación del pedido. Motivo: ${reason}`,
          },
        }),
      })
    } catch {
      return NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    if (!updateResponse.ok) {
      return NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Solicitud de cancelación enviada correctamente' },
      { headers: { 'X-Trace-Id': traceId } }
    )
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}