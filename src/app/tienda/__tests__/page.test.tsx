import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Breadcrumb } from '@/types/breadcrumb'
import ProductsPage from '../page'

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

describe('/tienda breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSearchParams('')
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps two items and hides the slug while categories are unresolved', () => {
    setSearchParams('category=cronometros')
    testState.getCategories.mockReturnValue(new Promise<never>(() => {}))

    render(<ProductsPage />)

    expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda'])
    expect(screen.queryByText('cronometros')).not.toBeInTheDocument()
  })

  it('uses the category display name after categories resolve', async () => {
    setSearchParams('category=cronometros')
    testState.getCategories.mockResolvedValue([
      { name: 'Cronómetros', slug: 'cronometros' },
    ])

    render(<ProductsPage />)

    await waitFor(() => {
      expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda', 'Cronómetros'])
    })
  })

  it('falls back to the raw slug when resolved categories have no match', async () => {
    setSearchParams('category=legacy-line')
    testState.getCategories.mockResolvedValue([
      { name: 'Cronómetros', slug: 'cronometros' },
    ])

    render(<ProductsPage />)

    await waitFor(() => {
      expect(getBreadcrumbNames()).toEqual(['Inicio', 'Tienda', 'legacy-line'])
    })
  })

  it('ignores sort and page query parameters', async () => {
    const categories = [{ name: 'Cronómetros', slug: 'cronometros' }]
    testState.getCategories.mockResolvedValue(categories)
    setSearchParams('category=cronometros')

    const firstRender = render(<ProductsPage />)

    await waitFor(() => {
      expect(getBreadcrumbNames()).toHaveLength(3)
    })
    const categoryOnly = getBreadcrumbNames()
    firstRender.unmount()

    setSearchParams('category=cronometros&sort=price-asc&page=2')
    render(<ProductsPage />)

    await waitFor(() => {
      expect(getBreadcrumbNames()).toEqual(categoryOnly)
    })
  })
})
