/**
 * Unit tests for getProducts pagination param building
 * Tests that GetProductsParams are correctly mapped to Strapi query strings
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProducts } from '@/lib/api'

// Mock the global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('getProducts pagination params', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [],
          meta: { pagination: { page: 1, pageSize: 8, pageCount: 1, total: 0 } },
        }),
    })
    vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://127.0.0.1:1337')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('backward-compatible: no args returns all products (calls with populate only)', async () => {
    const result = await getProducts()

    expect(Array.isArray(result)).toBe(true)
    expect(mockFetch).toHaveBeenCalled()
    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('/api/products')
    expect(callUrl).toContain('populate=*')
    expect(callUrl).not.toContain('pagination[')
  })

  it('builds pagination[page] and pagination[pageSize] correctly', async () => {
    await getProducts({ page: 2, pageSize: 8 })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('pagination%5Bpage%5D=2')
    expect(callUrl).toContain('pagination%5BpageSize%5D=8')
  })

  it('builds category filter with slug syntax', async () => {
    await getProducts({ category: 'deportivo' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain(
      encodeURIComponent('filters[category][slug][$eq]') + '=deportivo'
    )
  })

  it('maps sort price-asc to Strapi price:asc', async () => {
    await getProducts({ sort: 'price-asc' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('sort=price%3Aasc')
  })

  it('maps sort price-desc to Strapi price:desc', async () => {
    await getProducts({ sort: 'price-desc' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('sort=price%3Adesc')
  })

  it('maps sort name-asc to Strapi name:asc', async () => {
    await getProducts({ sort: 'name-asc' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('sort=name%3Aasc')
  })

  it('maps sort name-desc to Strapi name:desc', async () => {
    await getProducts({ sort: 'name-desc' })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('sort=name%3Adesc')
  })

  it('combines all params in a single request', async () => {
    await getProducts({
      page: 3,
      pageSize: 8,
      category: 'dress',
      sort: 'price-asc',
    })

    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('pagination%5Bpage%5D=3')
    expect(callUrl).toContain('pagination%5BpageSize%5D=8')
    expect(callUrl).toContain(
      encodeURIComponent('filters[category][slug][$eq]') + '=dress'
    )
    expect(callUrl).toContain('sort=price%3Aasc')
  })

  it('returns ProductsResponse envelope with pagination metadata', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ id: 1, name: 'Test Watch' }],
          meta: {
            pagination: { page: 1, pageSize: 8, pageCount: 3, total: 20 },
          },
        }),
    })

    const result = await getProducts({ page: 1, pageSize: 8 })

    expect(Array.isArray(result)).toBe(false)
    expect(result).toHaveProperty('products')
    expect(result).toHaveProperty('pagination')
    expect((result as any).pagination.pageCount).toBe(3)
    expect((result as any).pagination.total).toBe(20)
  })
})
