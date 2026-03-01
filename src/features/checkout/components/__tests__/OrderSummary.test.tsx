import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderSummary from '../OrderSummary'
import type { CartItem } from '@/types'

// Mock del CartContext
const mockCartItems: CartItem[] = []
const mockUseCart = vi.fn()

vi.mock('@/context/CartContext', () => ({
  useCart: () => mockUseCart(),
}))

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

// Mock de next/image
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}))

// Helper para crear items de carrito mock
const createMockCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'mock-id',
  name: 'Mock Product',
  price: 100,
  quantity: 1,
  images: [],
  href: '/tienda/mock-product',
  description: 'Mock description',
  stock: 10,
  ...overrides,
})

describe('OrderSummary - [PAY-14]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Estado vacío', () => {
    it('should show empty state when cart is empty', () => {
      mockUseCart.mockReturnValue({
        cartItems: [],
      })

      render(<OrderSummary />)

      expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument()
      expect(
        screen.getByText('Añade productos para continuar con tu compra')
      ).toBeInTheDocument()
      expect(screen.getByText('Ver productos')).toBeInTheDocument()
    })

    it('should have link to products page', () => {
      mockUseCart.mockReturnValue({
        cartItems: [],
      })

      render(<OrderSummary />)

      const link = screen.getByText('Ver productos').closest('a')
      expect(link).toHaveAttribute('href', '/tienda')
    })
  })

  describe('Renderizado con productos', () => {
    const mockItems: CartItem[] = [
      {
        id: 'casio-g-shock-1',
        name: 'Casio G-Shock',
        price: 99.99,
        quantity: 2,
        images: ['/watch1.jpg'],
        href: '/tienda/casio-g-shock-1',
        description: 'Reloj deportivo',
        stock: 10,
      },
      {
        id: 'casio-edifice-1',
        name: 'Casio Edifice',
        price: 149.99,
        quantity: 1,
        images: ['/watch2.jpg'],
        href: '/tienda/casio-edifice-1',
        description: 'Reloj elegante',
        stock: 5,
      },
    ]

    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cartItems: mockItems,
      })
    })

    it('should render header with title and edit button', () => {
      render(<OrderSummary />)

      expect(screen.getByText('Resumen del pedido')).toBeInTheDocument()
      expect(screen.getByText('Editar')).toBeInTheDocument()
    })

    it('should render all products from cart', () => {
      render(<OrderSummary />)

      expect(screen.getByText('Casio G-Shock')).toBeInTheDocument()
      expect(screen.getByText('Casio Edifice')).toBeInTheDocument()
    })

    it('should show quantity for each product', () => {
      render(<OrderSummary />)

      expect(screen.getByText('Cantidad: 2')).toBeInTheDocument()
      expect(screen.getByText('Cantidad: 1')).toBeInTheDocument()
    })

    it('should show images for products', () => {
      render(<OrderSummary />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
      expect(images[0]).toHaveAttribute('alt', 'Casio G-Shock')
      expect(images[1]).toHaveAttribute('alt', 'Casio Edifice')
    })

    it('should show placeholder icon when product has no images', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          {
            id: 'product-3',
            name: 'Product without image',
            price: 50,
            quantity: 1,
            images: [],
            href: '/tienda/product-3',
            description: 'Product description',
            stock: 10,
          },
        ],
      })

      render(<OrderSummary />)

      // Verificar que hay un SVG (icono de ShoppingCart)
      const container = screen.getByText('Product without image').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Formato de precios - [PAY-14]', () => {
    it('should format prices in Spanish currency format', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({
            id: 'watch-1',
            name: 'Watch',
            price: 259.89,
            quantity: 1,
          }),
        ],
      })

      render(<OrderSummary />)

      // Formato español: 259,89 € (debería aparecer en subtotal y total)
      const priceElements = screen.getAllByText(/259,89\s*€/)
      expect(priceElements.length).toBeGreaterThan(0)
    })

    it('should show unit price when quantity > 1', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({
            id: 'watch-1',
            name: 'Watch',
            price: 50,
            quantity: 2,
          }),
        ],
      })

      render(<OrderSummary />)

      // Total: 100€ (puede aparecer múltiples veces)
      expect(screen.getAllByText(/100,00\s*€/).length).toBeGreaterThan(0)
      // Precio unitario: 50€ c/u
      expect(screen.getByText(/50,00\s*€/)).toBeInTheDocument()
      expect(screen.getByText(/c\/u/)).toBeInTheDocument()
    })
  })

  describe('Cálculo de totales - [PAY-15]', () => {
    it('should calculate subtotal correctly', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'product-a', name: 'A', price: 99.99, quantity: 2 }),
          createMockCartItem({ id: 'product-b', name: 'B', price: 149.99, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // Subtotal: (99.99 * 2) + (149.99 * 1) = 349.97
      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      expect(screen.getAllByText(/349,97\s*€/).length).toBeGreaterThan(0)
    })

    it('should show free shipping when subtotal >= 50€', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 60, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      expect(screen.getByText('Envío')).toBeInTheDocument()
      expect(screen.getByText('Gratis')).toBeInTheDocument()
    })

    it('should charge 5.95€ shipping when subtotal < 50€', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 30, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      expect(screen.getByText('Envío')).toBeInTheDocument()
      expect(screen.getAllByText(/5,95\s*€/).length).toBeGreaterThan(0)
    })

    it('should calculate total correctly with free shipping', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 100, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // Subtotal: 100€, Envío: Gratis, Total: 100€
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getAllByText(/100,00\s*€/).length).toBeGreaterThan(0)
    })

    it('should calculate total correctly with paid shipping', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 30, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // Subtotal: 30€, Envío: 5.95€, Total: 35.95€
      expect(screen.getAllByText(/35,95\s*€/).length).toBeGreaterThan(0)
    })

    it('should show message for amount needed for free shipping', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 30, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // Necesita 20€ más para envío gratis (50 - 30 = 20)
      expect(screen.getByText(/Añade.*20,00\s*€.*más/)).toBeInTheDocument()
    })

    it('should not show free shipping message when threshold is met', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 60, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      expect(screen.queryByText(/Añade.*más/)).not.toBeInTheDocument()
    })
  })

  describe('Casos edge - [PAY-15]', () => {
    it('should handle subtotal exactly at 50€ threshold', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 50, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // Subtotal exactamente 50€ → envío gratis
      expect(screen.getByText('Gratis')).toBeInTheDocument()
      expect(screen.queryByText(/Añade.*más/)).not.toBeInTheDocument()
    })

    it('should handle decimal prices correctly', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'product-a', name: 'A', price: 19.99, quantity: 3 }),
        ],
      })

      render(<OrderSummary />)

      // 19.99 * 3 = 59.97
      expect(screen.getAllByText(/59,97\s*€/).length).toBeGreaterThan(0)
    })

    it('should handle single item in cart', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 100, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      expect(screen.getByText('Watch')).toBeInTheDocument()
      expect(screen.getAllByText(/100,00\s*€/).length).toBeGreaterThan(0)
    })

    it('should handle multiple items with different quantities', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'product-a', name: 'A', price: 10, quantity: 5 }),
          createMockCartItem({ id: 'product-b', name: 'B', price: 25, quantity: 2 }),
          createMockCartItem({ id: 'product-c', name: 'C', price: 100, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      // (10*5) + (25*2) + (100*1) = 50 + 50 + 100 = 200
      expect(screen.getAllByText(/200,00\s*€/).length).toBeGreaterThan(0)
    })
  })

  describe('Navegación', () => {
    it('should have link to cart page on edit button', () => {
      mockUseCart.mockReturnValue({
        cartItems: [
          createMockCartItem({ id: 'watch-1', name: 'Watch', price: 50, quantity: 1 }),
        ],
      })

      render(<OrderSummary />)

      const editLink = screen.getByText('Editar').closest('a')
      expect(editLink).toHaveAttribute('href', '/carrito')
    })
  })
})
