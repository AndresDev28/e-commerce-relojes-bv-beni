/**
 * Tests para utilidades de envío
 * [PAY-19] Create comprehensive tests for PAY-18 order creation flow
 */

import { describe, it, expect } from 'vitest'
import {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
  calculateShipping,
  hasFreeShipping,
} from '../shipping'

describe('[PAY-19] Shipping Utilities', () => {
  describe('Constants', () => {
    /**
     * Test 1: Verificar que las constantes están definidas
     */
    it('should have SHIPPING_COST defined', () => {
      expect(SHIPPING_COST).toBeDefined()
      expect(typeof SHIPPING_COST).toBe('number')
      expect(SHIPPING_COST).toBe(5.95)
    })

    it('should have FREE_SHIPPING_THRESHOLD defined', () => {
      expect(FREE_SHIPPING_THRESHOLD).toBeDefined()
      expect(typeof FREE_SHIPPING_THRESHOLD).toBe('number')
      expect(FREE_SHIPPING_THRESHOLD).toBe(50)
    })
  })

  describe('calculateShipping', () => {
    /**
     * Test 2: Calcular envío para pedidos bajo el umbral
     */
    it('should return SHIPPING_COST for orders below threshold', () => {
      // Casos bajo el umbral (< 50€)
      expect(calculateShipping(0)).toBe(SHIPPING_COST)
      expect(calculateShipping(10)).toBe(SHIPPING_COST)
      expect(calculateShipping(25.50)).toBe(SHIPPING_COST)
      expect(calculateShipping(49.99)).toBe(SHIPPING_COST)
    })

    /**
     * Test 3: Envío gratis para pedidos iguales o superiores al umbral
     */
    it('should return 0 for orders at or above threshold', () => {
      // Exactamente en el umbral
      expect(calculateShipping(50)).toBe(0)

      // Sobre el umbral
      expect(calculateShipping(50.01)).toBe(0)
      expect(calculateShipping(75)).toBe(0)
      expect(calculateShipping(100)).toBe(0)
      expect(calculateShipping(999.99)).toBe(0)
    })

    /**
     * Test 4: Casos edge con valores límite
     */
    it('should handle edge cases correctly', () => {
      // Justo antes del umbral
      expect(calculateShipping(49.99)).toBe(SHIPPING_COST)

      // Justo en el umbral
      expect(calculateShipping(50.00)).toBe(0)

      // Justo después del umbral
      expect(calculateShipping(50.01)).toBe(0)
    })

    /**
     * Test 5: Valores extremos
     */
    it('should handle extreme values', () => {
      // Valores muy bajos
      expect(calculateShipping(0.01)).toBe(SHIPPING_COST)

      // Valores muy altos
      expect(calculateShipping(10000)).toBe(0)
    })

    /**
     * Test 6: Decimales precisos
     */
    it('should handle decimal values correctly', () => {
      expect(calculateShipping(25.55)).toBe(SHIPPING_COST)
      expect(calculateShipping(49.999)).toBe(SHIPPING_COST)
      expect(calculateShipping(50.001)).toBe(0)
      expect(calculateShipping(75.50)).toBe(0)
    })
  })

  describe('hasFreeShipping', () => {
    /**
     * Test 7: Retornar false para pedidos bajo el umbral
     */
    it('should return false for orders below threshold', () => {
      expect(hasFreeShipping(0)).toBe(false)
      expect(hasFreeShipping(10)).toBe(false)
      expect(hasFreeShipping(25.50)).toBe(false)
      expect(hasFreeShipping(49.99)).toBe(false)
    })

    /**
     * Test 8: Retornar true para pedidos iguales o superiores al umbral
     */
    it('should return true for orders at or above threshold', () => {
      // Exactamente en el umbral
      expect(hasFreeShipping(50)).toBe(true)

      // Sobre el umbral
      expect(hasFreeShipping(50.01)).toBe(true)
      expect(hasFreeShipping(75)).toBe(true)
      expect(hasFreeShipping(100)).toBe(true)
      expect(hasFreeShipping(999.99)).toBe(true)
    })

    /**
     * Test 9: Consistencia con calculateShipping
     */
    it('should be consistent with calculateShipping', () => {
      const testValues = [0, 25, 49.99, 50, 50.01, 75, 100]

      testValues.forEach(value => {
        const freeShipping = hasFreeShipping(value)
        const shippingCost = calculateShipping(value)

        // Si tiene envío gratis, el costo debe ser 0
        // Si no tiene envío gratis, el costo debe ser SHIPPING_COST
        if (freeShipping) {
          expect(shippingCost).toBe(0)
        } else {
          expect(shippingCost).toBe(SHIPPING_COST)
        }
      })
    })

    /**
     * Test 10: Casos edge
     */
    it('should handle edge cases correctly', () => {
      // Justo antes del umbral
      expect(hasFreeShipping(49.99)).toBe(false)

      // Justo en el umbral
      expect(hasFreeShipping(50.00)).toBe(true)

      // Justo después del umbral
      expect(hasFreeShipping(50.01)).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    /**
     * Test 11: Escenario completo de cálculo de pedido
     */
    it('should calculate correct shipping for typical order scenarios', () => {
      // Escenario 1: Pedido pequeño (< 50€)
      const smallOrder = 35.99
      expect(hasFreeShipping(smallOrder)).toBe(false)
      expect(calculateShipping(smallOrder)).toBe(5.95)

      // Total del pedido pequeño
      const smallOrderTotal = smallOrder + calculateShipping(smallOrder)
      expect(smallOrderTotal).toBe(35.99 + 5.95)

      // Escenario 2: Pedido grande (>= 50€)
      const largeOrder = 75.00
      expect(hasFreeShipping(largeOrder)).toBe(true)
      expect(calculateShipping(largeOrder)).toBe(0)

      // Total del pedido grande
      const largeOrderTotal = largeOrder + calculateShipping(largeOrder)
      expect(largeOrderTotal).toBe(75.00)
    })

    /**
     * Test 12: Verificar que añadir envío nunca reduce el precio
     */
    it('should never decrease total price when adding shipping', () => {
      const testSubtotals = [0, 10, 25, 49.99, 50, 75, 100]

      testSubtotals.forEach(subtotal => {
        const shipping = calculateShipping(subtotal)
        const total = subtotal + shipping

        // El total siempre debe ser >= al subtotal
        expect(total).toBeGreaterThanOrEqual(subtotal)
      })
    })

    /**
     * Test 13: Calcular subtotal mínimo para envío gratis
     */
    it('should identify minimum subtotal for free shipping', () => {
      // Justo por debajo del umbral -> paga envío
      const belowThreshold = FREE_SHIPPING_THRESHOLD - 0.01
      expect(calculateShipping(belowThreshold)).toBeGreaterThan(0)

      // Justo en el umbral -> envío gratis
      const atThreshold = FREE_SHIPPING_THRESHOLD
      expect(calculateShipping(atThreshold)).toBe(0)

      // Mensaje de marketing: "¿Falta poco para envío gratis?"
      const currentOrder = 45
      const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - currentOrder
      expect(remainingForFreeShipping).toBe(5)
      expect(hasFreeShipping(currentOrder)).toBe(false)
      expect(hasFreeShipping(currentOrder + remainingForFreeShipping)).toBe(true)
    })
  })
})
