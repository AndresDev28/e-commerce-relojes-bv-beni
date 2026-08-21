/**
 * Pure normalizer that maps raw Strapi favorite objects (returned by
 * GET /api/users/me?populate=favorites) to canonical Product shape.
 *
 * Strapi v5 returns objects with:
 *   - numeric `id` (PK)
 *   - string `documentId` (Strapi v5 convenience)
 *   - partial fields (no `images`, no `href`, no `category`)
 *
 * The frontend Product type (`src/types/index.ts`) declares `id: string`
 * plus all the canonical fields with safe fallbacks. This module is the
 * single place that knows the Strapi favorite shape — see the catalog
 * counterpart `formatProduct` in `src/features/catalog/hooks/useProducts.ts`.
 *
 * Pure: no I/O, no React, no hooks. Easy to test.
 */

import type { Product } from '@/types'

/**
 * Map one raw Strapi favorite to a canonical Product.
 *
 * Returns null when the raw value is not a usable object — lets the
 * caller drop the entry instead of crashing the whole list. An empty
 * id is never silently coerced to `{ id: '' }` because such an entry
 * would never match a catalog product anyway.
 */
export function normalizeFavorite(raw: unknown): Product | null {
  if (raw === null || typeof raw !== 'object') {
    return null
  }

  const item = raw as Record<string, unknown>

  const idSource = item.id ?? item.documentId
  if (idSource === null || idSource === undefined) {
    return null
  }
  const id = String(idSource)
  if (!id.trim()) {
    return null
  }

  return {
    id,
    name: typeof item.name === 'string' && item.name ? item.name : 'Sin nombre',
    price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
    images: Array.isArray(item.images)
      ? (item.images as Product['images'])
      : [],
    href: typeof item.href === 'string' ? item.href : '',
    description: typeof item.description === 'string' ? item.description : '',
    category: typeof item.category === 'string' ? item.category : undefined,
    stock: typeof item.stock === 'number' && Number.isFinite(item.stock) ? item.stock : 0,
  }
}

/**
 * Map a list of raw Strapi favorites to canonical Products.
 *
 * Silently drops entries that fail `normalizeFavorite` (null, primitives,
 * objects missing both `id` and `documentId`, etc.). Returns an empty
 * array for any non-array input — never throws.
 */
export function normalizeFavorites(raw: unknown): Product[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const result: Product[] = []
  for (const item of raw) {
    const normalized = normalizeFavorite(item)
    if (normalized !== null) {
      result.push(normalized)
    }
  }
  return result
}
