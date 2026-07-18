import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import type { AuthUser } from '@/lib/auth/validate-request'
import { normalizeStrapiOrder } from './normalizeStrapiOrder'
import type { NormalizedOrder } from './normalizeStrapiOrder'

interface OrderLookupResponse {
  data: Array<{
    id: number | string
    documentId?: string
    attributes?: Record<string, unknown>
    [key: string]: unknown
  }>
}

export async function getOrderByIdService(params: {
  user: AuthUser
  jwtToken: string
  traceId: string
  orderId: string
}): Promise<{ data: NormalizedOrder } | { error: NextResponse }> {
  const { user, jwtToken, traceId, orderId } = params

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
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!response.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let payload: OrderLookupResponse
  try {
    payload = await response.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  try {
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
    const orderOwner = normalized.user as { id?: number } | undefined

    if (!orderOwner || orderOwner.id !== user.id) {
      return {
        error: NextResponse.json(
          { error: 'Pedido no encontrado' },
          { status: 404, headers: { 'X-Trace-Id': traceId } }
        ),
      }
    }

    return { data: normalized }
  } catch (_err: unknown) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }
}
