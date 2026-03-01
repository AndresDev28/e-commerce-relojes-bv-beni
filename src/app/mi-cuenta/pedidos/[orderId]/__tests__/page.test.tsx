/**
 * [ORD-11] Tests para Order Detail Page
 *
 * Tests de integración para la página dinámica de detalle de pedido.
 *
 * COBERTURA:
 * - Protección de ruta (redirect si no autenticado)
 * - Estados de loading, error 403, 404, genérico
 * - Integración con API /api/orders/:orderId
 * - Breadcrumbs dinámicos
 * - Navegación y acciones del usuario
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import OrderDetailPage from '../page'

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="head">{children}</div>
  ),
}))

vi.mock('@/app/components/ui/Breadcrumbs', () => ({
  default: ({
    breadcrumbs,
  }: {
    breadcrumbs: Array<{ name: string; href: string }>
  }) => (
    <nav data-testid="breadcrumbs">
      {breadcrumbs.map((b, i) => (
        <span key={i}>{b.name}</span>
      ))}
    </nav>
  ),
}))

vi.mock('@/features/orders/components/OrderDetail', () => ({
  default: ({ order }: { order: { orderId: string } }) => (
    <div data-testid="order-detail">Order: {order.orderId}</div>
  ),
}))

// Import useAuth después del mock
import { useAuth } from '@/context/AuthContext'

describe('[ORD-11] Order Detail Page', () => {
  const mockPush = vi.fn()
  const mockParams = Promise.resolve({ orderId: 'ORD-123' })

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })
  })

  /**
   * Test Suite 1: Protección de Ruta
   */
  describe('Route Protection', () => {
    it('should redirect to login when user is not authenticated', () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        jwt: null,
      })

      render(<OrderDetailPage params={mockParams} />)

      expect(mockPush).toHaveBeenCalledWith(
        '/login?redirect=/mi-cuenta/pedidos/ORD-123'
      )
    })

    it('should not redirect when user is authenticated', () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            orderId: 'ORD-123',
            items: [],
            total: 100,
            orderStatus: 'paid',
            createdAt: '2025-11-20T10:00:00Z',
          },
        }),
      })

      render(<OrderDetailPage params={mockParams} />)

      expect(mockPush).not.toHaveBeenCalledWith(
        expect.stringContaining('/login')
      )
    })
  })

  /**
   * Test Suite 2: Estado Loading
   */
  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      // Simular fetch que nunca se resuelve (loading infinito)
      global.fetch = vi
        .fn()
        .mockImplementation(() => new Promise(() => {}))

      render(<OrderDetailPage params={mockParams} />)

      expect(screen.getByText(/Cargando pedido.../i)).toBeInTheDocument()
    })

    it('should display breadcrumbs during loading', () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi
        .fn()
        .mockImplementation(() => new Promise(() => {}))

      render(<OrderDetailPage params={mockParams} />)

      const breadcrumbs = screen.getByTestId('breadcrumbs')
      expect(breadcrumbs).toHaveTextContent('Inicio')
      expect(breadcrumbs).toHaveTextContent('Mi Cuenta')
      expect(breadcrumbs).toHaveTextContent('Mis Pedidos')
      expect(breadcrumbs).toHaveTextContent('ORD-123')
    })
  })

  /**
   * Test Suite 3: Estado de Éxito
   */
  describe('Success State', () => {
    it('should display order details when fetch succeeds', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      const mockOrder = {
        orderId: 'ORD-123',
        items: [],
        subtotal: 100,
        shipping: 0,
        total: 100,
        orderStatus: 'paid',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: mockOrder }),
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByTestId('order-detail')).toBeInTheDocument()
      })

      expect(screen.getByText(/Order: ORD-123/)).toBeInTheDocument()
    })

    it('should call API with correct JWT token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            orderId: 'ORD-123',
            items: [],
            total: 100,
            orderStatus: 'paid',
            createdAt: '2025-11-20T10:00:00Z',
            updatedAt: '2025-11-20T10:00:00Z',
            publishedAt: '2025-11-20T10:00:00Z',
          },
        }),
      })
      global.fetch = mockFetch

      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'test-jwt-token',
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/orders/ORD-123',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-jwt-token',
            }),
          })
        )
      })
    })
  })

  /**
   * Test Suite 4: Error 403 (Forbidden)
   */
  describe('403 Forbidden State', () => {
    it('should display forbidden message when user does not own order', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Acceso Denegado/i)).toBeInTheDocument()
      })

      expect(
        screen.getByText(/No tienes permiso para ver este pedido/i)
      ).toBeInTheDocument()
    })

    it('should redirect to orders list after 2 seconds on 403', async () => {
      vi.useFakeTimers()

      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Acceso Denegado/i)).toBeInTheDocument()
      })

      // Avanzar timers 2 segundos
      vi.advanceTimersByTime(2000)

      expect(mockPush).toHaveBeenCalledWith(
        '/mi-cuenta/pedidos?error=forbidden'
      )

      vi.useRealTimers()
    })
  })

  /**
   * Test Suite 5: Error 404 (Not Found)
   */
  describe('404 Not Found State', () => {
    it('should display not found message when order does not exist', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Pedido No Encontrado/i)
        ).toBeInTheDocument()
      })
    })

    it('should show button to return to orders list on 404', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Ver Mis Pedidos/i)).toBeInTheDocument()
      })
    })
  })

  /**
   * Test Suite 6: Error Genérico
   */
  describe('Generic Error State', () => {
    it('should display error message on network failure', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/^Error$/)).toBeInTheDocument()
      })

      expect(
        screen.getByText(/Error al cargar el pedido/i)
      ).toBeInTheDocument()
    })

    it('should display retry button on generic error', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/Reintentar/i)).toBeInTheDocument()
      })
    })

    it('should handle 500 server error', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<OrderDetailPage params={mockParams} />)

      await waitFor(() => {
        expect(screen.getByText(/^Error$/)).toBeInTheDocument()
      })
    })
  })

  /**
   * Test Suite 7: Breadcrumbs Dinámicos
   */
  describe('Dynamic Breadcrumbs', () => {
    it('should display breadcrumbs with dynamic orderId', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            orderId: 'ORD-123',
            items: [],
            total: 100,
            orderStatus: 'paid',
            createdAt: '2025-11-20T10:00:00Z',
            updatedAt: '2025-11-20T10:00:00Z',
            publishedAt: '2025-11-20T10:00:00Z',
          },
        }),
      })

      render(<OrderDetailPage params={mockParams} />)

      const breadcrumbs = screen.getByTestId('breadcrumbs')
      expect(breadcrumbs).toHaveTextContent('ORD-123')
    })

    it('should include correct breadcrumb hierarchy', async () => {
      ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { id: 1, email: 'user@test.com' },
        jwt: 'valid-token',
      })

      global.fetch = vi
        .fn()
        .mockImplementation(() => new Promise(() => {}))

      render(<OrderDetailPage params={mockParams} />)

      const breadcrumbs = screen.getByTestId('breadcrumbs')
      expect(breadcrumbs.textContent).toMatch(
        /Inicio.*Mi Cuenta.*Mis Pedidos.*ORD-123/
      )
    })
  })
})
