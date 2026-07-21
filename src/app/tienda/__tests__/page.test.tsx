import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Breadcrumb } from '@/types/breadcrumb'
import CatalogContent from '../CatalogContent'

interface ShopLoopHeadMockProps {
  breadcrumbs: Breadcrumb[]
}

const testState = vi.hoisted(() => ({
  getCategories: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => testState.searchParams,
}))

vi.mock('@/lib/api', () => ({
  getCategories: testState.getCategories,
}))

vi.mock('@/features/catalog/hooks/useProducts', () => ({
  useProducts: () => ({
    products: [],
    pagination: { total: 0 },
    isLoading: false,
    hasMore: false,
    loadMore: vi.fn(),
  }),
}))

vi.mock('@/features/catalog', () => ({
  ProductCard: () => null,
  ShopLoopHead: ({ breadcrumbs }: ShopLoopHeadMockProps) => (
    <ol data-testid="breadcrumbs">
      {breadcrumbs.map(({ name, href }) => (
        <li key={href} data-testid="breadcrumb-item">
          {name}
        </li>
      ))}
    </ol>
  ),
}))

function setSearchParams(query: string) {
  testState.searchParams = new URLSearchParams(query)
}

function getBreadcrumbNames() {
  return screen.getAllByTestId('breadcrumb-item').map(item => item.textContent)
}

const noCategories: Array<{ name: string; slug: string }> = []
const categoriesWithCronometros = [
  { name: 'Cronómetros', slug: 'cronometros' },
]

describe('CatalogContent — /tienda breadcrumbs (client component)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSearchParams('')
  })

  afterEach(() => {
    cleanup()
  })

  it('uses the SSR breadcrumb on first render (no flicker, no client re-fetch needed)', () => {
    // Server wrapper pre-computes the SSR breadcrumb with full category data.
    const ssrBreadcrumbs: Breadcrumb[] = [
      { name: 'Inicio', href: '/' },
      { name: 'Tienda', href: '/tienda' },
      { name: 'Cronómetros', href: '/tienda?category=cronometros' },
    ]

    render(
      <CatalogContent
        ssrCategories={categoriesWithCronometros}
        ssrCategorySlug="cronometros"
        ssrBreadcrumbs={ssrBreadcrumbs}
      />
    )

    // First render uses ssrBreadcrumbs verbatim — no need to wait for client re-fetch.
    expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda', 'Cronómetros'])
  })

  it('keeps two items when no category is selected and no SSR categories provided', () => {
    const ssrBreadcrumbs: Breadcrumb[] = [
      { name: 'Inicio', href: '/' },
      { name: 'Tienda', href: '/tienda' },
    ]

    render(
      <CatalogContent
        ssrCategories={noCategories}
        ssrCategorySlug={null}
        ssrBreadcrumbs={ssrBreadcrumbs}
      />
    )

    expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda'])
  })

  it('uses live URL categorySlug after client navigation (different from SSR)', async () => {
    // SSR knew about category=A; URL now says category=B. Live slug wins.
    const ssrBreadcrumbs: Breadcrumb[] = [
      { name: 'Inicio', href: '/' },
      { name: 'Tienda', href: '/tienda' },
      { name: 'Vintage Round', href: '/tienda?category=vintage-round' },
    ]
    const liveCategories = [
      { name: 'Vintage Round', slug: 'vintage-round' },
      { name: 'Cronómetros', slug: 'cronometros' },
    ]

    // Set the mock BEFORE render so the useEffect-fetch resolves to it.
    testState.getCategories.mockResolvedValue(liveCategories)
    setSearchParams('category=cronometros')

    render(
      <CatalogContent
        ssrCategories={[{ name: 'Vintage Round', slug: 'vintage-round' }]}
        ssrCategorySlug="vintage-round"
        ssrBreadcrumbs={ssrBreadcrumbs}
      />
    )

    // First paint: liveCategorySlug='cronometros' but categories still SSR.
    //   → render falls back to useMemo result with categories=[Vintage Round]
    //     → no match for 'cronometros' → raw slug label "cronometros"
    // After useEffect re-fetch + setState: categories=[Vintage Round, Cronómetros]
    //   → useMemo re-derives with categorySlug='cronometros' → match → "Cronómetros"
    await waitFor(
      () => {
        expect(getBreadcrumbNames()).toEqual([
          'Inicio',
          'Tienda',
          'Cronómetros',
        ])
      },
      { timeout: 2000 }
    )
  })

  it('ignores sort and page query parameters (only category affects crumbs)', () => {
    const ssrBreadcrumbs: Breadcrumb[] = [
      { name: 'Inicio', href: '/' },
      { name: 'Tienda', href: '/tienda' },
      { name: 'Cronómetros', href: '/tienda?category=cronometros' },
    ]
    // Mock a search params that has sort/page (should be ignored).
    setSearchParams('category=cronometros&sort=price-asc&page=2')

    render(
      <CatalogContent
        ssrCategories={categoriesWithCronometros}
        ssrCategorySlug="cronometros"
        ssrBreadcrumbs={ssrBreadcrumbs}
      />
    )

    expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda', 'Cronómetros'])
  })
})