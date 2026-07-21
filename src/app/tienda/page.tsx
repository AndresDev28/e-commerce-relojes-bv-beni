'use client'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard, ShopLoopHead } from '@/features/catalog'
import { useProducts } from '@/features/catalog/hooks/useProducts'
import { getCategories } from '@/lib/api'
import type { StrapiCategory } from '@/types'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'

function CatalogContent() {
  const { products, pagination, isLoading, hasMore, loadMore } = useProducts()
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')

  // Fetch categories once on mount
  const [categories, setCategories] = useState<
    { name: string; slug: string }[]
  >([])

  useEffect(() => {
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
   * Breadcrumbs depend only on the resolved categories and category slug.
   * Tracking both prevents stale labels while intentionally ignoring unrelated
   * sort and page query parameters.
   */
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs({ route: 'tienda', categorySlug, categories }),
    [categories, categorySlug]
  )

  // totalResults uses pagination.total when available, otherwise current products length
  const totalResults = pagination?.total ?? products.length

  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-8">
          Todos los relojes
        </h2>

        <ShopLoopHead
          breadcrumbs={breadcrumbs}
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <section className="bg-white py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-sans font-bold text-center text-dark mb-8">
              Todos los relojes
            </h2>
            <div className="text-center py-8">
              <p className="text-lg">Cargando catálogo...</p>
            </div>
          </div>
        </section>
      }
    >
      <CatalogContent />
    </Suspense>
  )
}
