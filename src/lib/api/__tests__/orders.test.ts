/**
 * Tests para API de órdenes
 * [PAY-19] Create comprehensive tests for PAY-18 order creation flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type CartItem, OrderStatus } from '@/types'

// Mock de API_URL antes de importar el módulo
// IMPORTANTE: No se pueden usar variables aquí porque vi.mock se hace hoisting
vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

// Importar DESPUÉS del mock
import { createOrder, getUserOrders } from '../orders'
import type { CreateOrderData, OrderResponse } from '../orders'

// Mock de fetch global
global.fetch = vi.fn()

describe('[PAY-19] Orders API', () => {
  const mockJwtToken = 'mock-jwt-token-12345'
  const mockApiUrl = 'http://localhost:1337' // Mantener referencia para los tests

  // Mock cart items para testing
  const mockCartItems: CartItem[] = [
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
    {
      id: '2',
      name: 'Reloj Seiko',
      price: 45.0,
      quantity: 1,
      images: ['/images/reloj2.jpg'],
      href: '/products/reloj-seiko',
      description: 'Reloj Seiko automático',
      stock: 5,
    },
  ]

  beforeEach(() => {
    // Limpiar mocks antes de cada test
    vi.clearAllMocks()
  })

  describe('createOrder', () => {
    const mockOrderData: CreateOrderData = {
      orderId: 'ORD-1699123456-A5F3',
      items: mockCartItems,
      subtotal: 104.98,
      shipping: 0,
      total: 104.98,
      orderStatus: OrderStatus.PAID,
      paymentIntentId: 'pi_test_123456',
    }

    const mockSuccessResponse: OrderResponse = {
      data: {
        id: 1,
        documentId: 'order-doc-id-123',
        orderId: 'ORD-1699123456-A5F3',
        items: mockCartItems,
        subtotal: 104.98,
        shipping: 0,
        total: 104.98,
        orderStatus: OrderStatus.PAID,
        paymentIntentId: 'pi_test_123456',
        createdAt: '2025-11-07T10:00:00.000Z',
        updatedAt: '2025-11-07T10:00:00.000Z',
        publishedAt: '2025-11-07T10:00:00.000Z',
      },
    }

    /**
     * Test 1: Crear orden exitosamente
     */
    it('should create order successfully', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response)

      // ACT
      const result = await createOrder(mockOrderData, mockJwtToken)

      // ASSERT
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/orders`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockJwtToken}`,
          },
        })
      )

      expect(result).toEqual(mockSuccessResponse)
    })

    /**
     * Test 2: Enviar datos correctos en el body
     */
    it('should send correct order data in request body', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response)

      // ACT
      await createOrder(mockOrderData, mockJwtToken)

      // ASSERT
      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1]?.body as string)

      expect(requestBody).toEqual({
        data: {
          orderId: mockOrderData.orderId,
          items: mockOrderData.items,
          subtotal: mockOrderData.subtotal,
          shipping: mockOrderData.shipping,
          total: mockOrderData.total,
          orderStatus: mockOrderData.orderStatus,
          paymentIntentId: mockOrderData.paymentIntentId,
        },
      })
    })

    /**
     * Test 3: Usar estado por defecto 'pending' si no se especifica
     */
    it('should default orderStatus to "pending" if not provided', async () => {
      // ARRANGE
      const orderDataWithoutStatus: CreateOrderData = {
        ...mockOrderData,
        orderStatus: undefined,
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response)

      // ACT
      await createOrder(orderDataWithoutStatus, mockJwtToken)

      // ASSERT
      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1]?.body as string)

      expect(requestBody.data.orderStatus).toBe('pending')
    })

    /**
     * Test 4: Incluir JWT token en headers
     */
    it('should include JWT token in authorization header', async () => {
      // ARRANGE
      const customToken = 'custom-jwt-xyz'
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response)

      // ACT
      await createOrder(mockOrderData, customToken)

      // ASSERT
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Record<string, string>

      expect(headers.Authorization).toBe(`Bearer ${customToken}`)
    })

    /**
     * Test 5: Manejar error de red (fetch falla)
     */
    it('should throw error when fetch fails', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // ACT & ASSERT
      await expect(createOrder(mockOrderData, mockJwtToken)).rejects.toThrow(
        'Network error'
      )
    })

    /**
     * Test 6: Manejar respuesta no OK del servidor
     */
    it('should throw error when response is not OK', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Unauthorized',
          },
        }),
      } as Response)

      // ACT & ASSERT
      await expect(createOrder(mockOrderData, mockJwtToken)).rejects.toThrow(
        'Unauthorized'
      )
    })

    /**
     * Test 7: Manejar error sin mensaje específico
     */
    it('should throw generic error when no error message provided', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)

      // ACT & ASSERT
      await expect(createOrder(mockOrderData, mockJwtToken)).rejects.toThrow(
        'Failed to create order'
      )
    })

    /**
     * Test 8: Loggear errores en consola
     */
    it('should log errors to console', async () => {
      // ARRANGE
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => { })
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // ACT
      try {
        await createOrder(mockOrderData, mockJwtToken)
      } catch (error) {
        // Error esperado
      }

      // ASSERT
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error creating order:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    /**
     * Test 9: Validar que todos los campos requeridos estén presentes
     */
    it('should handle order with all optional fields', async () => {
      // ARRANGE
      const minimalOrderData: CreateOrderData = {
        orderId: 'ORD-1699123456-A5F3',
        items: mockCartItems,
        subtotal: 104.98,
        shipping: 0,
        total: 104.98,
        // Sin orderStatus ni paymentIntentId
      }

      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response)

      // ACT
      const result = await createOrder(minimalOrderData, mockJwtToken)

      // ASSERT
      expect(result).toEqual(mockSuccessResponse)
    })

    /**
     * Test 10: Validar diferentes estados de orden
     */
    it('should handle different order statuses', async () => {
      const statuses: Array<CreateOrderData['orderStatus']> = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ]

      for (const status of statuses) {
        const orderData: CreateOrderData = {
          ...mockOrderData,
          orderStatus: status as OrderStatus,
        }

        const mockFetch = vi.mocked(fetch)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response)

        // ACT
        await createOrder(orderData, mockJwtToken)

        // ASSERT
        const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
        const requestBody = JSON.parse(callArgs[1]?.body as string)
        expect(requestBody.data.orderStatus).toBe(status)
      }
    })
  })

  describe('getUserOrders', () => {
    const mockOrdersResponse = {
      data: [
        {
          id: 1,
          documentId: 'order-1',
          items: mockCartItems,
          subtotal: 104.98,
          shipping: 0,
          total: 104.98,
          orderStatus: OrderStatus.PAID,
          paymentIntentId: 'pi_test_123',
          createdAt: '2025-11-07T10:00:00.000Z',
          updatedAt: '2025-11-07T10:00:00.000Z',
          publishedAt: '2025-11-07T10:00:00.000Z',
        },
        {
          id: 2,
          documentId: 'order-2',
          items: [],
          subtotal: 50.0,
          shipping: 5.95,
          total: 55.95,
          orderStatus: OrderStatus.SHIPPED,
          createdAt: '2025-11-06T10:00:00.000Z',
          updatedAt: '2025-11-06T10:00:00.000Z',
          publishedAt: '2025-11-06T10:00:00.000Z',
        },
      ],
    }

    /**
     * Test 11: Obtener órdenes del usuario exitosamente
     */
    it('should fetch user orders successfully', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrdersResponse,
      } as Response)

      // ACT
      const result = await getUserOrders(mockJwtToken)

      // ASSERT
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/orders?sort%5B0%5D=createdAt%3Adesc&pagination%5BpageSize%5D=100`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockJwtToken}`,
          },
        })
      )

      expect(result).toEqual(mockOrdersResponse.data)
    })

    /**
     * Test 12: Incluir JWT token en headers
     */
    it('should include JWT token in authorization header', async () => {
      // ARRANGE
      const customToken = 'custom-jwt-abc'
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrdersResponse,
      } as Response)

      // ACT
      await getUserOrders(customToken)

      // ASSERT
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Record<string, string>

      expect(headers.Authorization).toBe(`Bearer ${customToken}`)
    })

    /**
     * Test 13: Manejar lista vacía de órdenes
     */
    it('should handle empty orders list', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      // ACT
      const result = await getUserOrders(mockJwtToken)

      // ASSERT
      expect(result).toEqual([])
    })

    /**
     * Test 14: Manejar error de red
     */
    it('should throw error when fetch fails', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // ACT & ASSERT
      await expect(getUserOrders(mockJwtToken)).rejects.toThrow('Network error')
    })

    /**
     * Test 15: Manejar respuesta no OK
     */
    it('should throw error when response is not OK', async () => {
      // ARRANGE
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      // ACT & ASSERT
      await expect(getUserOrders(mockJwtToken)).rejects.toThrow(
        'Failed to fetch orders'
      )
    })

    /**
     * Test 16: Loggear errores en consola
     */
    it('should log errors to console', async () => {
      // ARRANGE
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => { })
      const mockFetch = vi.mocked(fetch)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // ACT
      try {
        await getUserOrders(mockJwtToken)
      } catch (error) {
        // Error esperado
      }

      // ASSERT
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error fetching orders:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Type Safety', () => {
    /**
     * Test 17: Verificar que CreateOrderData tenga la estructura correcta
     */
    it('should enforce CreateOrderData structure', () => {
      const validOrderData: CreateOrderData = {
        orderId: 'ORD-1699123456-A5F3',
        items: mockCartItems,
        subtotal: 100,
        shipping: 5.95,
        total: 105.95,
      }

      // TypeScript validará en tiempo de compilación
      expect(validOrderData).toBeDefined()
    })

    /**
     * Test 18: Verificar que OrderResponse tenga la estructura correcta
     */
    it('should enforce OrderResponse structure', () => {
      const validResponse: OrderResponse = {
        data: {
          id: 1,
          documentId: 'doc-123',
          orderId: 'ORD-TEST-123',
          items: [],
          subtotal: 100,
          shipping: 0,
          total: 100,
          orderStatus: OrderStatus.PENDING,
          createdAt: '2025-11-07T10:00:00.000Z',
          updatedAt: '2025-11-07T10:00:00.000Z',
          publishedAt: '2025-11-07T10:00:00.000Z',
        },
      }

      // TypeScript validará en tiempo de compilación
      expect(validResponse).toBeDefined()
    })
  })
})
