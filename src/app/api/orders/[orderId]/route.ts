import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { getOrderByIdService } from '@/features/orders'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { orderId } = await params

    const result = await getOrderByIdService({
      user: authResult.user,
      jwtToken: authResult.jwtToken,
      traceId,
      orderId,
    })

    if ('error' in result) return result.error

    return NextResponse.json({ data: result.data }, { headers: { 'X-Trace-Id': traceId } })
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
