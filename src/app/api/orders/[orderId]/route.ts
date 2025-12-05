/**
 * [ORD-09] GET /api/orders/:orderId endpoint
 * [ORD-10] Refactored to use reusable ownership validation middleware
 *
 * Returns specific order details with ownership validation
 * Requires JWT authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { validateOrderOwnership } from '@/lib/security/ownership-validator'

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

    // 3. Fetch order from Strapi filtering by orderId
    const strapiParams = new URLSearchParams({
      'filters[orderId][$eq]': orderId,
      'populate': 'user', // Include user relation to validate ownership
    })

    const orderResponse = await fetch(
      `${API_URL}/api/orders?${strapiParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
      }
    )

    if (!orderResponse.ok) {
      console.error(
        `Strapi error: ${orderResponse.status} ${orderResponse.statusText}`
      )
      return NextResponse.json(
        { error: 'Failed to fetch order from Strapi' },
        { status: 500 }
      )
    }

    const orderData = await orderResponse.json()

    // 4. Check if order exists
    if (!orderData.data || orderData.data.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderData.data[0]

    // 5. Validate ownership using reusable middleware
    // [ORD-10] This replaces the inline validation with the centralized validator
    // which includes:
    // - Security audit logging (authorized and unauthorized attempts)
    // - Consistent error messages across all endpoints
    // - Reusable logic for other resource ownership checks
    const ownershipValidation = validateOrderOwnership(userId, order, orderId)

    if (!ownershipValidation.isOwner) {
      // Access denied - user does not own this order
      // The middleware has already logged this unauthorized attempt
      return NextResponse.json(
        { error: ownershipValidation.error!.message },
        { status: ownershipValidation.error!.status }
      )
    }

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
