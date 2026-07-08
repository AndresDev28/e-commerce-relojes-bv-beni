import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'

interface OrderDetailsResponse {
  data: Array<{
    id: number
    documentId?: string
    orderId?: string
    [key: string]: unknown
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error
    const { user, jwtToken } = authResult

    const { orderId } = await params

    const url = `${API_URL}/api/orders?filters[orderId][$eq]=${encodeURIComponent(orderId)}&populate=*`
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
          'X-Trace-Id': traceId,
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    let payload: OrderDetailsResponse
    try {
      payload = await response.json()
    } catch {
      return NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const orders = payload.data ?? []
    const ownedOrder = orders.find((o) => o.orderId === orderId)

    if (!ownedOrder || (ownedOrder as { user?: { id?: number } }).user?.id !== user.id) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404, headers: { 'X-Trace-Id': traceId } }
      )
    }

    return NextResponse.json(
      { data: ownedOrder },
      { headers: { 'X-Trace-Id': traceId } }
    )
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}