/**
 * Unit tests for useProducts hook — deduplication behavior.
 * Verifies that duplicate product IDs across pages are reduced to first occurrence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProducts } from '../useProducts'

// Mock next/navigation
const mockSearchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/tienda',
}))

// Mock getProducts
vi.mock('@/lib/api', () => ({
  getProducts: vi.fn(),
}))

import { getProducts } from '@/lib/api'

const mockGetProducts = vi.mocked(getProducts)

function makeProduct(id: number, name: string) {
  return {
    id,
    name,
    price: 100,
    slug: `product-${id}`,
    description: null,
    stock: 10,
    images: [],
    category: { id: 1, name: 'Test', slug: 'test' },
  }
}

const mockPagination = {
  page: 1,
  pageSize: 8,
  pageCount: 2,
  total: 16,
}

describe('useProducts deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.set('page', '1')
    mockSearchParams.delete('category')
    mockSearchParams.delete('sort')
  })

  it('deduplicates products when same ID appears on multiple pages', async () => {
    // Page 1: products 1-8
    const page1Products = Array.from({ length: 8 }, (_, i) =>
      makeProduct(i + 1, `Product ${i + 1}`)
    )

    // Page 2: products 9-16, but ID 3 is duplicated (should be filtered out)
    const page2Products = [
      makeProduct(3, 'Product 3 duplicate'), // duplicate of page 1 ID 3
      ...Array.from({ length: 7 }, (_, i) =>
        makeProduct(i + 9, `Product ${i + 9}`)
      ),
    ]

    mockGetProducts
      .mockResolvedValueOnce({
        products: page1Products,
        pagination: { ...mockPagination },
      })
      .mockResolvedValueOnce({
        products: page2Products,
        pagination: { ...mockPagination },
      })

    // Simulate refresh with page=2 (triggers parallel fetch of pages 1..2)
    mockSearchParams.set('page', '2')

    const { result } = renderHook(() => useProducts())

    // Wait for the async effect to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 5000,
    })

    // Should have 15 unique products (16 total minus 1 duplicate)
    const ids = result.current.products.map(p => p.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(15)
    expect(ids.length).toBe(15)

    // The first occurrence of ID 3 should be kept (from page 1)
    const product3 = result.current.products.find(p => p.id === '3')
    expect(product3?.name).toBe('Product 3')
  })

  it('returns unique products when no duplicates exist', async () => {
    const page1Products = Array.from({ length: 8 }, (_, i) =>
      makeProduct(i + 1, `Product ${i + 1}`)
    )

    mockGetProducts.mockResolvedValueOnce({
      products: page1Products,
      pagination: { ...mockPagination, pageCount: 1, total: 8 },
    })

    mockSearchParams.set('page', '1')

    const { result } = renderHook(() => useProducts())

    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 5000,
    })

    expect(result.current.products.length).toBe(8)
    const ids = result.current.products.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(8)
  })
})
