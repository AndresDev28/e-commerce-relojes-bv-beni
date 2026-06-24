/**
 * Suite de Tests para el endpoint GET /api/orders
 *
 * @description
 * Este archivo contiene todas las pruebas unitarias para el endpoint de órdenes.
 * Utiliza el enfoque TDD (Test-Driven Development), escribiendo primero los tests
 * y luego la implementación.
 *
 * FUNCIONALIDADES TESTEADAS:
 * [ORD-01] - Obtención de órdenes desde Strapi
 * [ORD-02] - Paginación de resultados
 * [SEC-01] - JWT validation via requireUser
 * [SEC-02] - IDOR prevention
 * [TRC-01] - X-Trace-Id propagation
 *
 * PATRÓN DE DISEÑO:
 * - Arrange-Act-Assert (AAA): Organización clara de cada test en 3 fases
 * - Mocking: Simulación de dependencias externas (Strapi API)
 * - Isolation: Cada test es independiente y no afecta a otros
 *
 * @see https://vitest.dev/guide/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// ============================================================================
// CONFIGURACIÓN DE MOCKS
// ============================================================================

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337'
}))

// Restore globals after each test (fix V5 stubbing)
afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================================
// SUITE DE TESTS: JWT Validation & Authorization (requireUser)
// ============================================================================

describe('[SEC-01] JWT Validation via requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should return 401 if no authorization header is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized - JWT token required')
  })

  it('should return 401 if authorization header is malformed', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'InvalidToken123'
      }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized - Invalid token format')
  })

  it('should return 401 when JWT is expired (Strapi returns 401)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { 'Authorization': 'Bearer expired-token' }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Sesión expirada. Inicia sesión de nuevo.')
  })
})

// ============================================================================
// SUITE DE TESTS: IDOR Prevention
// ============================================================================

describe('[SEC-02] IDOR Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Mock successful Strapi user validation
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })
  })

  it('should return 403 when user param does not match JWT user', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders?user=99', {
      headers: { 'Authorization': 'Bearer valid-token' }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('No tienes permiso para acceder a este recurso.')
  })

  it('should allow request when user param matches JWT user', async () => {
    // Mock Strapi orders response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 1, orderId: 'ORD-001', createdAt: '2025-11-20T10:00:00Z' }],
        meta: { pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 } },
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/orders?user=42', {
      headers: { 'Authorization': 'Bearer valid-token' }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(1)
  })
})

// ============================================================================
// SUITE DE TESTS: Trace Id Propagation
// ============================================================================

describe('[TRC-01] X-Trace-Id Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Mock successful Strapi user validation
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })
    // Mock Strapi orders response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { pagination: { page: 1, pageSize: 10, pageCount: 1, total: 0 } },
      }),
    })
  })

  it('should echo X-Trace-Id in response when provided in request', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-token',
        'X-Trace-Id': 'test-trace-abc-123',
      }
    })

    const response = await GET(request)

    expect(response.headers.get('X-Trace-Id')).toBe('test-trace-abc-123')
  })

  it('should propagate X-Trace-Id to Strapi fetch call', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-token',
        'X-Trace-Id': 'test-trace-abc-123',
      }
    })

    await GET(request)

    // Second fetch call is to Strapi orders
    const strapiCall = (global.fetch as any).mock.calls[1]
    expect(strapiCall[1].headers['X-Trace-Id']).toBe('test-trace-abc-123')
  })

  it('should generate and echo X-Trace-Id when not provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: { 'Authorization': 'Bearer valid-token' }
    })

    const response = await GET(request)
    const traceId = response.headers.get('X-Trace-Id')

    expect(traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})

// ============================================================================
// SUITE DE TESTS: Funcionalidad básica del endpoint
// ============================================================================

/**
 * [ORD-01] Suite de tests para el endpoint GET /api/orders
 *
 * @description
 * Verifica el comportamiento básico del endpoint:
 * - Autenticación y autorización
 * - Integración con Strapi
 * - Manejo de errores
 * - Ordenamiento de resultados
 */
