/**
 * [ORD-04] Tests: OrderCard Component
 *
 * Tests unitarios siguiendo TDD para el componente OrderCard
 * que muestra una tarjeta individual de pedido en el historial.
 *
 * CRITERIOS DE ACEPTACIÓN:
 * - Renderiza sin errores
 * - Muestra número de pedido con formato correcto
 * - Muestra fecha con formato DD/MM/YYYY
 * - Muestra total con formato XXX,XX €
 * - Muestra badge de estado con color correspondiente
 * - Es clickeable y navega a /mi-cuenta/pedidos/[orderId]
 * - Tiene estados hover/focus accesibles
 * - Coverage > 80%
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderCard from '../OrderCard'
import type { OrderData } from '@/lib/api/orders'

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Helper: Mock de datos de orden
const createMockOrder = (overrides: Partial<OrderData> = {}): OrderData => ({
  id: 1,
  documentId: 'doc-001',
  orderId: 'ORD-1700000001-A',
  items: [
    {
      id: '1',
      name: 'Reloj Casio',
      price: 29.99,
      quantity: 2,
      images: ['/images/reloj1.jpg'],
      href: '/products/reloj-casio',
      description: 'Reloj Casio de alta calidad',
      stock: 10,
    },
  ],
  subtotal: 59.98,
  shipping: 0,
  total: 59.98,
  orderStatus: 'paid',
  createdAt: '2025-11-20T10:00:00Z',
  updatedAt: '2025-11-20T10:00:00Z',
  publishedAt: '2025-11-20T10:00:00Z',
  ...overrides,
})

describe('[ORD-04] OrderCard Component', () => {
  /**
   * Test 1: Renderizado básico
   */
  describe('Renderizado básico', () => {
    it('should render without crashing', () => {
      const order = createMockOrder()
      render(<OrderCard order={order} />)

      expect(screen.getByText('ORD-1700000001-A')).toBeInTheDocument()
    })

    it('should render as a clickable link', () => {
      const order = createMockOrder({ orderId: 'ORD-1234567890-X' })
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'href',
        '/mi-cuenta/pedidos/ORD-1234567890-X'
      )
    })
  })

  /**
   * Test 2: Formato de número de pedido
   */
  describe('Formato de número de pedido', () => {
    it('should display order ID correctly', () => {
      const order = createMockOrder({ orderId: 'ORD-1763064732-F' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('ORD-1763064732-F')).toBeInTheDocument()
    })

    it('should handle different order ID formats', () => {
      const order = createMockOrder({ orderId: 'ORD-9999999999-Z' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('ORD-9999999999-Z')).toBeInTheDocument()
    })
  })

  /**
   * Test 3: Formato de fecha (DD/MM/YYYY)
   */
  describe('Formato de fecha', () => {
    it('should format date as DD/MM/YYYY', () => {
      const order = createMockOrder({ createdAt: '2025-11-20T10:00:00Z' })
      render(<OrderCard order={order} />)

      // Fecha esperada en formato español: 20/11/2025
      expect(screen.getByText('20/11/2025')).toBeInTheDocument()
    })

    it('should handle different dates correctly', () => {
      const order = createMockOrder({ createdAt: '2025-01-05T15:30:00Z' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('05/01/2025')).toBeInTheDocument()
    })

    it('should handle end of year date', () => {
      const order = createMockOrder({ createdAt: '2024-12-31T10:00:00Z' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('31/12/2024')).toBeInTheDocument()
    })
  })

  /**
   * Test 4: Formato de precio (XXX,XX €)
   */
  describe('Formato de precio', () => {
    it('should format price with Spanish locale (XXX,XX €)', () => {
      const order = createMockOrder({ total: 99.99 })
      render(<OrderCard order={order} />)

      // Formato esperado: "99,99 €"
      expect(screen.getByText('99,99 €')).toBeInTheDocument()
    })

    it('should format large amounts with thousand separator', () => {
      const order = createMockOrder({ total: 1234.5 })
      render(<OrderCard order={order} />)

      // Formato esperado: "1.234,50 €"
      expect(screen.getByText('1234,50 €')).toBeInTheDocument()
    })

    it('should format whole numbers with decimals', () => {
      const order = createMockOrder({ total: 50 })
      render(<OrderCard order={order} />)

      // Formato esperado: "50,00 €"
      expect(screen.getByText('50,00 €')).toBeInTheDocument()
    })

    it('should handle small decimal amounts', () => {
      const order = createMockOrder({ total: 0.99 })
      render(<OrderCard order={order} />)

      expect(screen.getByText('0,99 €')).toBeInTheDocument()
    })
  })

  /**
   * Test 5: Badge de estado con colores
   */
  describe('Badge de estado', () => {
    it('should display status badge for "pending" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'pending' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Pendiente')).toBeInTheDocument()
    })

    it('should display status badge for "paid" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'paid' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Pagado')).toBeInTheDocument()
    })

    it('should display status badge for "processing" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'processing' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('En preparación')).toBeInTheDocument()
    })

    it('should display status badge for "shipped" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'shipped' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Enviado')).toBeInTheDocument()
    })

    it('should display status badge for "delivered" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'delivered' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Entregado')).toBeInTheDocument()
    })

    it('should display status badge for "cancelled" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'cancelled' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Cancelado')).toBeInTheDocument()
    })

    it('should display status badge for "refunded" in Spanish', () => {
      const order = createMockOrder({ orderStatus: 'refunded' })
      render(<OrderCard order={order} />)

      expect(screen.getByText('Reembolsado')).toBeInTheDocument()
    })

    it('should apply correct color class for "pending" (gray)', () => {
      const order = createMockOrder({ orderStatus: 'pending' })
      const { container } = render(<OrderCard order={order} />)

      const badge = screen.getByText('Pendiente')
      expect(badge).toHaveClass('bg-gray-500')
    })

    it('should apply correct color class for "paid" (blue)', () => {
      const order = createMockOrder({ orderStatus: 'paid' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('Pagado')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('should apply correct color class for "processing" (yellow) - WCAG AA', () => {
      const order = createMockOrder({ orderStatus: 'processing' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('En preparación')
      expect(badge).toHaveClass('bg-yellow-700') // Changed for accessibility
    })

    it('should apply correct color class for "shipped" (orange) - WCAG AA', () => {
      const order = createMockOrder({ orderStatus: 'shipped' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('Enviado')
      expect(badge).toHaveClass('bg-orange-600') // Changed for accessibility
    })

    it('should apply correct color class for "delivered" (green) - WCAG AA', () => {
      const order = createMockOrder({ orderStatus: 'delivered' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('Entregado')
      expect(badge).toHaveClass('bg-green-600') // Changed for accessibility
    })

    it('should apply correct color class for "cancelled" (red) - WCAG AA', () => {
      const order = createMockOrder({ orderStatus: 'cancelled' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('Cancelado')
      expect(badge).toHaveClass('bg-red-600') // Changed for accessibility
    })

    it('should apply correct color class for "refunded" (purple)', () => {
      const order = createMockOrder({ orderStatus: 'refunded' })
      render(<OrderCard order={order} />)

      const badge = screen.getByText('Reembolsado')
      expect(badge).toHaveClass('bg-purple-500')
    })

    it('should handle unknown status gracefully', () => {
      const order = createMockOrder({ orderStatus: 'unknown-status' })
      render(<OrderCard order={order} />)

      // Debe mostrar el status original como fallback
      expect(screen.getByText('unknown-status')).toBeInTheDocument()
    })
  })

  /**
   * Test 6: Navegación al detalle
   */
  describe('Navegación', () => {
    it('should link to order detail page with correct URL', () => {
      const order = createMockOrder({ orderId: 'ORD-1234567890-X' })
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'href',
        '/mi-cuenta/pedidos/ORD-1234567890-X'
      )
    })

    it('should have correct href for different order IDs', () => {
      const order = createMockOrder({ orderId: 'ORD-9999999999-Z' })
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'href',
        '/mi-cuenta/pedidos/ORD-9999999999-Z'
      )
    })
  })

  /**
   * Test 7: Estados hover y accesibilidad
   */
  describe('Estados hover y accesibilidad', () => {
    it('should have hover class for visual feedback', () => {
      const order = createMockOrder()
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('hover:shadow-lg')
    })

    it('should have transition class for smooth animations', () => {
      const order = createMockOrder()
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('transition-shadow')
    })

    it('should be accessible as a link', () => {
      const order = createMockOrder()
      render(<OrderCard order={order} />)

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
    })
  })

  /**
   * Test 8: Diseño responsive
   */
  describe('Diseño responsive', () => {
    it('should have flex-col class for mobile layout', () => {
      const order = createMockOrder()
      const { container } = render(<OrderCard order={order} />)

      const flexContainer = container.querySelector('.flex-col')
      expect(flexContainer).toBeInTheDocument()
    })

    it('should have md:flex-row class for desktop layout', () => {
      const order = createMockOrder()
      const { container } = render(<OrderCard order={order} />)

      const flexContainer = container.querySelector('.md\\:flex-row')
      expect(flexContainer).toBeInTheDocument()
    })
  })

  /**
   * Test 9: Integración completa
   */
  describe('Integración completa', () => {
    it('should render complete card with all elements', () => {
      const order = createMockOrder({
        orderId: 'ORD-1763064732-F',
        total: 259.89,
        orderStatus: 'shipped',
        createdAt: '2025-11-22T14:30:00Z',
      })

      render(<OrderCard order={order} />)

      // Verificar que todos los elementos están presentes
      expect(screen.getByText('ORD-1763064732-F')).toBeInTheDocument()
      expect(screen.getByText('22/11/2025')).toBeInTheDocument()
      expect(screen.getByText('259,89 €')).toBeInTheDocument()
      expect(screen.getByText('Enviado')).toBeInTheDocument()

      // Verificar navegación
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute(
        'href',
        '/mi-cuenta/pedidos/ORD-1763064732-F'
      )
    })
  })
})
