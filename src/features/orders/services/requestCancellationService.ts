import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import type { AuthUser } from '@/lib/auth/validate-request'
import { normalizeStrapiOrder } from './normalizeStrapiOrder'

interface OrderLookupResponse {
  data: Array<{
    id: number | string
    documentId?: string
    attributes?: Record<string, unknown>
    [key: string]: unknown
  }>
}

export const CANCELLABLE_STATUSES = ['pending', 'paid', 'processing'] as const

export async function requestCancellationService(params: {
  user: AuthUser
  jwtToken: string
  traceId: string
  orderId: string
  reason: string
}): Promise<
  | { data: { success: true; message: string } }
  | { error: NextResponse }
> {
  const { user, jwtToken, traceId, orderId, reason } = params

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwtToken}`,
    'X-Trace-Id': traceId,
  }

  // CALL 1 — GET lookup
  const lookupUrl = `${API_URL}/api/orders?filters[orderId][$eq]=${encodeURIComponent(orderId)}&populate=*`

  let lookupResponse: Response
  try {
    lookupResponse = await fetch(lookupUrl, {
      method: 'GET',
      headers,
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!lookupResponse.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let payload: OrderLookupResponse
  try {
    payload = await lookupResponse.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const orders = payload.data ?? []

  const matchingOrder = orders.find(
    (o) => normalizeStrapiOrder(o).orderId === orderId
  )

  if (!matchingOrder) {
    return {
      error: NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const normalized = normalizeStrapiOrder(matchingOrder)
  const orderData = normalized as {
    orderId?: string
    orderStatus?: string
    user?: { id?: number }
    documentId?: string
    id: number | string
  }

  // IDOR — ownership check
  if (
    orderData.orderId !== orderId ||
    !orderData.user ||
    orderData.user.id !== user.id
  ) {
    return {
      error: NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  // Cancellable status check — between CALL 1 and CALL 2
  if (
    !orderData.orderStatus ||
    !CANCELLABLE_STATUSES.includes(
      orderData.orderStatus as (typeof CANCELLABLE_STATUSES)[number]
    )
  ) {
    return {
      error: NextResponse.json(
        {
          error: `No se puede cancelar un pedido en estado: ${orderData.orderStatus}`,
        },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  // CALL 2 — PUT update
  const documentId = orderData.documentId ?? String(orderData.id)

  let updateResponse: Response
  try {
    updateResponse = await fetch(`${API_URL}/api/orders/${documentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        data: {
          orderStatus: 'cancellation_requested',
          cancellationReason: reason,
          cancellationDate: new Date().toISOString(),
          statusChangeNote: `El cliente ha solicitado la cancelación del pedido. Motivo: ${reason}`,
        },
      }),
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!updateResponse.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos enviar la solicitud. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return {
    data: {
      success: true,
      message: 'Solicitud de cancelación enviada correctamente',
    },
  }
}