describe('[ORD-01] GET /api/orders', () => {
  /**
   * Configuración que se ejecuta ANTES de cada test
   */
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Mock successful Strapi user validation
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })
  })

  /**
   * Test: Debe obtener órdenes de Strapi y ordenarlas por fecha
   *
   * @description
   * Verifica el flujo completo exitoso:
   * 1. Request autenticado correctamente
   * 2. Llamada a Strapi con el token JWT
   * 3. Procesamiento de la respuesta
   * 4. Ordenamiento por fecha (más reciente primero)
   *
   * DECISIÓN DE DISEÑO:
   * - Ordenar por createdAt DESC: Los usuarios quieren ver las órdenes
   *   más recientes primero (patrón común en e-commerce)
   *
   * ALTERNATIVA CONSIDERADA:
   * - Ordenar por updatedAt: Rechazado porque una orden vieja con un
   *   cambio pequeño aparecería primero, confundiendo al usuario
   *
   * @example
   * // Orden esperada en la respuesta:
   * // [ORD-002 (2025-11-20), ORD-001 (2025-11-19)]
   */
  it('should fetch orders from Strapi and return them sorted by date', async () => {
    // Arrange: Preparar datos de prueba con fechas diferentes
    const mockOrders = [
      {
        id: 2,
        documentId: 'doc-002',
        orderId: 'ORD-1700000002-A',
        items: [{ id: 1, name: 'Reloj A', price: 100, quantity: 1 }],
        subtotal: 100,
        shipping: 10,
        total: 110,
        orderStatus: 'paid',
        createdAt: '2025-11-20T10:00:00Z', // MÁS RECIENTE
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z'
      },
      {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1700000001-A',
        items: [{ id: 2, name: 'Reloj B', price: 200, quantity: 1 }],
        subtotal: 200,
        shipping: 10,
        total: 210,
        orderStatus: 'pending',
        createdAt: '2025-11-19T10:00:00Z', // MÁS ANTIGUA
        updatedAt: '2025-11-19T10:00:00Z',
        publishedAt: '2025-11-19T10:00:00Z'
      }
    ]

    // First fetch: Strapi user validation (already mocked in beforeEach)
    // Second fetch: Strapi orders response
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockOrders })
    })

    // Crear request autenticado
    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar respuesta exitosa y ordenamiento correcto
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(2)
    // La orden más reciente (2025-11-20) debe aparecer primero
    expect(data.data[0].orderId).toBe('ORD-1700000002-A')
    expect(data.data[1].orderId).toBe('ORD-1700000001-A')

    // Verify Strapi orders fetch was called with correct token and trace-id
    const strapiCall = (global.fetch as any).mock.calls[1]
    expect(strapiCall[0]).toContain('/api/orders')
    expect(strapiCall[1].headers).toHaveProperty('Authorization')
    expect(strapiCall[1].headers).toHaveProperty('X-Trace-Id')
  })

  /**
   * Test: Debe manejar errores de Strapi de forma elegante
   *
   * @description
   * Verifica que el endpoint maneje errores del backend (Strapi) sin
   * exponer información sensible al cliente.
   *
   * CASO EDGE: Strapi tiene un error interno (BD caída, timeout, etc.)
   *
   * PATRÓN DE DISEÑO: Graceful Degradation
   * - Capturar el error antes de que llegue al cliente
   * - Retornar un mensaje genérico (no exponer detalles del servidor)
   * - Usar status code apropiado (500 = error del servidor)
   *
   * POR QUÉ OCULTAR DETALLES:
   * Seguridad: No revelar información sobre la infraestructura
   * (nombres de BD, rutas internas, versiones, etc.)
   *
   * @example
   * // Error de Strapi: "Database connection failed"
   * // Respuesta al cliente: "Failed to fetch orders from Strapi"
   */
  it('should handle Strapi errors gracefully', async () => {
    // Arrange: Simular error 500 de Strapi
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false, // Indica que la respuesta HTTP fue un error
      status: 500,
      json: async () => ({ error: { message: 'Database connection failed' } })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Debe retornar 502 (gateway error) con mensaje genérico
    expect(response.status).toBe(502)
    expect(data.error).toBe('No pudimos cargar tus pedidos. Intentá de nuevo.')
    // IMPORTANTE: No exponemos "Database connection failed" ni el backend al cliente
  })

  /**
   * Test: Debe manejar errores de red de forma elegante
   *
   * @description
   * Verifica el manejo de errores cuando la llamada a Strapi falla
   * completamente (no hay respuesta HTTP).
   *
   * CASOS EDGE CUBIERTOS:
   * - Strapi está caído (no responde)
   * - Timeout de red
   * - DNS no resuelve
   * - Conexión rechazada
   *
   * DIFERENCIA CON EL TEST ANTERIOR:
   * - Test anterior: Strapi responde con error (fetch exitoso pero ok=false)
   * - Este test: fetch falla completamente (promesa rechazada)
   *
   * PATRÓN: Error Boundary
   * Capturar excepciones no controladas para evitar que la app se rompa
   */
  it('should handle network errors gracefully', async () => {
    // Arrange: Simular fallo total de red (promesa rechazada)
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Debe retornar 500 con mensaje genérico
    expect(response.status).toBe(500)
    expect(data.error).toBe('Ocurrió un error inesperado. Intentá de nuevo.')
    // Mensaje aún más genérico para no dar pistas sobre la arquitectura
  })
})

