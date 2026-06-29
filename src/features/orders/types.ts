/**
 * Types for the Orders feature domain.
 *
 * Mirrors the backend SSOT for order objects and Strapi v4 response shapes.
 */

/** Metadata de paginación retornada por Strapi */
export interface PaginationMeta {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

/**
 * Order domain object — matches the backend SSOT.
 * This is the shape AFTER unwrapping Strapi v4 attributes.
 */
export interface Order {
  id: number
  documentId?: string
  orderId: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  orderStatus: string
  createdAt: string
  updatedAt?: string
  publishedAt?: string
}

/** Individual line item within an order */
export interface OrderItem {
  id: number
  name: string
  price: number
  quantity: number
}

/**
 * Raw Strapi v4 envelope for a single order.
 * Strapi v4 wraps entity fields inside an `attributes` key.
 */
export interface StrapiOrderResponse {
  id: number
  attributes?: Order
  [key: string]: unknown
}
