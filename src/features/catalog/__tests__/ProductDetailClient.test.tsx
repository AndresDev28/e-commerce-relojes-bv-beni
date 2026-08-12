/**
 * Integration tests for ProductDetailClient (UXW-03).
 *
 * Verifies the markdown→HTML pipeline: a converted blocks description
 * (already a markdown string at this layer) renders as <p>, <h2>, <strong>,
 * <em>, and an empty description renders the fallback message. The
 * Strapi→markdown conversion itself is unit-tested in blocks.test.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProductDetailClient from '../components/ProductDetailClient'
import type { Product } from '@/types'
import type { Breadcrumb } from '@/types/breadcrumb'

vi.mock('next/image', () => ({
  default: ({ fill, sizes, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}))

vi.mock('@/features/cart', () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}))

vi.mock('@/features/favorites', () => ({
  useFavorites: () => ({
    isFavorite: () => false,
    error: null,
    clearError: vi.fn(),
  }),
}))

vi.mock('@/features/favorites/hooks/useFavoriteAuthPrompt', () => ({
  useFavoriteAuthPrompt: () => ({
    showAuthPrompt: false,
    handleToggleFavorite: vi.fn(),
    goToLogin: vi.fn(),
  }),
}))

const breadcrumbs: Breadcrumb[] = [
  { name: 'Inicio', href: '/' },
  { name: 'Tienda', href: '/tienda' },
  { name: 'Classic Watch', href: '/tienda/classic-watch' },
]

const makeProduct = (description: string): Product => ({
  id: '1',
  name: 'Classic Watch',
  price: 199,
  images: ['/images/watch.jpg'],
  href: '/tienda/classic-watch',
  description,
  stock: 3,
})

describe('ProductDetailClient — markdown rendering', () => {
  it('renders a plain paragraph description as a <p> element', () => {
    render(
      <ProductDetailClient
        product={makeProduct('A classic watch description')}
        breadcrumbs={breadcrumbs}
      />,
    )
    expect(screen.getByText('A classic watch description')).toBeInTheDocument()
  })

  it('preserves a heading block level as <h2>', () => {
    render(
      <ProductDetailClient
        product={makeProduct('## Especificaciones\n\nDetalles del reloj.')}
        breadcrumbs={breadcrumbs}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Especificaciones' }),
    ).toBeInTheDocument()
  })

  it('renders bold and italic inlines as <strong> and <em>', () => {
    const { container } = render(
      <ProductDetailClient
        product={makeProduct('**Bold** and *italic*')}
        breadcrumbs={breadcrumbs}
      />,
    )
    const strong = container.querySelector('strong')
    const em = container.querySelector('em')
    expect(strong).not.toBeNull()
    expect(strong!.textContent).toBe('Bold')
    expect(em).not.toBeNull()
    expect(em!.textContent).toBe('italic')
  })

  it('renders the fallback message when the description is empty', () => {
    render(
      <ProductDetailClient
        product={makeProduct('')}
        breadcrumbs={breadcrumbs}
      />,
    )
    expect(
      screen.getByText(/No hay descripción disponible/),
    ).toBeInTheDocument()
  })
})
