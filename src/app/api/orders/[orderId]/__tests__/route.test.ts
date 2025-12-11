/**
 * [ORD-09] Tests para el endpoint GET /api/orders/:orderId
 *
 * Tests unitarios siguiendo TDD para el endpoint de detalle de pedido
 * con validación de propiedad del pedido.
 *
 * CRITERIOS DE ACEPTACIÓN:
 * - El endpoint responde en GET /api/orders/:orderId
 * - Requiere autenticación JWT
 * - Valida que el pedido pertenezca al usuario autenticado
 * - Retorna 403 si el pedido no pertenece al usuario
 * - Retorna 404 si el pedido no existe
 * - Retorna datos completos del pedido
 * - Coverage > 80%
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock de constantes
vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

// Mock global de fetch
global.fetch = vi.fn()

describe('[ORD-09] GET /api/orders/:orderId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  /**
   * Test 1: Autenticación - Debe rechazar requests sin token
   */
  describe('Autenticación', () => {
    it('should return 401 if no authorization header is provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized - JWT token required')
    })

    it('should return 401 if authorization header has invalid format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'InvalidFormat token123',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized - Invalid token format')
    })
  })

  /**
   * Test 2: Pedido no encontrado (404)
   */
  describe('Pedido no encontrado', () => {
    it('should return 404 if order does not exist', async () => {
      // Mock de /api/users/me
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      // Mock de Strapi retornando array vacío (pedido no existe)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-NONEXISTENT',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-NONEXISTENT' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Order not found')
    })
  })

  /**
   * Test 3: Pedido pertenece a otro usuario (now returns 404 for security)
   * With the filter-based approach, orders are filtered by userId, so orders
   * belonging to other users simply aren't found (returns 404, not 403)
   */
  describe('Validación de propiedad', () => {
    it('should return 404 if order belongs to another user (security: do not reveal existence)', async () => {
      // Mock de /api/users/me para obtener el usuario autenticado
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }), // Usuario ID=1
      } as Response)

      // With filter-based validation, if order belongs to another user,
      // the query returns empty results (filtered by userId)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }), // No results - order filtered out by userId
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      // Returns 404 instead of 403 for security (don't reveal if order exists)
      expect(response.status).toBe(404)
      expect(data.error).toBe('Order not found')
    })
  })

  /**
   * Test 4: Acceso exitoso a pedido propio
   */
  describe('Acceso exitoso', () => {
    it('should return order details if user owns the order', async () => {
      const mockOrder = {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1234567890-A',
        user: { id: 1 }, // Mismo usuario
        items: [
          {
            id: '1',
            name: 'Reloj Casio',
            price: 99.99,
            quantity: 1,
            images: ['/images/reloj1.jpg'],
            href: '/products/reloj-casio',
            description: 'Reloj Casio de alta calidad',
            stock: 10,
          },
        ],
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: 'paid',
        paymentIntentId: 'pi_123456',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z',
      }

      // Mock de /api/users/me
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      // Mock de Strapi orders
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockOrder] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.orderId).toBe('ORD-1234567890-A')
      expect(data.data.items).toHaveLength(1)
      expect(data.data.total).toBe(99.99)
      expect(data.data.orderStatus).toBe('paid')
    })

    it('should return complete order data including items details', async () => {
      const mockOrder = {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1234567890-A',
        user: { id: 1 },
        items: [
          {
            id: '1',
            name: 'Reloj Casio',
            price: 29.99,
            quantity: 2,
            images: ['/images/reloj1.jpg'],
            href: '/products/reloj-casio',
            description: 'Reloj Casio',
            stock: 10,
          },
          {
            id: '2',
            name: 'Reloj Seiko',
            price: 199.99,
            quantity: 1,
            images: ['/images/reloj2.jpg'],
            href: '/products/reloj-seiko',
            description: 'Reloj Seiko',
            stock: 5,
          },
        ],
        subtotal: 259.97,
        shipping: 0,
        total: 259.97,
        orderStatus: 'shipped',
        paymentIntentId: 'pi_123456',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockOrder] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items).toHaveLength(2)
      expect(data.data.items[0].name).toBe('Reloj Casio')
      expect(data.data.items[0].quantity).toBe(2)
      expect(data.data.items[0].price).toBe(29.99)
      expect(data.data.items[0].images).toEqual(['/images/reloj1.jpg'])
      expect(data.data.subtotal).toBe(259.97)
      expect(data.data.total).toBe(259.97)
    })
  })

  /**
   * Test 5: Manejo de errores de Strapi
   */
  describe('Manejo de errores', () => {
    it('should return 500 if Strapi users/me fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to authenticate user')
    })

    it('should return 500 if Strapi orders fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch order from Strapi')
    })

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network failure')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A',
        {
          headers: {
            Authorization: 'Bearer valid-jwt-token',
          },
        }
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
