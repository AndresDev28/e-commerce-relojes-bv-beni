import { Suspense } from 'react'
import { getCategories } from '@/lib/api'
import { buildBreadcrumbs } from '@/utils/breadcrumbs'
import CatalogContent from './CatalogContent'

/**
 * Server component for /tienda.
 *
 * Pre-fetches categories via getCategories() and computes the SSR breadcrumb
 * list (with the live categorySlug from searchParams) BEFORE rendering.
 * This ensures the SSR HTML already includes the full 3-level crumb
 * (Inicio / Tienda / [Category]) — no client-side flicker.
 *
 * The <Suspense> wrapping CatalogContent is required by Next 15 because
 * CatalogContent uses useSearchParams() (a client hook that triggers
 * static bailout). The fallback shows only the catalog header; the actual
 * product grid and breadcrumb appear after hydration.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category: rawCategory } = await searchParams
  const ssrCategorySlug = rawCategory ?? null

  // Pre-fetch categories server-side so the SSR breadcrumb can resolve the
  // category name. Tolerate fetch failure by falling back to an empty list
  // (transient state — useMemo in CatalogContent will re-derive on the
  // client re-fetch).
  let ssrCategories: Array<{ name: string; slug: string }> = []
  try {
    const fetched = await getCategories()
    ssrCategories = fetched
      .filter((c) => Boolean(c && c.name && c.slug))
      .map((c) => ({ name: c.name as string, slug: c.slug as string }))
  } catch (error) {
    console.error('[products-page] getCategories failed:', error)
  }

  const ssrBreadcrumbs = buildBreadcrumbs({
    route: 'tienda',
    categorySlug: ssrCategorySlug,
    categories: ssrCategories,
  })

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
      <CatalogContent
        ssrCategories={ssrCategories}
        ssrCategorySlug={ssrCategorySlug}
        ssrBreadcrumbs={ssrBreadcrumbs}
      />
    </Suspense>
  )
}