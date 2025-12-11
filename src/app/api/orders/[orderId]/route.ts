/**
 * [ORD-09] GET /api/orders/:orderId endpoint
 * [ORD-10] Refactored to use reusable ownership validation middleware
 *
 * Returns specific order details with ownership validation
 * Requires JWT authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

/**
 * GET /api/orders/:orderId
 *
 * Returns complete order details if the authenticated user owns the order
 *
 * Path params:
 * - orderId: Order ID (e.g., "ORD-1763064732-F")
 *
 * Headers:
 * - Authorization: Bearer <jwt-token>
 *
 * Responses:
 * - 200: Order details returned successfully
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (order belongs to another user)
 * - 404: Order not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
    const { orderId } = await params

    // 2. Get authenticated user from Strapi
    const userResponse = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
    })

    if (!userResponse.ok) {
      console.error(
        `Strapi users/me error: ${userResponse.status} ${userResponse.statusText}`
      )
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      )
    }

    const user = await userResponse.json()
    const userId = user.id

    // 3. First, get user's orders to validate ownership
    // Strapi v5 doesn't allow filtering by 'user' relation, so we:
    // 1) Fetch user's orders list (the /api/orders endpoint returns only user's orders)
    // 2) Check if requested orderId is in that list
    // 3) If yes, fetch the specific order details
    const userOrdersUrl = `${API_URL}/api/orders?sort[0]=createdAt:desc&pagination[pageSize]=100`
    console.log('🔍 Fetching user orders to validate ownership...')

    const userOrdersResponse = await fetch(userOrdersUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
    })

    if (!userOrdersResponse.ok) {
      const errorBody = await userOrdersResponse.text()
      console.error(`Strapi error fetching user orders: ${userOrdersResponse.status}`)
      console.error('Strapi error body:', errorBody)
      return NextResponse.json(
        { error: 'Failed to validate order ownership' },
        { status: 500 }
      )
    }

    const userOrdersData = await userOrdersResponse.json()
    const userOrderIds = (userOrdersData.data || []).map((o: { orderId: string }) => o.orderId)

    // 4. Check if user owns this order
    if (!userOrderIds.includes(orderId)) {
      console.log(`🔒 Order ${orderId} not found in user ${userId}'s orders`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log(`✅ Order ${orderId} verified as belonging to user ${userId}`)

    // 5. Find the order in the already-fetched list
    const order = userOrdersData.data.find((o: { orderId: string }) => o.orderId === orderId)

    // DEBUG: Log order structure
    console.log('📦 Order data:', JSON.stringify(order, null, 2))

    // 6. Return complete order details
    return NextResponse.json({
      data: order,
    })
  } catch (error) {
    console.error('❌ Error in GET /api/orders/:orderId:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
