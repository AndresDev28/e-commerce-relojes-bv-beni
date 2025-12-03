/**
 * [ORD-07] Tests: OrderHistory renderiza lista correctamente
 *
 * Tests unitarios siguiendo TDD para el componente OrderHistory
 * que muestra el historial de pedidos del usuario.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderHistory from '../OrderHistory'
import type { OrderData } from '@/lib/api/orders'

// Mock de useAuth para simular usuario autenticado
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  jwt: 'mock-jwt-token',
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    jwt: mockUser.jwt,
    isAuthenticated: true,
  }),
}))

// Mock de next/navigation para manejar search params
const mockSearchParams = new URLSearchParams()
const mockPush = vi.fn()
const mockPathname = '/mi-cuenta/pedidos'

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
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

// Mock de fetch global
global.fetch = vi.fn()

// Helper: Mock de datos de órdenes
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

describe('[ORD-07] OrderHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.delete('page')
  })

  /**
   * Test 1: Renderizado básico
   */
  describe('Renderizado básico', () => {
    it('should render without crashing', async () => {
      const mockOrders = [createMockOrder()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: {
              page: 1,
              pageSize: 10,
              pageCount: 1,
              total: 1,
            },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      // Verificar que muestra loading inicialmente
      expect(screen.getByText(/cargando/i)).toBeInTheDocument()

      // Esperar a que carguen los datos
      await waitFor(() => {
        expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument()
      })
    })

    it('should call API with JWT token', async () => {
      const mockOrders = [createMockOrder()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/orders'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-jwt-token',
            }),
          })
        )
      })
    })
  })

  /**
   * Test 2: Estado vacío (sin pedidos)
   */
  describe('Estado vacío', () => {
    it('should show empty state when no orders exist', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(
          screen.getByText(/aún no has realizado ningún pedido/i)
        ).toBeInTheDocument()
      })

      expect(screen.getByText(/explorar productos/i)).toBeInTheDocument()
    })

    it('should have link to shop in empty state', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        const link = screen.getByText(/explorar productos/i).closest('a')
        expect(link).toHaveAttribute('href', '/tienda')
      })
    })
  })

  /**
   * Test 3: Lista de pedidos
   */
  describe('Lista de pedidos', () => {
    it('should display list of orders', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'ORD-1700000001-A',
          total: 99.99,
          orderStatus: 'paid',
          createdAt: '2025-11-20T10:00:00Z',
        }),
        createMockOrder({
          id: 2,
          documentId: 'doc-002',
          orderId: 'ORD-1700000002-B',
          total: 149.99,
          orderStatus: 'shipped',
          createdAt: '2025-11-19T10:00:00Z',
        }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(screen.getByText('ORD-1700000001-A')).toBeInTheDocument()
        expect(screen.getByText('ORD-1700000002-B')).toBeInTheDocument()
      })
    })

    it('should display orders in descending date order', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'ORD-NEWER',
          createdAt: '2025-11-20T10:00:00Z',
        }),
        createMockOrder({
          id: 2,
          documentId: 'doc-002',
          orderId: 'ORD-OLDER',
          createdAt: '2025-11-19T10:00:00Z',
        }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        const orderElements = screen.getAllByText(/ORD-/)
        expect(orderElements[0]).toHaveTextContent('ORD-NEWER')
        expect(orderElements[1]).toHaveTextContent('ORD-OLDER')
      })
    })
  })

  /**
   * Test 4: Estado de loading
   */
  describe('Estado de loading', () => {
    it('should show loading indicator while fetching', () => {
      vi.mocked(fetch).mockImplementation(
        () => new Promise(() => { }) // Never resolves
      )

      render(<OrderHistory />)

      expect(screen.getByText(/cargando/i)).toBeInTheDocument()
    })
  })

  /**
   * Test 5: Manejo de errores
   */
  describe('Manejo de errores', () => {
    it('should show error message when API fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      render(<OrderHistory />)

      await waitFor(() => {
        expect(
          screen.getByText(/error al cargar los pedidos/i)
        ).toBeInTheDocument()
      })
    })

    it('should show error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(
          screen.getByText(/error al cargar los pedidos/i)
        ).toBeInTheDocument()
      })
    })
  })

  /**
   * Test 6: Paginación
   */
  describe('Paginación', () => {
    it('should show pagination controls when more than 10 orders', async () => {
      const mockOrders = Array.from({ length: 10 }, (_, i) =>
        createMockOrder({
          id: i + 1,
          documentId: `doc-00${i + 1}`,
          orderId: `ORD-170000000${i + 1}-A`,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 3, total: 25 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(screen.getByText(/anterior/i)).toBeInTheDocument()
        expect(screen.getByText(/siguiente/i)).toBeInTheDocument()
      })
    })

    it('should disable "Anterior" button on first page', async () => {
      const mockOrders = [createMockOrder()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 3, total: 25 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        const prevButton = screen.getByText(/anterior/i)
        expect(prevButton).toBeDisabled()
      })
    })

    it('should disable "Siguiente" button on last page', async () => {
      mockSearchParams.set('page', '3')

      const mockOrders = [createMockOrder()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 3, pageSize: 10, pageCount: 3, total: 25 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        const nextButton = screen.getByText(/siguiente/i)
        expect(nextButton).toBeDisabled()
      })
    })

    it('should not show pagination with 10 or less orders', async () => {
      const mockOrders = Array.from({ length: 5 }, (_, i) =>
        createMockOrder({
          id: i + 1,
          documentId: `doc-00${i + 1}`,
          orderId: `ORD-170000000${i + 1}-A`,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 5 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        expect(screen.queryByText(/anterior/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/siguiente/i)).not.toBeInTheDocument()
      })
    })

    it('should navigate to next page and update URL when clicking "Siguiente"', async () => {
      const mockOrdersPage1 = [
        createMockOrder({ orderId: 'ORD-PAGE1', id: 1 }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrdersPage1,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 3, total: 25 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      // Esperar a que carguen los datos de página 1
      await waitFor(() => {
        expect(screen.getByText('ORD-PAGE1')).toBeInTheDocument()
      })

      // Hacer click en botón "Siguiente"
      const nextButton = screen.getByText(/siguiente/i)
      await userEvent.click(nextButton)

      // Verificar que router.push se llamó con la URL correcta
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/mi-cuenta/pedidos?page=2'
        )
      })
    })

    it('should navigate to previous page and update URL when clicking "Anterior"', async () => {
      // Simular que estamos en página 2
      mockSearchParams.set('page', '2')

      const mockOrdersPage2 = [
        createMockOrder({ orderId: 'ORD-PAGE2', id: 2 }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrdersPage2,
          meta: {
            pagination: { page: 2, pageSize: 10, pageCount: 3, total: 25 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      // Esperar a que carguen los datos de página 2
      await waitFor(() => {
        expect(screen.getByText('ORD-PAGE2')).toBeInTheDocument()
      })

      // Hacer click en botón "Anterior"
      const prevButton = screen.getByText(/anterior/i)
      await userEvent.click(prevButton)

      // Verificar que router.push se llamó con la URL correcta
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/mi-cuenta/pedidos?page=1'
        )
      })
    })

    it('should reflect current page in URL parameter', async () => {
      // Simular que estamos en página 3
      mockSearchParams.set('page', '3')

      const mockOrdersPage3 = [createMockOrder()]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrdersPage3,
          meta: {
            pagination: { page: 3, pageSize: 10, pageCount: 5, total: 45 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        // Verificar que se muestra el indicador de página correcta
        expect(screen.getByText('Página 3 de 5')).toBeInTheDocument()
      })

      // Verificar que fetch se llamó con el parámetro de página correcto
      expect(fetch).toHaveBeenCalledWith(
        '/api/orders?page=3',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        })
      )
    })

    it('should load correct data for each page', async () => {
      // Página 1: primeros 10 pedidos
      const mockOrdersPage1 = Array.from({ length: 10 }, (_, i) =>
        createMockOrder({
          id: i + 1,
          documentId: `doc-00${i + 1}`,
          orderId: `ORD-PAGE1-${i + 1}`,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrdersPage1,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 2, total: 15 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      // Verificar que se muestran los pedidos de página 1
      await waitFor(() => {
        expect(screen.getByText('ORD-PAGE1-1')).toBeInTheDocument()
        expect(screen.getByText('ORD-PAGE1-10')).toBeInTheDocument()
      })

      // Verificar que fetch se llamó con page=1
      expect(fetch).toHaveBeenCalledWith(
        '/api/orders?page=1',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        })
      )
    })
  })

  /**
   * Test 7: Integración con OrderCard
   */
  describe('Integración con OrderCard', () => {
    it('should render OrderCard for each order with correct props', async () => {
      const mockOrders = [
        createMockOrder({
          orderId: 'ORD-1700000001-A',
          total: 99.99,
          orderStatus: 'delivered',
          createdAt: '2025-11-20T10:00:00Z',
        }),
        createMockOrder({
          id: 2,
          documentId: 'doc-002',
          orderId: 'ORD-1700000002-B',
          total: 149.99,
          orderStatus: 'shipped',
          createdAt: '2025-11-19T10:00:00Z',
        }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 2 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        // Verificar que OrderCard muestra el orderId
        expect(screen.getByText('ORD-1700000001-A')).toBeInTheDocument()
        expect(screen.getByText('ORD-1700000002-B')).toBeInTheDocument()

        // Verificar que OrderCard muestra el total formateado
        expect(screen.getByText(/99,99/)).toBeInTheDocument()
        expect(screen.getByText(/149,99/)).toBeInTheDocument()

        // Verificar que OrderCard muestra el estado traducido
        expect(screen.getByText('Entregado')).toBeInTheDocument()
        expect(screen.getByText('Enviado')).toBeInTheDocument()
      })
    })

    it('should render correct number of OrderCard components', async () => {
      const mockOrders = Array.from({ length: 5 }, (_, i) =>
        createMockOrder({
          id: i + 1,
          documentId: `doc-00${i + 1}`,
          orderId: `ORD-170000000${i + 1}-A`,
        })
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockOrders,
          meta: {
            pagination: { page: 1, pageSize: 10, pageCount: 1, total: 5 },
          },
        }),
      } as Response)

      render(<OrderHistory />)

      await waitFor(() => {
        // Verificar que se renderizan 5 OrderCards
        const orderCards = screen.getAllByText(/ORD-/)
        expect(orderCards).toHaveLength(5)
      })
    })
  })
})
