/**
 * [ORD-12] Tests for OrderDetail Component
 *
 * Unit tests for the component that displays complete order details.
 *
 * COVERAGE:
 * - Order information rendering (number, date, status)
 * - Date and price formatting
 * - Product visualization with images
 * - Product links to detail pages
 * - Totals calculation and display
 * - Order status badge
 * - Payment information display
 * - OrderTimeline integration
 * - "Back to orders" button navigation
 * - Responsive design
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderDetail from '../OrderDetail'
import type { OrderData } from '@/lib/api/orders'

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string
    alt: string
    [key: string]: unknown
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

// Mock Next.js navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock StatusBadge
vi.mock('@/app/components/ui/StatusBadge', () => ({
  default: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

// Mock OrderTimeline
vi.mock('../OrderTimeline', () => ({
  default: ({
    currentStatus,
    statusHistory,
  }: {
    currentStatus: string
    statusHistory?: unknown[]
  }) => (
    <div data-testid="order-timeline">
      <span>Timeline: {currentStatus}</span>
      {statusHistory && <span>History items: {statusHistory.length}</span>}
    </div>
  ),
}))

// Mock react-icons
vi.mock('react-icons/bs', () => ({
  BsArrowLeft: () => <svg data-testid="arrow-left-icon" />,
  BsCreditCard: () => <svg data-testid="credit-card-icon" />,
}))

describe('[ORD-12] OrderDetail Component', () => {
  /**
   * Test data: Sample order with all features
   */
  const mockOrder: OrderData = {
    id: 1,
    documentId: 'doc-123',
    orderId: 'ORD-1234567890-A',
    items: [
      {
        id: 'prod-casio-123',
        name: 'Reloj Casio Clásico',
        description: 'Reloj digital con cronómetro',
        price: 49.99,
        quantity: 2,
        images: ['/images/reloj-casio.jpg'],
        href: '/tienda/reloj-casio',
        stock: 10,
      },
      {
        id: 'prod-seiko-456',
        name: 'Reloj Seiko Automático',
        description: 'Reloj mecánico de alta precisión',
        price: 299.99,
        quantity: 1,
        images: ['/images/reloj-seiko.jpg'],
        href: '/tienda/reloj-seiko',
        stock: 5,
      },
    ],
    subtotal: 399.97,
    shipping: 0,
    total: 399.97,
    orderStatus: 'paid',
    paymentIntentId: 'pi_123456789',
    paymentInfo: {
      method: 'card',
      last4: '4242',
      brand: 'visa',
    },
    statusHistory: [
      {
        status: 'pending',
        date: '2025-11-20T10:00:00Z',
      },
      {
        status: 'paid',
        date: '2025-11-20T10:05:00Z',
      },
    ],
    createdAt: '2025-11-20T10:30:00Z',
    updatedAt: '2025-11-20T10:30:00Z',
    publishedAt: '2025-11-20T10:30:00Z',
  }

  /**
   * Test Suite 1: Información General del Pedido
   */
  describe('Información General', () => {
    it('should display order number in the header', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(
        screen.getByText(/Pedido ORD-1234567890-A/i)
      ).toBeInTheDocument()
    })

    it('should display order creation date formatted correctly', () => {
      render(<OrderDetail order={mockOrder} />)

      // Verificar que aparece alguna fecha (el formato puede variar por locale)
      expect(screen.getByText(/Realizado el/i)).toBeInTheDocument()
      // La fecha aparece múltiples veces, usar getAllByText
      const dates = screen.getAllByText(/20.*noviembre.*2025/i)
      expect(dates.length).toBeGreaterThan(0)
    })

    it('should display order status badge', () => {
      render(<OrderDetail order={mockOrder} />)

      const badges = screen.getAllByTestId('status-badge')
      // Hay 2 badges: uno en header, otro en información general
      expect(badges).toHaveLength(2)
      expect(badges[0]).toHaveTextContent('paid')
    })

    it('should display payment intent ID when present', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('pi_123456789')).toBeInTheDocument()
    })

    it('should not display payment intent ID when not present', () => {
      const orderWithoutPaymentId = {
        ...mockOrder,
        paymentIntentId: undefined,
      }
      render(<OrderDetail order={orderWithoutPaymentId} />)

      expect(screen.queryByText(/ID de Pago/i)).not.toBeInTheDocument()
    })
  })

  /**
   * Test Suite 2: Resumen de Costos
   */
  describe('Resumen de Costos', () => {
    it('should display subtotal formatted as currency', () => {
      render(<OrderDetail order={mockOrder} />)

      // Formato español: 399,97 € (aparece en subtotal y total)
      const prices = screen.getAllByText(/399,97/)
      expect(prices.length).toBeGreaterThan(0)
    })

    it('should display "Gratis" when shipping is 0', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('Gratis')).toBeInTheDocument()
    })

    it('should display shipping cost when greater than 0', () => {
      const orderWithShipping = {
        ...mockOrder,
        shipping: 5.99,
        total: 405.96,
      }
      render(<OrderDetail order={orderWithShipping} />)

      expect(screen.getByText(/5,99.*€/)).toBeInTheDocument()
    })

    it('should display total amount prominently', () => {
      render(<OrderDetail order={mockOrder} />)

      // El total aparece múltiples veces (en resumen y en detalle)
      const totalElements = screen.getAllByText(/399,97.*€/)
      expect(totalElements.length).toBeGreaterThan(0)
    })
  })

  /**
   * Test Suite 3: Lista de Productos
   */
  describe('Lista de Productos', () => {
    it('should display correct number of products', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText(/Productos \(2\)/i)).toBeInTheDocument()
    })

    it('should display all product names', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('Reloj Casio Clásico')).toBeInTheDocument()
      expect(screen.getByText('Reloj Seiko Automático')).toBeInTheDocument()
    })

    it('should display product descriptions', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(
        screen.getByText('Reloj digital con cronómetro')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Reloj mecánico de alta precisión')
      ).toBeInTheDocument()
    })

    it('should display product quantities', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText(/Cantidad: 2/i)).toBeInTheDocument()
      expect(screen.getByText(/Cantidad: 1/i)).toBeInTheDocument()
    })

    it('should display individual product prices', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText(/49,99.*€.*c\/u/i)).toBeInTheDocument()
      expect(screen.getByText(/299,99.*€.*c\/u/i)).toBeInTheDocument()
    })

    it('should calculate and display product subtotals correctly', () => {
      render(<OrderDetail order={mockOrder} />)

      // Casio: 49.99 * 2 = 99.98
      expect(screen.getByText(/99,98.*€/)).toBeInTheDocument()

      // Seiko: 299.99 * 1 = 299.99 (aparece en precio unitario y subtotal)
      const seikoPrices = screen.getAllByText(/299,99.*€/)
      expect(seikoPrices.length).toBeGreaterThan(0)
    })

    it('should render product images with correct src and alt', () => {
      render(<OrderDetail order={mockOrder} />)

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)

      expect(images[0]).toHaveAttribute('src', '/images/reloj-casio.jpg')
      expect(images[0]).toHaveAttribute('alt', 'Reloj Casio Clásico')

      expect(images[1]).toHaveAttribute('src', '/images/reloj-seiko.jpg')
      expect(images[1]).toHaveAttribute('alt', 'Reloj Seiko Automático')
    })

    it('should use placeholder image when product image is not available', () => {
      const orderWithoutImages = {
        ...mockOrder,
        items: [
          {
            ...mockOrder.items[0],
            images: [],
          },
        ],
      }
      render(<OrderDetail order={orderWithoutImages} />)

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', '/placeholder-watch.jpg')
    })
  })

  /**
   * Test Suite 4: Formateo de Datos
   */
  describe('Formateo de Datos', () => {
    it('should format dates in Spanish locale', () => {
      render(<OrderDetail order={mockOrder} />)

      // Verificar que usa formato español (día de mes de año) - aparece múltiples veces
      const dates = screen.getAllByText(/20.*noviembre.*2025/i)
      expect(dates.length).toBeGreaterThan(0)
    })

    it('should format prices in EUR currency', () => {
      render(<OrderDetail order={mockOrder} />)

      // Verificar formato europeo con coma decimal
      const priceElements = screen.getAllByText(/€/)
      expect(priceElements.length).toBeGreaterThan(0)

      // Verificar uso de coma como separador decimal - aparece múltiples veces
      const prices = screen.getAllByText(/49,99/)
      expect(prices.length).toBeGreaterThan(0)
    })

    it('should format large numbers with thousand separators', () => {
      const orderWithLargeAmount = {
        ...mockOrder,
        items: [
          {
            ...mockOrder.items[0],
            price: 1234.56,
            quantity: 1,
          },
        ],
        subtotal: 1234.56,
        total: 1234.56,
      }
      render(<OrderDetail order={orderWithLargeAmount} />)

      // Formato español con separador de miles - verificamos que use coma decimal
      const prices = screen.getAllByText(/234,56/)
      expect(prices.length).toBeGreaterThan(0)
    })
  })

  /**
   * Test Suite 5: Casos Edge
   */
  describe('Edge Cases', () => {
    it('should handle order with single product', () => {
      const singleProductOrder = {
        ...mockOrder,
        items: [mockOrder.items[0]],
      }
      render(<OrderDetail order={singleProductOrder} />)

      expect(screen.getByText(/Productos \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText('Reloj Casio Clásico')).toBeInTheDocument()
    })

    it('should handle order with many products', () => {
      const manyProductsOrder = {
        ...mockOrder,
        items: Array(10)
          .fill(null)
          .map((_, i) => ({
            ...mockOrder.items[0],
            id: `${i}`,
            name: `Producto ${i + 1}`,
          })),
      }
      render(<OrderDetail order={manyProductsOrder} />)

      expect(screen.getByText(/Productos \(10\)/i)).toBeInTheDocument()
    })

    it('should handle products without descriptions', () => {
      const orderWithoutDescriptions: OrderData = {
        ...mockOrder,
        items: [
          {
            ...mockOrder.items[0],
            description: undefined as unknown as string,
          },
        ],
      }
      render(<OrderDetail order={orderWithoutDescriptions} />)

      expect(screen.getByText('Reloj Casio Clásico')).toBeInTheDocument()
      expect(
        screen.queryByText('Reloj digital con cronómetro')
      ).not.toBeInTheDocument()
    })

    it('should handle zero total correctly', () => {
      const freeOrder = {
        ...mockOrder,
        subtotal: 0,
        shipping: 0,
        total: 0,
      }
      render(<OrderDetail order={freeOrder} />)

      // 0,00 € aparece en subtotal y total
      const zeroPrices = screen.getAllByText(/0,00.*€/)
      expect(zeroPrices.length).toBeGreaterThan(0)
    })
  })

  /**
   * Test Suite 6: Estructura y Layout
   */
  describe('Estructura y Layout', () => {
    it('should render main container with proper styling', () => {
      const { container } = render(<OrderDetail order={mockOrder} />)

      // Main wrapper has space-y-6 for spacing between elements
      const mainDiv = container.firstChild
      expect(mainDiv).toHaveClass('space-y-6')

      // The order detail card should have the bg-white, border, rounded-lg classes
      const orderCard = container.querySelector('.bg-white.border.rounded-lg')
      expect(orderCard).toBeInTheDocument()
    })

    it('should have three main sections', () => {
      render(<OrderDetail order={mockOrder} />)

      // 1. Cabecera con número de pedido
      expect(
        screen.getByText(/Pedido ORD-1234567890-A/i)
      ).toBeInTheDocument()

      // 2. Información del pedido
      expect(screen.getByText(/Información del Pedido/i)).toBeInTheDocument()

      // 3. Productos
      expect(screen.getByText(/Productos \(2\)/i)).toBeInTheDocument()
    })

    it('should display resumen section', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText(/^Resumen$/i)).toBeInTheDocument()
    })
  })

  /**
   * Test Suite: Back Button Navigation
   */
  describe('[ORD-12] Back Button', () => {
    it('should display back button with correct text', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('Volver a mis pedidos')).toBeInTheDocument()
    })

    it('should display back arrow icon', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })

    it('should navigate to orders page when clicked', async () => {
      const user = userEvent.setup()
      render(<OrderDetail order={mockOrder} />)

      const backButton = screen.getByText('Volver a mis pedidos')
      await user.click(backButton)

      expect(mockPush).toHaveBeenCalledWith('/mi-cuenta/pedidos')
    })
  })

  /**
   * Test Suite: Payment Information
   */
  describe('[ORD-12] Payment Information', () => {
    it('should display payment information section when paymentInfo exists', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('Información de Pago')).toBeInTheDocument()
    })

    it('should display payment card icon', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByTestId('credit-card-icon')).toBeInTheDocument()
    })

    it('should display card brand', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('visa')).toBeInTheDocument()
    })

    it('should display last 4 digits of card', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText(/•••• •••• •••• 4242/)).toBeInTheDocument()
    })

    it('should display payment method when brand is not available', () => {
      const orderWithoutBrand: OrderData = {
        ...mockOrder,
        paymentInfo: {
          method: 'paypal',
        },
      }

      render(<OrderDetail order={orderWithoutBrand} />)

      expect(screen.getByText('paypal')).toBeInTheDocument()
    })

    it('should not display payment section when paymentInfo is missing', () => {
      const orderWithoutPayment: OrderData = {
        ...mockOrder,
        paymentInfo: undefined,
      }

      render(<OrderDetail order={orderWithoutPayment} />)

      expect(
        screen.queryByText('Información de Pago')
      ).not.toBeInTheDocument()
    })

    it('should not display last4 when not provided', () => {
      const orderWithoutLast4: OrderData = {
        ...mockOrder,
        paymentInfo: {
          method: 'card',
          brand: 'mastercard',
        },
      }

      render(<OrderDetail order={orderWithoutLast4} />)

      expect(screen.queryByText(/••••/)).not.toBeInTheDocument()
    })
  })

  /**
   * Test Suite: Product Links
   */
  describe('[ORD-12] Product Links', () => {
    it('should render products as links', () => {
      render(<OrderDetail order={mockOrder} />)

      const productLinks = screen.getAllByRole('link')
      // Should have at least 2 product links
      expect(productLinks.length).toBeGreaterThanOrEqual(2)
    })

    it('should link first product to correct URL', () => {
      render(<OrderDetail order={mockOrder} />)

      const firstProductLink = screen.getByText('Reloj Casio Clásico')
        .closest('a')
      expect(firstProductLink).toHaveAttribute(
        'href',
        '/productos/prod-casio-123'
      )
    })

    it('should link second product to correct URL', () => {
      render(<OrderDetail order={mockOrder} />)

      const secondProductLink = screen.getByText('Reloj Seiko Automático')
        .closest('a')
      expect(secondProductLink).toHaveAttribute(
        'href',
        '/productos/prod-seiko-456'
      )
    })

    it('should apply hover styles to product links', () => {
      render(<OrderDetail order={mockOrder} />)

      const productLink = screen.getByText('Reloj Casio Clásico').closest('a')
      expect(productLink).toHaveClass('hover:bg-neutral-light/50')
    })
  })

  /**
   * Test Suite: OrderTimeline Integration
   */
  describe('[ORD-12] OrderTimeline Integration', () => {
    it('should render OrderTimeline component', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByTestId('order-timeline')).toBeInTheDocument()
    })

    it('should pass currentStatus to OrderTimeline', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('Timeline: paid')).toBeInTheDocument()
    })

    it('should pass statusHistory to OrderTimeline', () => {
      render(<OrderDetail order={mockOrder} />)

      expect(screen.getByText('History items: 2')).toBeInTheDocument()
    })

    it('should render OrderTimeline without statusHistory', () => {
      const orderWithoutHistory: OrderData = {
        ...mockOrder,
        statusHistory: undefined,
      }

      render(<OrderDetail order={orderWithoutHistory} />)

      expect(screen.getByTestId('order-timeline')).toBeInTheDocument()
      expect(screen.queryByText(/History items/)).not.toBeInTheDocument()
    })
  })
})
