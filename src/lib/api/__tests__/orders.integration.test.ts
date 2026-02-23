import { OrderStatus } from '@/types'
/**
 * Integration tests para Orders API con Strapi real
 * [PAY-20] Tests: Orden se guarda en backend
 *
 * IMPORTANTE: Estos tests requieren que Strapi esté corriendo
 * y que exista un usuario de prueba con credenciales conocidas
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createOrder, getUserOrders } from '../orders'
import type { CreateOrderData } from '../orders'
import { generateOrderId } from '@/lib/orders/generateOrderId'
import { mockCartItems } from './test-helpers'

// Configuración para tests de integración
const TEST_CONFIG = {
  // Usuario de prueba (debe existir en Strapi)
  testUser: {
    identifier: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  },
  strapiUrl: process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337',
}

describe('[PAY-20] Orders Integration Tests', () => {
  let authToken: string
  let createdOrderIds: string[] = []

  /**
   * Antes de todos los tests: autenticar usuario
   */
  beforeAll(async () => {
    console.log('🔐 Autenticando usuario de prueba...')

    const response = await fetch(`${TEST_CONFIG.strapiUrl}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: TEST_CONFIG.testUser.identifier,
        password: TEST_CONFIG.testUser.password,
      }),
    })

    if (!response.ok) {
      throw new Error(
        `❌ No se pudo autenticar usuario de prueba. ` +
          `Asegúrate de que existe en Strapi con email: ${TEST_CONFIG.testUser.identifier}`
      )
    }

    const data = await response.json()
    authToken = data.jwt
    console.log('✅ Usuario autenticado correctamente')
  })

  /**
   * Después de cada test: guardar orderId para limpieza
   */
  beforeEach(() => {
    // Reset para cada test
    createdOrderIds = []
  })

  /**
   * Después de todos los tests: limpiar órdenes creadas
   */
  afterAll(async () => {
    if (createdOrderIds.length === 0) {
      console.log('✅ No hay órdenes para limpiar')
      return
    }

    console.log(`🧹 Limpiando ${createdOrderIds.length} órdenes de prueba...`)

    // Obtener token de admin si es necesario para DELETE
    // Por ahora, las órdenes de prueba quedarán en la BD
    // En producción, usarías un endpoint de cleanup o las borrarías manualmente

    console.log(
      '⚠️ Nota: Las órdenes de prueba quedaron en Strapi. Bórralas manualmente si es necesario.'
    )
  })

  describe('createOrder - Integration', () => {
    /**
     * Test 1: Crear orden y verificar que se guarda en Strapi
     */
    it('should create order in Strapi successfully', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: OrderStatus.PAID,
        paymentIntentId: 'pi_test_integration',
      }

      // ACT
      const result = await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      // ASSERT
      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
      expect(result.data.id).toBeGreaterThan(0)
      expect(result.data.orderId).toBe(orderId)
      expect(result.data.subtotal).toBe(99.99)
      expect(result.data.total).toBe(99.99)
      expect(result.data.orderStatus).toBe('paid')
    }, 10000) // 10s timeout

    /**
     * Test 2: Verificar que items se guardan correctamente como JSON
     */
    it('should save cart items as JSON correctly', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 5.95,
        total: 105.94,
        orderStatus: OrderStatus.PENDING,
      }

      // ACT
      const result = await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      // ASSERT
      expect(result.data.items).toBeDefined()
      expect(Array.isArray(result.data.items)).toBe(true)
      expect(result.data.items.length).toBe(2)
      expect(result.data.items[0].name).toBe('Reloj Casio')
      expect(result.data.items[0].price).toBe(29.99)
      expect(result.data.items[1].name).toBe('Reloj Seiko')
      expect(result.data.items[1].price).toBe(45.0)
    }, 10000)

    /**
     * Test 3: Crear múltiples órdenes y verificar IDs únicos
     */
    it('should create multiple orders with unique IDs', async () => {
      // ARRANGE
      const orderId1 = generateOrderId()
      const orderId2 = generateOrderId()

      const orderData1: CreateOrderData = {
        orderId: orderId1,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: OrderStatus.PAID,
      }

      const orderData2: CreateOrderData = {
        orderId: orderId2,
        items: mockCartItems,
        subtotal: 149.99,
        shipping: 5.95,
        total: 155.94,
        orderStatus: OrderStatus.PENDING,
      }

      // ACT
      const result1 = await createOrder(orderData1, authToken)
      const result2 = await createOrder(orderData2, authToken)

      createdOrderIds.push(orderId1, orderId2)

      // ASSERT
      expect(result1.data.id).not.toBe(result2.data.id)
      expect(result1.data.orderId).toBe(orderId1)
      expect(result2.data.orderId).toBe(orderId2)
    }, 15000)

    /**
     * Test 4: Verificar que orderStatus se guarda correctamente
     */
    it('should save different order statuses correctly', async () => {
      const statuses: Array<'pending' | 'paid' | 'shipped' | 'delivered'> = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ]

      for (const status of statuses) {
        const orderId = generateOrderId()
        const orderData: CreateOrderData = {
          orderId,
          items: mockCartItems,
          subtotal: 99.99,
          shipping: 0,
          total: 99.99,
          orderStatus: status as OrderStatus,
        }

        const result = await createOrder(orderData, authToken)
        createdOrderIds.push(orderId)

        expect(result.data.orderStatus).toBe(status)
      }
    }, 20000)

    /**
     * Test 5: Verificar timestamps de creación
     */
    it('should create order with valid timestamps', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const beforeCreate = new Date()

      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: OrderStatus.PAID,
      }

      // ACT
      const result = await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      const afterCreate = new Date()

      // ASSERT
      expect(result.data.createdAt).toBeDefined()
      const createdAt = new Date(result.data.createdAt)

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    }, 10000)

    /**
     * Test 6: Fallar con token inválido
     */
    it('should fail with invalid JWT token', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: OrderStatus.PAID,
      }

      // ACT & ASSERT
      await expect(
        createOrder(orderData, 'invalid-token-xyz')
      ).rejects.toThrow()
    }, 10000)

    /**
     * Test 7: Crear orden con envío gratis
     */
    it('should create order with free shipping', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 150.0, // Sobre el umbral
        shipping: 0,
        total: 150.0,
        orderStatus: OrderStatus.PAID,
      }

      // ACT
      const result = await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      // ASSERT
      expect(result.data.shipping).toBe(0)
      expect(result.data.subtotal).toBe(150.0)
      expect(result.data.total).toBe(150.0)
    }, 10000)
  })

  describe('getUserOrders - Integration', () => {
    /**
     * Test 8: Obtener órdenes del usuario autenticado
     */
    it('should fetch orders for authenticated user', async () => {
      // ARRANGE - Crear una orden primero
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 99.99,
        shipping: 0,
        total: 99.99,
        orderStatus: OrderStatus.PAID,
      }

      await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      // Pequeño delay para asegurar que Strapi procese la creación
      await new Promise(resolve => setTimeout(resolve, 500))

      // ACT
      const orders = await getUserOrders(authToken)

      // ASSERT
      expect(Array.isArray(orders)).toBe(true)
      expect(orders.length).toBeGreaterThan(0)

      // Verificar que nuestra orden está en la lista
      const ourOrder = orders.find(o => o.orderId === orderId)
      expect(ourOrder).toBeDefined()
    }, 15000)

    /**
     * Test 9: Verificar estructura de órdenes obtenidas
     */
    it('should return orders with correct structure', async () => {
      // ACT
      const orders = await getUserOrders(authToken)

      // ASSERT
      if (orders.length > 0) {
        const firstOrder = orders[0]

        expect(firstOrder).toHaveProperty('id')
        expect(firstOrder).toHaveProperty('documentId')
        expect(firstOrder).toHaveProperty('items')
        expect(firstOrder).toHaveProperty('subtotal')
        expect(firstOrder).toHaveProperty('shipping')
        expect(firstOrder).toHaveProperty('total')
        expect(firstOrder).toHaveProperty('orderStatus')
        expect(firstOrder).toHaveProperty('createdAt')
      }
    }, 10000)

    /**
     * Test 10: Fallar con token inválido
     */
    it('should fail to fetch orders with invalid token', async () => {
      // ACT & ASSERT
      await expect(getUserOrders('invalid-token-abc')).rejects.toThrow()
    }, 10000)
  })

  describe('End-to-End Order Flow', () => {
    /**
     * Test 11: Flujo completo - crear orden y verificar que aparece en lista
     */
    it('should complete full order creation and retrieval flow', async () => {
      // ARRANGE
      const orderId = generateOrderId()
      const orderData: CreateOrderData = {
        orderId,
        items: mockCartItems,
        subtotal: 199.99,
        shipping: 5.95,
        total: 205.94,
        orderStatus: OrderStatus.PAID,
        paymentIntentId: 'pi_test_e2e',
      }

      // ACT - Paso 1: Crear orden
      const createdOrder = await createOrder(orderData, authToken)
      createdOrderIds.push(orderId)

      expect(createdOrder.data.orderId).toBe(orderId)

      // Pequeño delay para asegurar que Strapi procese la creación
      await new Promise(resolve => setTimeout(resolve, 500))

      // ACT - Paso 2: Obtener lista de órdenes
      const orders = await getUserOrders(authToken)

      // ASSERT - Verificar que la orden creada aparece en la lista
      const foundOrder = orders.find(o => o.orderId === orderId)

      expect(foundOrder).toBeDefined()
      expect(foundOrder?.id).toBe(createdOrder.data.id)
      expect(foundOrder?.subtotal).toBe(199.99)
      expect(foundOrder?.shipping).toBe(5.95)
      expect(foundOrder?.total).toBe(205.94)
      expect(foundOrder?.orderStatus).toBe('paid')
    }, 15000)
  })
})
