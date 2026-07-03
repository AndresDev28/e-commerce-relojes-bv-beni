import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { clearSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const traceId = getTraceId(request)
  const response = NextResponse.json(
    { ok: true },
    { headers: { 'X-Trace-Id': traceId } }
  )
  clearSessionCookie(response)
  return response
}