// ============================================================================
// SUITE DE TESTS: Paginación
// ============================================================================

/**
 * [ORD-02] Suite de tests para paginación de órdenes
 *
 * @description
 * Verifica que el endpoint implemente paginación correctamente para
 * manejar grandes cantidades de órdenes sin problemas de rendimiento.
 *
 * POR QUÉ NECESITAMOS PAGINACIÓN:
 * - Performance: Evitar cargar miles de órdenes en una sola petición
 * - UX: Mejora la experiencia del usuario (carga más rápida)
 * - Ancho de banda: Reduce el tráfico de red
 *
 * DECISIONES DE DISEÑO:
 * - Tamaño de página por defecto: 10 órdenes
 * - Parámetro de página: ?page=1, ?page=2, etc.
 * - Metadata incluida: total de registros, total de páginas, etc.
 *
 * PATRÓN: Offset-based pagination
 * Alternativas consideradas:
 * - Cursor-based: Más eficiente pero más complejo
 * - Load more: Menos control para el usuario
 */
describe('[ORD-02] Pagination', () => {
  /**
   * Setup antes de cada test
   * Garantiza aislamiento entre tests de paginación
   */
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    // Mock successful Strapi user validation
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, email: 'user@example.com' }),
    })
  })

  /**
   * Test: Debe retornar 10 órdenes por página por defecto
   *
   * @description
   * Verifica el comportamiento por defecto cuando no se especifica
   * un tamaño de página.
   *
   * DECISIÓN: 10 órdenes por defecto
   * - No es muy poco (requeriría muchas páginas)
   * - No es demasiado (afectaría rendimiento)
   * - Es un número estándar en e-commerce
   *
   * TÉCNICA USADA: Array.from() con función generadora
   * Genera datos de prueba dinámicamente en lugar de hardcodearlos
   *
   * @example
   * // Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
   * // Genera: [{ id: 1 }, { id: 2 }, ..., { id: 10 }]
   */
  it('should return 10 orders per page by default', async () => {
    // Arrange: Generar 10 órdenes mock dinámicamente
    const mockOrders = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      documentId: `doc-00${i + 1}`,
      orderId: `ORD-170000000${i + 1}-A`,
      items: [{ id: 1, name: `Reloj ${i + 1}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      // Fechas inversas para simular orden descendente
      createdAt: `2025-11-${20 - i}T10:00:00Z`,
      updatedAt: `2025-11-${20 - i}T10:00:00Z`,
      publishedAt: `2025-11-${20 - i}T10:00:00Z`
    }))

    // Mock de respuesta de Strapi con metadata de paginación
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 1,        // Página actual
            pageSize: 10,   // Tamaño de página
            pageCount: 3,   // Total de páginas disponibles
            total: 25       // Total de órdenes en la BD
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar respuesta y metadata de paginación
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(10) // Exactamente 10 órdenes
    expect(data.meta.pagination.pageSize).toBe(10)
    expect(data.meta.pagination.page).toBe(1) // Primera página por defecto

    /**
     * CONCEPTO IMPORTANTE: URL Encoding
     *
     * Strapi espera parámetros de paginación en formato:
     * pagination[pageSize]=10&pagination[page]=1
     *
     * Cuando estos parámetros se codifican en una URL, los corchetes []
     * se convierten en %5B y %5D:
     * pagination%5BpageSize%5D=10&pagination%5Bpage%5D=1
     *
     * POR QUÉ: Los corchetes son caracteres especiales en URLs y deben
     * ser codificados para evitar problemas de parsing
     */
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5BpageSize%5D=10'),
      expect.any(Object)
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5Bpage%5D=1'),
      expect.any(Object)
    )
  })

  /**
   * Test: Debe soportar el parámetro de página
   *
   * @description
   * Verifica que el usuario pueda navegar entre diferentes páginas
   * usando el query parameter ?page=N
   *
   * CASO DE USO:
   * Usuario ve página 1 y quiere ver más órdenes antiguas en página 2
   *
   * TÉCNICA: IDs incrementales para segunda página
   * - Página 1: órdenes 1-10
   * - Página 2: órdenes 11-20 (i + 11 genera: 11, 12, 13, ..., 20)
   * - Página 3: órdenes 21-25
   *
   * @example
   * // Request: GET /api/orders?page=2
   * // Response: Órdenes 11-20 de 25 totales
   */
  it('should support page parameter', async () => {
    // Arrange: Generar órdenes de la página 2 (IDs 11-20)
    const mockOrders = Array.from({ length: 10 }, (_, i) => ({
      id: i + 11, // Empieza en 11 para simular segunda página
      documentId: `doc-0${i + 11}`,
      orderId: `ORD-170000000${i + 11}-A`,
      items: [{ id: 1, name: `Reloj ${i + 11}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      createdAt: `2025-11-${10 - i}T10:00:00Z`,
      updatedAt: `2025-11-${10 - i}T10:00:00Z`,
      publishedAt: `2025-11-${10 - i}T10:00:00Z`
    }))

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 2,       // Segunda página
            pageSize: 10,
            pageCount: 3,  // 3 páginas totales (25 órdenes / 10 por página)
            total: 25
          }
        }
      })
    })

    // Request con query parameter ?page=2
    const request = new NextRequest('http://localhost:3000/api/orders?page=2', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar que se retorna la página 2 correctamente
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(10)
    expect(data.meta.pagination.page).toBe(2) // Confirmar página 2

    // Verificar que el parámetro se envió a Strapi correctamente
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination%5Bpage%5D=2'),
      expect.any(Object)
    )
  })

  /**
   * Test: Debe retornar menos de 10 órdenes en la última página
   *
   * @description
   * Verifica el comportamiento cuando la última página no está completa.
   * Este es un CASO EDGE importante.
   *
   * ESCENARIO:
   * - Total de órdenes: 25
   * - Tamaño de página: 10
   * - Páginas: 3 (10 + 10 + 5)
   * - Última página: Solo 5 órdenes
   *
   * POR QUÉ ES IMPORTANTE:
   * - Evita errores cuando total % pageSize != 0
   * - Frontend debe manejar arrays con tamaño variable
   * - Puede indicar que es la última página (útil para UI)
   *
   * CÁLCULO:
   * Página 1: 1-10   (10 órdenes)
   * Página 2: 11-20  (10 órdenes)
   * Página 3: 21-25  (5 órdenes) <- CASO EDGE
   *
   * @example
   * // 25 órdenes total ÷ 10 por página = 2.5 páginas
   * // Resultado: 3 páginas, última con 5 órdenes
   */
  it('should return less than 10 orders on last page', async () => {
    // Arrange: Generar solo 5 órdenes para la última página (IDs 21-25)
    const mockOrders = Array.from({ length: 5 }, (_, i) => ({
      id: i + 21, // IDs 21-25 para la tercera página
      documentId: `doc-0${i + 21}`,
      orderId: `ORD-170000000${i + 21}-A`,
      items: [{ id: 1, name: `Reloj ${i + 21}`, price: 100, quantity: 1 }],
      subtotal: 100,
      shipping: 10,
      total: 110,
      orderStatus: 'paid',
      createdAt: `2025-11-0${i + 1}T10:00:00Z`,
      updatedAt: `2025-11-0${i + 1}T10:00:00Z`,
      publishedAt: `2025-11-0${i + 1}T10:00:00Z`
    }))

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 3,       // Última página
            pageSize: 10,  // Tamaño configurado (aunque solo hay 5)
            pageCount: 3,  // Total de páginas
            total: 25      // Total de órdenes (10+10+5)
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders?page=3', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar que se retornan solo 5 órdenes (no 10)
    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(5) // IMPORTANTE: Solo 5, no 10
    expect(data.meta.pagination.page).toBe(3)
    expect(data.meta.pagination.total).toBe(25)
    // Nota: Frontend puede detectar última página si data.length < pageSize
  })

  /**
   * Test: Debe retornar array vacío cuando no hay órdenes
   *
   * @description
   * Verifica el comportamiento cuando un usuario nuevo o una tienda nueva
   * aún no tiene órdenes registradas.
   *
   * CASO EDGE: Estado inicial
   * - Nuevo usuario sin historial de compras
   * - Tienda recién creada sin ventas
   * - Filtros que no coinciden con ninguna orden
   *
   * DECISIÓN DE DISEÑO:
   * - Retornar 200 (no 404) porque la petición es válida
   * - Array vacío [] (no null) para facilitar iteración en frontend
   * - Metadata con total=0 para que UI muestre mensaje apropiado
   *
   * PATRÓN: Null Object Pattern
   * Retornar un objeto válido vacío en lugar de null evita:
   * - Null pointer exceptions en frontend
   * - Verificaciones if(data) antes de .map()
   * - Código más limpio y seguro
   *
   * @example
   * // Frontend puede hacer directamente:
   * // data.data.map(order => <OrderCard />)
   * // Sin necesidad de: data.data?.map() o if(data.data)
   */
  it('should return empty array and proper metadata when no orders exist', async () => {
    // Arrange: Simular BD vacía (sin órdenes)
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [], // Array vacío, NO null
        meta: {
          pagination: {
            page: 1,
            pageSize: 10,
            pageCount: 0, // 0 páginas porque no hay datos
            total: 0      // 0 órdenes totales
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar respuesta exitosa con array vacío
    expect(response.status).toBe(200) // 200, no 404
    expect(data.data).toEqual([])     // Array vacío válido
    expect(data.meta.pagination.total).toBe(0)
    expect(data.meta.pagination.pageCount).toBe(0)
    // Frontend puede usar total=0 para mostrar: "No tienes órdenes aún"
  })

  /**
   * Test: Debe incluir metadata de paginación en la respuesta
   *
   * @description
   * Verifica que la respuesta SIEMPRE incluya metadata de paginación,
   * independientemente del número de resultados.
   *
   * POR QUÉ ES IMPORTANTE LA METADATA:
   * Frontend necesita esta información para:
   * 1. Mostrar "Página X de Y"
   * 2. Habilitar/deshabilitar botones "Anterior/Siguiente"
   * 3. Renderizar componente de paginación
   * 4. Mostrar "Mostrando 1-10 de 47 órdenes"
   * 5. Pre-calcular si hay más páginas disponibles
   *
   * ESTRUCTURA DE METADATA:
   * {
   *   page: número de página actual (1-indexed)
   *   pageSize: órdenes por página (constante: 10)
   *   pageCount: total de páginas disponibles
   *   total: total de órdenes en la BD
   * }
   *
   * CÁLCULO EJEMPLO:
   * - Total: 47 órdenes
   * - PageSize: 10
   * - PageCount: Math.ceil(47/10) = 5 páginas
   *
   * @example
   * // Frontend puede calcular:
   * // const hasNextPage = page < pageCount
   * // const hasPrevPage = page > 1
   * // const showing = `${(page-1)*pageSize + 1}-${page*pageSize} de ${total}`
   */
  it('should include pagination metadata in response', async () => {
    // Arrange: Mock con metadata realista (47 órdenes totales)
    const mockOrders = [
      {
        id: 1,
        documentId: 'doc-001',
        orderId: 'ORD-1700000001-A',
        items: [{ id: 1, name: 'Reloj A', price: 100, quantity: 1 }],
        subtotal: 100,
        shipping: 10,
        total: 110,
        orderStatus: 'paid',
        createdAt: '2025-11-20T10:00:00Z',
        updatedAt: '2025-11-20T10:00:00Z',
        publishedAt: '2025-11-20T10:00:00Z'
      }
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockOrders,
        meta: {
          pagination: {
            page: 1,       // Página actual
            pageSize: 10,  // Órdenes por página
            pageCount: 5,  // Total de páginas (ceil(47/10))
            total: 47      // Total de órdenes
          }
        }
      })
    })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      headers: {
        'Authorization': 'Bearer valid-jwt-token'
      }
    })

    // Act: Ejecutar el endpoint
    const response = await GET(request)
    const data = await response.json()

    // Assert: Verificar presencia y estructura de metadata
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('meta')           // Debe tener 'meta'
    expect(data.meta).toHaveProperty('pagination') // Debe tener 'pagination'

    // Verificar que todos los campos estén presentes y correctos
    expect(data.meta.pagination).toEqual({
      page: 1,       // Primera página
      pageSize: 10,  // 10 por página
      pageCount: 5,  // 5 páginas totales
      total: 47      // 47 órdenes totales
    })

    /**
     * Con esta metadata, el frontend puede mostrar:
     * - "Mostrando 1-10 de 47 órdenes"
     * - Botón "Siguiente" habilitado (page 1 < pageCount 5)
     * - Botón "Anterior" deshabilitado (page === 1)
     * - Paginación: [1] 2 3 4 5
     */
  })
})
