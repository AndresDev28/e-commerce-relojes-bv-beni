import { API_URL } from '@/lib/constants'

/**
 * Status-preserving UPSERT caller (design A-2/A-4/A-8, spec S2.1–S2.2).
 *
 * Calls Strapi `PUT /api/orders/by-order-id/:orderId` with the JWT, the
 * shared trace id and the RAW body string forwarded verbatim (S1.6 — no
 * parse/re-serialize). Unlike the legacy `createOrderService` (which
 * collapses every failure to 502), bounded backend statuses 400/403/409 are
 * preserved with their structured envelope. A 502 is synthesized ONLY for
 * transport/parse failure (S2.2), carrying the trace id.
 *
 * `createOrderService` stays POST-only and untouched (F6).
 */
export type UpsertOrderStatus = 200 | 400 | 403 | 409 | 502

export interface UpsertOrderResult {
  /** D-locked statuses preserved verbatim (S2.1); 502 only on transport/parse failure (S2.2). */
  status: UpsertOrderStatus | number
  body: unknown
}

const FRIENDLY_BAD_GATEWAY_MESSAGE =
  'No pudimos contactar al servidor. Inténtalo de nuevo.'

function synthesizeBadGateway(traceId: string): UpsertOrderResult {
  return {
    status: 502,
    body: {
      data: null,
      error: {
        status: 502,
        name: 'BadGatewayError',
        message: FRIENDLY_BAD_GATEWAY_MESSAGE,
        details: { traceId },
      },
    },
  }
}

export async function upsertOrderService(params: {
  jwtToken: string
  traceId: string
  orderId: string
  rawBody: string
}): Promise<UpsertOrderResult> {
  const { jwtToken, traceId, orderId, rawBody } = params

  let response: Response
  try {
    response = await fetch(
      `${API_URL}/api/orders/by-order-id/${encodeURIComponent(orderId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
          'X-Trace-Id': traceId,
        },
        // Raw string passed through — byte-identical to what the proxy received.
        body: rawBody,
      }
    )
  } catch {
    return synthesizeBadGateway(traceId)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return synthesizeBadGateway(traceId)
  }

  return { status: response.status, body }
}
