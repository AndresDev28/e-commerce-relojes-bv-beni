import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { upsertOrderService } from '@/features/orders'

/**
 * Thin same-origin PUT proxy to Strapi `PUT /api/orders/by-order-id/:orderId`
 * (design A-1/A-4, spec S1.1–S1.6).
 *
 * Delivery layer only — no business logic, no body mutation:
 * - `requireUser` enforces the httpOnly session (browser cannot call Strapi
 *   directly, proposal F1=A).
 * - The raw body string is forwarded VERBATIM (S1.6); malformed input is the
 *   backend's 400 to own (threat matrix: bounded, acceptable).
 * - Bounded statuses 200/400/403/409 (+ service-synthesized 502) and their
 *   structured bodies pass through unchanged (S1.1–S1.4).
 * - `X-Trace-Id` is honored from the inbound request (else generated) and
 *   echoed on every response, success and error alike (S1.5).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { orderId } = await params
    // Raw string, not request.json(): byte-identical forwarding (S1.6).
    const rawBody = await request.text()

    const result = await upsertOrderService({
      jwtToken: authResult.jwtToken,
      traceId,
      orderId,
      rawBody,
    })

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'X-Trace-Id': traceId },
    })
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
