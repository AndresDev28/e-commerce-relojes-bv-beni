/**
 * API functions for Order management
 * [PAY-18] Create order in Strapi after successful payment
 */

import type { CartItem } from '@/types'
import { API_URL } from '@/lib/constants'

/**
 * Order data to send to Strapi
 */
export interface CreateOrderData {
  orderId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  orderStatus?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  paymentIntentId?: string
}

/**
 * Order response form Strapi
 */

export interface OrderResponse {
  data: {
    id: number
    documentId: string
    items: CartItem[]
    subtotal: number
    shipping: number
    total: number
    orderStatus: string
    paymentIntentId?: string
    createdAt: string
    updatedAt: string
    publishedAt: string
  }
}

/**
 * Creates a new order in Strapi
 * Requires authenticated user (JWT token)
 *
 * @param orderData - Order details
 * @param jwtToken - User JWT token from AuthContext
 * @returns Created order data
 * @throws Error if creation fails
 */
export async function createOrder(
  orderData: CreateOrderData,
  jwtToken: string
): Promise<OrderResponse> {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        data: {
          orderId: orderData.orderId,
          items: orderData.items,
          subtotal: orderData.subtotal,
          shipping: orderData.shipping,
          total: orderData.total,
          orderStatus: orderData.orderStatus || 'pending',
          paymentIntentId: orderData.paymentIntentId,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to create order')
    }

    const data: OrderResponse = await response.json()
    return data
  } catch (error) {
    console.error('❌ Error creating order:', error)
    throw error
  }
}

/**
 * Gets user's orders from Strapi
 *
 * @param jwtToken - User JWT token
 * @returns Array of user's orders
 */
export async function getUserOrders(
  jwtToken: string
): Promise<OrderResponse[]> {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('❌ Error fetching orders:', error)
    throw error
  }
}
