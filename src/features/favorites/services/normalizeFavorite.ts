/**
 * Pure normalizer that maps raw Strapi favorite objects (returned by
 * GET /api/users/me?populate[favorites][populate]=image) to canonical
 * Product shape.
 *
 * Strapi v5 returns objects with:
 *   - numeric `id` (PK)
 *   - string `documentId` (Strapi v5 convenience)
 *   - populated `image` (singular, multiple: true) as `[{ id, url }]`
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
import { normalizeImageUrl } from '@/lib/images/url'

/**
 * Extract canonical `images: string[]` from a raw Strapi favorite.
 *
 * Strapi returns the populated `image` (singular, multiple: true) field as
 * an array of `{ id, url }` media objects. Legacy entries may also surface
 * as already-normalized URL strings. Both shapes are accepted:
 *
 *   - missing/null/undefined image field → `[]` (preserves placeholder UX)
 *   - `[]` (empty array) → `[]` (same placeholder UX)
 *   - `[{ id, url: '/uploads/x.jpg' }]` → `['${STRAPI_URL}/uploads/x.jpg']`
 *     (delegated to `normalizeImageUrl`, which reads the base at call time)
 *   - `[{ id, url: 'https://cdn/x.jpg' }]` → `['https://cdn/x.jpg']` (no double-prefix)
 *   - `[{ id }]` (entry missing `url`) → entry skipped (defensive)
 *   - legacy `['/a.jpg', '/b.jpg']` (URL strings) → passes through unchanged
 *
 * The base URL resolution chain (API_URL → env vars → 127.0.0.1 fallback)
 * is owned by `normalizeImageUrl` (BUG-IMAGES-400 #1688), so this module
 * no longer carries its own copy of that logic. Tests that need to force
 * a base URL can `vi.mock('@/lib/constants', () => ({ API_URL: '...' }))`
 * the same way they do for the catalog mapper.
 */
export function extractFavoriteImages(
  item: Record<string, unknown>
): string[] {
  const mediaData = item.images ?? item.image ?? null

  if (mediaData === null || mediaData === undefined) {
    return []
  }

  const entries: unknown[] = Array.isArray(mediaData)
    ? mediaData
    : [mediaData]

  const result: string[] = []
  for (const entry of entries) {
    if (entry === null || entry === undefined) {
      continue
    }
    if (typeof entry === 'string') {
      // Legacy: already-normalized URL string (passthrough)
      result.push(entry)
      continue
    }
    if (typeof entry === 'object' && 'url' in entry) {
      const url = (entry as { url: unknown }).url
      if (typeof url !== 'string' || !url) {
        // Entry missing `url` — skip defensively rather than emit half-baked URL
        continue
      }
      result.push(normalizeImageUrl(url))
    }
  }
  return result
}

/**
 * Map one raw Strapi favorite to a canonical Product.
 *
 * Returns null when the raw value is not a usable object — lets the
 * caller drop the entry instead of crashing the whole list. An empty
 * id is never silently coerced to `{ id: '' }` because such an entry
 * would never match a catalog product anyway.
 *
 * `href` derivation mirrors the catalog `formatProduct` helper at
 * `src/features/catalog/hooks/useProducts.ts:60`:
 *   1. If Strapi populates an explicit `href`, preserve it.
 *   2. Else if a `slug` is present, build `/tienda/${slug}`.
 *   3. Else fall back to the `producto-sin-slug` sentinel so the
 *      navigation Link in FavoriteItemRow never 404s into `/tienda/${id}`.
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

  const slug = typeof item.slug === 'string' && item.slug ? item.slug : null

  return {
    id,
    name: typeof item.name === 'string' && item.name ? item.name : 'Sin nombre',
    price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
    images: extractFavoriteImages(item),
    href:
      typeof item.href === 'string' && item.href
        ? item.href
        : slug
          ? `/tienda/${slug}`
          : '/tienda/producto-sin-slug',
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
