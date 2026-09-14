// src/lib/api.ts

import {
  StrapiProduct,
  StrapiCategory,
  PaginationMeta,
  GetProductsParams,
  ProductsResponse,
} from '@/types'

// Tipo para la respuesta de la API de Strapi (genérico)
interface StrapiApiResponse<T> {
  data: T
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

/**
 * Generate a unique trace ID for request correlation.
 */
function generateTraceId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Map raw HTTP/Strapi errors to friendly, non-technical messages.
 *
 * Exported (not just internal) so the catalog BFF route handlers
 * (`api/products`, `api/categories`) can reuse the same mapper when
 * translating upstream Strapi failures into Spanish user-facing copy.
 */
export function mapApiError(status: number, statusText: string, body?: unknown): string {
  if (status === 404) return 'No se encontraron los datos solicitados.'
  if (status === 429) return 'Demasiadas peticiones. Intenta de nuevo en unos segundos.'
  if (status >= 500) return 'Error temporal del servidor. Intenta de nuevo más tarde.'
  if (status === 403) return 'No tienes permiso para acceder a este recurso.'
  if (status === 401) return 'Sesión expirada. Inicia sesión de nuevo.'
  if (status === 400) {
    // Try to extract a Strapi error message if available
    if (body && typeof body === 'object' && 'error' in body) {
      const err = (body as Record<string, unknown>).error
      if (err && typeof err === 'object' && 'message' in err) {
        return String((err as Record<string, string>).message)
      }
    }
    return 'La solicitud no es válida. Verifica los datos e intenta de nuevo.'
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo más tarde.'
}

/**
 * Single source of truth for the server-side Strapi base URL.
 *
 * Order:
 *   1. `NEXT_PUBLIC_STRAPI_API_URL` (build-time, also valid server-side)
 *   2. `STRAPI_API_URL` (server runtime)
 *   3. `http://127.0.0.1:1337` (local-dev fallback)
 *
 * Used by `fetchApiFull` and reused by the catalog BFF route handlers
 * (`api/products`, `api/categories`) so they share one env-resolution
 * point (D4).
 */
export function getStrapiServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    process.env.STRAPI_API_URL ||
    'http://127.0.0.1:1337'
  )
}

/**
 * Resolve the base URL used to build Strapi request URLs in
 * `fetchApiFull`. Origin-aware (F3 / design D5):
 *
 *   - **Browser context** (`typeof window !== 'undefined'`): returns `''`
 *     so the resulting URL is relative (e.g. `/api/products?...`). The
 *     browser then resolves it against the page origin, keeping the
 *     request same-origin. This is what makes the frontend work over an
 *     ngrok HTTPS tunnel — the visitor's browser never tries to reach
 *     `localhost:1337` directly, so there is no CORS or mixed-content
 *     failure to mask an underlying reachability problem.
 *
 *   - **Server context** (RSC, route handlers, services): returns the
 *     absolute `getStrapiServerUrl()` so server-side fetches keep
 *     reaching Strapi directly (no extra hop, no contract change for
 *     server-side callers).
 *
 * The browser branch deliberately returns the empty string (NOT a
 * relative URL like `/`) and the consumer uses string concatenation
 * (`base + '/api' + endpoint + '?' + qs`) instead of `new URL(path, base)`
 * — `new URL` throws on an empty base, so concatenation is required
 * (design D5).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return ''
  }
  return getStrapiServerUrl()
}

/**
 * Función central para hacer llamadas a la API de Strapi.
 * @param endpoint - El endpoint de la API a consultar (ej. '/products').
 * @param query - Un objeto con los parámetros de la query (ej. { populate: '*' }).
 * @returns The full Strapi API response (data + meta).
 */
async function fetchApiFull<T>(
  endpoint: string,
  query?: Record<string, string>
): Promise<StrapiApiResponse<T>> {
  const baseUrl = getApiBaseUrl()

  // String concatenation (NOT `new URL(path, base)`) so the browser
  // branch can use an empty base to produce a relative URL. Using
  // `new URL('/api/products', '')` would throw — see design D5.
  let url = `${baseUrl}/api${endpoint}`

  if (query) {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      params.set(key, value)
    })
    url = `${url}?${params.toString()}`
  }

  const traceId = generateTraceId()

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'X-Trace-Id': traceId,
    },
  })

  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = undefined
    }
    const friendlyMessage = mapApiError(response.status, response.statusText, body)
    const error = new Error(friendlyMessage)
    ;(error as Error & { status: number; traceId: string }).status = response.status
    ;(error as Error & { status: number; traceId: string }).traceId = traceId
    throw error
  }

  const data: StrapiApiResponse<T> = await response.json()
  return data
}

/**
 * Legacy helper that returns only the data array (backward-compatible).
 */
async function fetchApi<T>(
  endpoint: string,
  query?: Record<string, string>
): Promise<T> {
  const result = await fetchApiFull<T>(endpoint, query)
  return result.data
}

// Ahora creamos funciones específicas usando nuestro helper

/**
 * Obtener productos — versión sin parámetros (backward-compatible).
 * Devuelve todos los productos (comportamiento original).
 */
export async function getProducts(): Promise<StrapiProduct[]>

/**
 * Obtener productos — versión con parámetros de paginación/filtro.
 * Devuelve productos paginados + metadata.
 */
export async function getProducts(
  params: GetProductsParams
): Promise<ProductsResponse>

export async function getProducts(
  params?: GetProductsParams
): Promise<StrapiProduct[] | ProductsResponse> {
  // Sin parámetros → comportamiento original: fetch all
  if (!params) {
    return fetchApi<StrapiProduct[]>('/products', { populate: '*' })
  }

  const query: Record<string, string> = { populate: '*' }

  // Paginación
  if (params.page !== undefined) {
    query['pagination[page]'] = String(params.page)
  }
  if (params.pageSize !== undefined) {
    query['pagination[pageSize]'] = String(params.pageSize)
  }

  // Filtro por categoría (slug)
  if (params.category) {
    query['filters[category][slug][$eq]'] = params.category
  }

  // Ordenamiento — mapear formato UI a formato Strapi v4 array syntax (sort[0], sort[1])
  // Always add id:asc as secondary tiebreaker for stable pagination.
  const sortMap: Record<string, string> = {
    'price-asc': 'price:asc',
    'price-desc': 'price:desc',
    'name-asc': 'name:asc',
    'name-desc': 'name:desc',
  }

  if (params.sort) {
    query['sort[0]'] = sortMap[params.sort] ?? params.sort
  } else {
    // Default tiebreaker when no explicit sort is given
    query['sort[0]'] = 'id:asc'
  }
  query['sort[1]'] = 'id:asc'

  // Single fetch — use fetchApiFull to get both data and meta in one call
  const fullResponse = await fetchApiFull<StrapiProduct[]>('/products', query)

  return {
    products: fullResponse.data,
    pagination: fullResponse.meta.pagination,
  }
}

// Función para obtner un solo producto y ya desempaquetado
export async function getProductBySlug(
  slug: string
): Promise<StrapiProduct | null> {
  const products = await fetchApi<StrapiProduct[]>('/products', {
    'filters[slug][$eq]': slug,
    populate: '*',
  })

  // Si el array está vacío significa que no encontró nada
  if (!products || products.length === 0) {
    return null
  }
  // Si lo encontró entonces devuelve el primer producto del array StrapiProduct
  return products[0]
}

// Función para obtener categorías
export async function getCategories(): Promise<StrapiCategory[]> {
  return fetchApi<StrapiCategory[]>('/categories', { populate: '*' })
}
