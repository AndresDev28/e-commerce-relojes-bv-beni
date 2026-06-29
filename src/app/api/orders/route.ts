/**
 * [ORD-01] GET /api/orders endpoint
 *
 * Thin adapter — delegates to the orders feature service.
 * Requires JWT authentication via Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/validate-request'
import { getTraceId } from '@/lib/trace'
import { getOrdersService } from '@/features/orders'

/**
 * GET /api/orders
 *
 * Query params:
 * - user (optional): userId to filter orders — must match JWT user (IDOR)
 * - page (optional): page number (default: 1)
 *
 * Headers:
 * - Authorization: Bearer <jwt-token>
 */
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
      { error: 'Ocurrió un error inesperado. Intentá de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
