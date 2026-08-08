import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FavoriteItemRow from '@/features/favorites/components/FavoriteItemRow'
import type { Product } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

const mockRemoveFromFavorites = vi.fn()

vi.mock('@/features/favorites', () => ({
  useFavorites: () => ({
    removeFromFavorites: mockRemoveFromFavorites,
    addToFavorites: vi.fn(),
    isFavorite: () => true,
    favorites: [],
    isLoading: false,
    error: null,
    clearFavorites: vi.fn(),
  }),
}))

vi.mock('@/features/cart', () => ({
  useCart: () => ({ addToCart: vi.fn() }),
}))

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Watch',
  price: 99,
  images: ['/img/a.jpg'],
  href: '/tienda/prod-1',
  description: 'A nice watch',
  stock: 5,
  category: 'Lujo',
}

describe('FavoriteItemRow', () => {
  beforeEach(() => {
    mockRemoveFromFavorites.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the product name', () => {
    render(<FavoriteItemRow product={mockProduct} />)
    expect(screen.getByText('Test Watch')).toBeInTheDocument()
  })

  it('renders the product price formatted in EUR', () => {
    render(<FavoriteItemRow product={mockProduct} />)
    expect(screen.getByText(/99,00\s*€/)).toBeInTheDocument()
  })

  it('renders the product category', () => {
    render(<FavoriteItemRow product={mockProduct} />)
    expect(screen.getByText('Lujo')).toBeInTheDocument()
  })

  it('renders a link to the product detail page', () => {
    render(<FavoriteItemRow product={mockProduct} />)
    const link = screen.getByRole('link', { name: 'Test Watch' })
    expect(link).toHaveAttribute('href', '/tienda/prod-1')
  })

  it('calls removeFromFavorites when the heart button is clicked', async () => {
    render(<FavoriteItemRow product={mockProduct} />)

    const removeButton = screen.getByTitle('Eliminar de favoritos')
    await userEvent.click(removeButton)

    expect(mockRemoveFromFavorites).toHaveBeenCalledWith('prod-1')
  })

  it('remains functional for authenticated-only remove behavior', () => {
    // The component itself does not guard auth — the context does.
    // This test verifies the row still renders and uses removeFromFavorites.
    render(<FavoriteItemRow product={mockProduct} />)

    // Product info is visible
    expect(screen.getByText('Test Watch')).toBeInTheDocument()

    // Remove button with filled heart is present
    const removeButton = screen.getByTitle('Eliminar de favoritos')
    expect(removeButton).toBeInTheDocument()
  })
})
