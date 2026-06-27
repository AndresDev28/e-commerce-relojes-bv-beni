/**
 * Route authorization helpers — validate JWT via Strapi /api/users/me.
 *
 * Delegates JWT validation to Strapi (signature + expiry) and returns
 * the authenticated user for IDOR enforcement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { getTraceId } from '@/lib/trace'

export interface AuthUser {
  id: number
  [key: string]: unknown
}

/**
 * Validate the Authorization header and return the authenticated user.
 *
 * Reads `Authorization: Bearer <jwt>` from the request, calls Strapi
 * `GET /api/users/me`, and returns the user object. If validation fails,
 * returns a friendly error response.
 *
 * Usage:
 *   const result = await requireUser(request)
 *   if ('error' in result) return result.error
 *   const userId = result.user.id
 */
export async function requireUser(
  request: NextRequest
): Promise<{ user: AuthUser; jwtToken: string } | { error: NextResponse }> {
  const traceId = getTraceId(request)
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - JWT token required' },
        { status: 401, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid token format' },
        { status: 401, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const jwtToken = authHeader.replace('Bearer ', '')

  const userResponse = await fetch(`${API_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`,
      'X-Trace-Id': traceId,
    },
  })

  if (!userResponse.ok) {
    // Strapi returns 401 for expired/invalid JWT, 403 for blocked users
    if (userResponse.status === 401) {
      return {
        error: NextResponse.json(
          { error: 'Sesión expirada. Iniciá sesión de nuevo.' },
          { status: 401, headers: { 'X-Trace-Id': traceId } }
        ),
      }
    }
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Intentá de nuevo.' },
        { status: 500, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const user: AuthUser = await userResponse.json()

  if (!user.id) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos verificar tu sesión. Intentá de nuevo.' },
        { status: 500, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return { user, jwtToken }
}
