'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { getProducts } from '@/lib/api'
import type { StrapiProduct, StrapiImage, Product, PaginationMeta } from '@/types'

const DEFAULT_PAGE_SIZE = 8

/**
 * Transform a StrapiProduct to the application Product type.
 * Shared logic between useProducts and the existing page.tsx mapping.
 */
function formatProduct(strapiProduct: StrapiProduct): Product {
  const strapiApiUrl =
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    process.env.STRAPI_API_URL ||
    'http://127.0.0.1:1337'

  const mediaData = strapiProduct.images ?? strapiProduct.image ?? null
  const imagesArray: StrapiImage[] = Array.isArray(mediaData)
    ? mediaData
    : mediaData
      ? [mediaData]
      : []

  const images = imagesArray.map(img => {
    if (!img || !img.url) return '/images/empty-cart.png'
    return img.url.startsWith('http')
      ? img.url
      : `${strapiApiUrl}${img.url}`
  })

  const categoryName = Array.isArray(strapiProduct.category)
    ? strapiProduct.category[0]?.name
    : strapiProduct.category?.name

  return {
    id: strapiProduct.id.toString(),
    name: strapiProduct.name || 'Sin nombre',
    price: strapiProduct.price || 0,
    images: images.length > 0 ? images : ['/images/empty-cart.png'],
    href: `/tienda/${strapiProduct.slug || 'producto-sin-slug'}`,
    description: strapiProduct.description || '',
    category: categoryName,
    stock: strapiProduct.stock || 0,
  }
}

/**
 * useProducts hook — paginated product fetching with URL sync.
 *
 * Reads page, category, sort from URL query params.
 * Fetches products from Strapi in paginated batches.
 * Accumulates products across pages for "Load More" behavior.
 * On refresh with ?page=N, parallel-fetches pages 1..N to restore full view.
 */
export function useProducts() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const page = Number(searchParams.get('page')) || 1
  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'default'

  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Fetch a single page from Strapi and return formatted products + pagination.
   */
  const fetchPage = useCallback(
    async (pageNum: number) => {
      const params: Parameters<typeof getProducts>[0] = {
        page: pageNum,
        pageSize: DEFAULT_PAGE_SIZE,
      }
      if (category && category !== 'Todos') {
        params.category = category
      }
      if (sort && sort !== 'default') {
        params.sort = sort
      }

      const response = await getProducts(params)
      return response as { products: StrapiProduct[]; pagination: PaginationMeta }
    },
    [category, sort]
  )

  /**
   * Main effect: fetch products when URL params change.
   *
   * - On mount or page=1: fetch only page 1
   * - On refresh with page=N > 1: parallel-fetch pages 1..N to restore full view
   * - On category/sort change: reset accumulated, fetch page 1
   */
  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      setIsLoading(true)

      try {
        // Always fetch page 1 first to get pagination metadata
        const page1Result = await fetchPage(1)
        if (cancelled) return

        const formattedPage1 = page1Result.products.map(formatProduct)
        const pageCount = page1Result.pagination.pageCount

        if (page === 1) {
          // Simple case: just page 1
          if (!cancelled) {
            setProducts(formattedPage1)
            setPagination(page1Result.pagination)
          }
        } else {
          // Refresh with page=N: fetch pages 2..N in parallel and accumulate
          const targetPage = Math.min(page, pageCount)
          if (targetPage <= 1) {
            // Edge case: URL says page > 1 but only 1 page exists
            if (!cancelled) {
              setProducts(formattedPage1)
              setPagination(page1Result.pagination)
            }
          } else {
            const remainingPages = Array.from(
              { length: targetPage - 1 },
              (_, i) => i + 2
            )
            const results = await Promise.all(
              remainingPages.map(p => fetchPage(p))
            )
            if (cancelled) return

            const allProducts = [
              ...formattedPage1,
              ...results.flatMap(r => r.products.map(formatProduct)),
            ]

            if (!cancelled) {
              setProducts(allProducts)
              setPagination(page1Result.pagination)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [page, category, sort, fetchPage])

  /**
   * Load More: fetch next page and append to accumulated products.
   * Uses router.push to update URL (adds to history for back button).
   */
  const loadMore = useCallback(() => {
    if (!pagination || page >= pagination.pageCount) return

    const nextPage = page + 1
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(nextPage))
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [page, pagination, router, pathname, searchParams])

  /**
   * hasMore: true if current page < total page count.
   */
  const hasMore = pagination ? page < pagination.pageCount : false

  return {
    products,
    pagination,
    isLoading,
    hasMore,
    loadMore,
  }
}
