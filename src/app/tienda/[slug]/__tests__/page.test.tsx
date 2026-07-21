import { describe, expect, it, vi } from 'vitest'
import type { StrapiProduct } from '@/types'
import ProductDetailPage from '../page'

const { getProductBySlug } = vi.hoisted(() => ({
  getProductBySlug: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getProductBySlug,
}))

vi.mock('@/features/catalog', () => ({
  ProductDetailClient: (props: unknown) => props,
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}))

const createProduct = (
  category: StrapiProduct['category'],
): StrapiProduct => ({
  id: 1,
  name: 'Classic Watch',
  price: 199,
  slug: 'classic-watch',
  description: 'A classic watch',
  stock: 3,
  category,
})

const breadcrumbNames = (result: unknown) =>
  (result as { props: { breadcrumbs: Array<{ name: string }> } }).props.breadcrumbs.map(
    breadcrumb => breadcrumb.name,
  )

describe('/tienda/[slug] breadcrumb wiring', () => {
  it.each([
    {
      label: 'category object',
      category: { id: 2, name: 'Classic', slug: 'classic' },
    },
    {
      label: 'category array',
      category: [{ id: 2, name: 'Classic', slug: 'classic' }],
    },
  ])('renders four levels when product has a $label', async ({ category }) => {
    getProductBySlug.mockResolvedValueOnce(createProduct(category))

    const result = await ProductDetailPage({
      params: Promise.resolve({ slug: 'classic-watch' }),
    })

    expect(breadcrumbNames(result)).toEqual([
      'Inicio',
      'Tienda',
      'Classic',
      'Classic Watch',
    ])
  })

  it.each([
    { label: 'null category', category: null },
    { label: 'undefined category', category: undefined },
    { label: 'empty category array', category: [] },
    { label: 'empty category object', category: {} },
  ])('renders three levels for an empty product category ($label)', async ({ category }) => {
    getProductBySlug.mockResolvedValueOnce(createProduct(category as StrapiProduct['category']))

    const result = await ProductDetailPage({
      params: Promise.resolve({ slug: 'classic-watch' }),
    })

    expect(breadcrumbNames(result)).toEqual(['Inicio', 'Tienda', 'Classic Watch'])
  })
})
