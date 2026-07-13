/**
 * Normalize a Strapi v4 order envelope to a flat shape.
 *
 * Strapi v4 wraps entity fields inside `attributes`. The order controller
 * returns `{ id, documentId, attributes: { orderId, orderStatus, user, ... } }`.
 * This helper flattens it so routes and services can access fields directly.
 */

interface StrapiOrderEnvelope {
  id: number | string
  documentId?: string
  attributes?: Record<string, unknown>
  [key: string]: unknown
}

export type NormalizedOrder = {
  id: number | string
  documentId?: string
  [key: string]: unknown
}

export function normalizeStrapiOrder(raw: StrapiOrderEnvelope): NormalizedOrder {
  if (raw.attributes) {
    const { attributes } = raw
    return { id: raw.id, documentId: raw.documentId, ...attributes }
  }
  const { id, documentId, ...rest } = raw
  return { id, documentId, ...rest }
}