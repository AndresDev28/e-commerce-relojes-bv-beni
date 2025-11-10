/**
 * Shared test helpers and mock data for order tests
 * [PAY-19] [PAY-20] - Centralized test utilities
 */

import type { CartItem } from '@/types'
import type { OrderData } from '../orders'

/**
 * Mock cart items for testing
 * Shared between unit and integration tests
 */
export const mockCartItems: CartItem[] = [
  {
    id: '1',
    name: 'Reloj Casio',
    price: 29.99,
    quantity: 2,
    images: ['/images/reloj1.jpg'],
    href: '/products/reloj-casio',
    description: 'Reloj Casio de alta calidad',
    stock: 10,
  },
  {
    id: '2',
    name: 'Reloj Seiko',
    price: 45.0,
    quantity: 1,
    images: ['/images/reloj2.jpg'],
    href: '/products/reloj-seiko',
    description: 'Reloj Seiko automático',
    stock: 5,
  },
]

/**
 * Factory function to create mock order data
 * Allows customization while providing sensible defaults
 */
export function createMockOrderData(
  overrides?: Partial<OrderData>
): OrderData {
  return {
    id: 1,
    documentId: 'order-doc-id-123',
    orderId: 'ORD-1699123456-A5F3',
    items: mockCartItems,
    subtotal: 104.98,
    shipping: 0,
    total: 104.98,
    orderStatus: 'paid',
    paymentIntentId: 'pi_test_123456',
    createdAt: '2025-11-07T10:00:00.000Z',
    updatedAt: '2025-11-07T10:00:00.000Z',
    publishedAt: '2025-11-07T10:00:00.000Z',
    ...overrides,
  }
}

/**
 * Create multiple mock orders with unique IDs
 */
export function createMockOrders(count: number): OrderData[] {
  return Array.from({ length: count }, (_, index) =>
    createMockOrderData({
      id: index + 1,
      documentId: `order-${index + 1}`,
      orderId: `ORD-169912345${index}-A5F${index}`,
      createdAt: new Date(
        Date.now() - index * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
  )
}
