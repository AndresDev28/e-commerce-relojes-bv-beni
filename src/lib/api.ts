// src/lib/api.ts

import { StrapiProduct, StrapiCategory, PaginationMeta, GetProductsParams, ProductsResponse } from '@/types'

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
 * Función central para hacer llamadas a la API de Strapi.
 * @param endpoint - El endpoint de la API a consultar (ej. '/products').
 * @param query - Un objeto con los parámetros de la query (ej. { populate: '*' }).
 * @returns La propiedad 'data' de la respuesta de la API.
 */
async function fetchApi<T>(
  endpoint: string,
  query?: Record<string, string>
): Promise<T> {
  const apiUrl =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://127.0.0.1:1337'

  const url = new URL(`/api${endpoint}`, apiUrl)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  console.log(`Fetching from URL: ${url.toString()}`)

  try {
    const response = await fetch(url.toString(), { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(
        `Failed to fetch API: ${response.status} ${response.statusText}`
      )
    }
    const data: StrapiApiResponse<T> = await response.json()
    return data.data
  } catch (error) {
    console.error('API fetch error:', error)
    throw error // Relanza el error para que el componente que llama pueda manejarlo
  }
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
export async function getProducts(params: GetProductsParams): Promise<ProductsResponse>

export async function getProducts(params?: GetProductsParams): Promise<StrapiProduct[] | ProductsResponse> {
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

  // Ordenamiento — mapear formato UI a formato Strapi (price:asc)
  if (params.sort) {
    const sortMap: Record<string, string> = {
      'price-asc': 'price:asc',
      'price-desc': 'price:desc',
      'name-asc': 'name:asc',
      'name-desc': 'name:desc',
    }
    query['sort'] = sortMap[params.sort] ?? params.sort
  }

  const data = await fetchApi<StrapiProduct[]>('/products', query)

  // fetchApi returns data.data (the array), but we need meta.pagination too.
  // We need to call fetchApi differently to get the full response with meta.
  // Let's use a direct approach for paginated calls.
  const apiUrl =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://127.0.0.1:1337'

  const url = new URL(`/api/products`, apiUrl)
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
  }

  const fullResponse: {
    data: StrapiProduct[]
    meta: { pagination: PaginationMeta }
  } = await response.json()

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
