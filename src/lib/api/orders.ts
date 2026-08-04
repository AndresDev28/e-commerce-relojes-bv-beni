/**
 * API functions for Order management — type contracts only.
 *
 * Runtime helpers (`createOrder`, `getUserOrders`) were removed because
 * the cookie-based auth migration removed the consumer path. All
 * authenticated order traffic now flows through Next.js route handlers
 * in `src/app/api/orders/**`, which read the httpOnly session cookie
 * and forward Authorization to Strapi. This module now only re-exports
 * the type contracts that consumers still import.
 */

import type { CartItem, StatusHistoryItem } from '@/types'
import { OrderStatus } from '@/types'

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
