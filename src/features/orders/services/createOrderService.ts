import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

export interface CreateOrderInput {
  orderId: string
  items: unknown[]
  subtotal: number
  shipping: number
  total: number
  orderStatus?: unknown
  paymentIntentId?: unknown
  paymentInfo?: unknown
}

export async function createOrderService(params: {
  jwtToken: string
  traceId: string
  input: CreateOrderInput
}): Promise<{ data: unknown } | { error: NextResponse }> {
  const { jwtToken, traceId, input } = params

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
        'X-Trace-Id': traceId,
      },
      body: JSON.stringify({ data: input }),
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos registrar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!response.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos registrar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let data: { data?: unknown }
  try {
    data = await response.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos registrar tu pedido. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return { data: data.data }
}