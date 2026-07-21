'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard, ShopLoopHead } from '@/features/catalog'
import { useProducts } from '@/features/catalog/hooks/useProducts'
import { getCategories } from '@/lib/api'
import type { StrapiCategory } from '@/types'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'
import type { Breadcrumb } from '@/types/breadcrumb'

export interface CatalogContentProps {
  /** Categories pre-fetched server-side (so the SSR HTML already has 3-level crumbs). */
  ssrCategories: Array<{ name: string; slug: string }>
  /** categorySlug from searchParams, passed in so SSR can compute the crumb. */
  ssrCategorySlug: string | null
  /** SSR-computed breadcrumb list (used until client takes over). */
  ssrBreadcrumbs: Breadcrumb[]
}

/**
 * Client subcomponent for /tienda. Server wrapper (page.tsx) pre-fetches
 * categories via getCategories() and computes the initial breadcrumb, so
 * the SSR HTML renders the full 3-level crumb immediately — no flicker.
 *
 * The client may refresh `categories` (e.g., after a Strapi update) and
 * `useMemo` re-derives the breadcrumb from the latest state.
 */
export default function CatalogContent({
  ssrCategories,
  ssrCategorySlug,
  ssrBreadcrumbs,
}: CatalogContentProps) {
  const { products, pagination, isLoading, hasMore, loadMore } = useProducts()
  const searchParams = useSearchParams()
  // Client-side categorySlug reflects URL state changes after hydration.
  // Prefer the live URL value; fall back to the SSR-provided one.
  const liveCategorySlug = searchParams.get('category') ?? ssrCategorySlug

  // Initialise with the SSR-provided categories so the first paint already
  // has the right data; subsequent updates can refresh.
  const [categories, setCategories] = useState<
    { name: string; slug: string }[]
  >(ssrCategories)

  useEffect(() => {
    // Re-fetch once on mount to pick up changes since SSR.
    async function fetchCategories() {
      try {
        const fetched = await getCategories()
        setCategories(
          fetched
            .filter((c): c is StrapiCategory => Boolean(c && c.name && c.slug))
            .map(c => ({ name: c.name, slug: c.slug }))
        )
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  /**
   * Live breadcrumb list. On the very first render (SSR + first hydrate)
   * it equals `ssrBreadcrumbs` because categories === ssrCategories and
   * liveCategorySlug === ssrCategorySlug. After a client-side category
   * fetch, useMemo re-derives with the freshest state.
   */
  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbs({
        route: 'tienda',
        categorySlug: liveCategorySlug,
        categories,
      }),
    [categories, liveCategorySlug]
  )

  // totalResults uses pagination.total when available, otherwise current products length
  const totalResults = pagination?.total ?? products.length

  // If the live URL differs from SSR (deep-link / back-forward), prefer
  // the freshly-derived breadcrumb; otherwise the SSR one is identical
  // and we use it to avoid an unnecessary re-render.
  const renderedBreadcrumbs =
    liveCategorySlug === ssrCategorySlug &&
    categories === ssrCategories
      ? ssrBreadcrumbs
      : breadcrumbs

  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-8">
          Todos los relojes
        </h2>

        <ShopLoopHead
          breadcrumbs={renderedBreadcrumbs}
          totalResults={totalResults}
          categories={categories}
        />

        {/* Indicador de carga */}
        {isLoading && products.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg">Cargando productos...</p>
          </div>
        )}

        {/* Cuadrícula de Productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Mensaje si no hay productos */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg">No se encontraron productos.</p>
          </div>
        )}

        {/* Load More button */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="px-6 py-3 bg-primary text-white font-sans rounded hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}