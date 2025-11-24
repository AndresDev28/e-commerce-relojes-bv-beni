/**
 * [ORD-01] GET /api/orders endpoint
 *
 * Returns user's orders from Strapi with pagination support
 * Requires JWT authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

/**
 * GET /api/orders
 *
 * Query params:
 * - user (optional): userId to filter orders
 * - page (optional): page number (default: 1)
 *
 * Headers:
 * - Authorization: Bearer <jwt-token>
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate JWT token
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - JWT token required' },
        { status: 401 }
      )
    }

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token format' },
        { status: 401 }
      )
    }

    const jwtToken = authHeader.replace('Bearer ', '')

    // 2. Get query parameters
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const userId = searchParams.get('user')

    // 3. Build Strapi query parameters
    const strapiParams = new URLSearchParams({
      'sort[0]': 'createdAt:desc', // Most recent first
      'pagination[page]': page,
      'pagination[pageSize]': '10', // [ORD-02] Will be implemented
    })

    // Add user filter if provided
    if (userId) {
      strapiParams.set('filters[user][id][$eq]', userId)
    }

    // 4. Fetch orders from Strapi
    const strapiUrl = `${API_URL}/api/orders?${strapiParams}`

    const response = await fetch(strapiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
    })

    if (!response.ok) {
      console.error(`Strapi error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: 'Failed to fetch orders from Strapi' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // 5. Return orders with pagination metadata
    return NextResponse.json({
      data: data.data,
      meta: data.meta,
    })

  } catch (error) {
    console.error('❌ Error in GET /api/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
