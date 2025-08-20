// src/lib/api.ts

import { StrapiProduct, StrapiCategory } from '@/types'

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
    process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL
  if (!apiUrl) {
    throw new Error(
      'STRAPI_API_URL or NEXT_PUBLIC_STRAPI_API_URL is not defined in environment variables.'
    )
  }

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
// Función para obtener todos los productos
export async function getProducts(): Promise<StrapiProduct[]> {
  return fetchApi<StrapiProduct[]>('/products', { populate: '*' })
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
