/**
 * API functions for Order management
 * [PAY-18] Create order in Strapi after successful payment
 */

import type { CartItem, StatusHistoryItem } from '@/types'
import { OrderStatus } from '@/types'
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
  orderStatus?: OrderStatus
  paymentIntentId?: string
  paymentInfo?: PaymentInfo
}

/**
 * Payment method information
 */
export interface PaymentInfo {
  method: string // 'card', 'paypal', etc.
  last4?: string // Last 4 digits of card
  brand?: string // 'visa', 'mastercard', etc.
}

/**
 * Single order data from Strapi
 */
export interface OrderData {
  id: number
  documentId: string
  orderId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  orderStatus: OrderStatus
  paymentIntentId?: string
  paymentInfo?: PaymentInfo
  statusHistory?: StatusHistoryItem[]
  shippedAt?: string
  deliveredAt?: string
  shipment?: {
    tracking_number: string | null;
    carrier: string | null;
    status: string | null;
    estimated_delivery_date: string | null;
  } | null;
  createdAt: string
  updatedAt: string
  publishedAt: string
}

/**
 * Order response wrapper from Strapi
 */
export interface OrderResponse {
  data: OrderData
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
    // Create order in Strapi - user is assigned automatically via lifecycle hook
    console.log('📝 Creating order...')
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
          orderStatus: orderData.orderStatus || OrderStatus.PENDING,
          paymentIntentId: orderData.paymentIntentId,
          paymentInfo: orderData.paymentInfo,
          // Note: user is assigned automatically by Strapi lifecycle hook
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Strapi error response:', JSON.stringify(error, null, 2))
      throw new Error(error.error?.message || 'Failed to create order')
    }

    const data: OrderResponse = await response.json()
    console.log('✅ Order created successfully:', data.data.orderId)
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
 * @returns Array of user's orders (sorted by newest first)
 */
export async function getUserOrders(
  jwtToken: string
): Promise<OrderData[]> {
  try {
    // Strapi query params: ordenar por fecha descendente y aumentar el límite
    const queryParams = new URLSearchParams({
      'sort[0]': 'createdAt:desc', // Más recientes primero
      'pagination[pageSize]': '100', // Aumentar límite de paginación
      'populate[0]': 'shipment', // [EPIC-17] Populate Shipment tracking info 
    })

    const response = await fetch(`${API_URL}/api/orders?${queryParams}`, {
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
    // Flatten the attributes if Strapi returns the wrapped format
    return data.data.map((item: { id?: number; documentId?: string; attributes?: Record<string, unknown>;[key: string]: unknown }) => {
      if (item.attributes) {
        return {
          id: item.id,
          documentId: item.documentId || item.attributes.documentId,
          ...item.attributes
        }
      }
      return item
    }) as OrderData[]
  } catch (error) {
    console.error('❌ Error fetching orders:', error)
    throw error
  }
}
