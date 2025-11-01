import { describe, it, expect } from 'vitest'
import { generateOrderId } from '../generateOrderId'

describe('generateOrderId - [PAY-17]', () => {
  describe('Formato del ID', () => {
    it('should return a string', () => {
      const orderId = generateOrderId()

      expect(typeof orderId).toBe('string')
    })

    it('should start with "ORD-" prefix', () => {
      const orderId = generateOrderId()

      expect(orderId).toMatch(/^ORD-/)
    })

    it('should have format ORD-TIMESTAMP-RANDOM', () => {
      const orderId = generateOrderId()

      // Formato: ORD-1699123456-A5F3
      expect(orderId).toMatch(/^ORD-\d{10}-[A-Z0-9]{4}$/)
    })

    it('should have 3 parts separated by hyphens', () => {
      const orderId = generateOrderId()

      const parts = orderId.split('-')
      expect(parts).toHaveLength(3)
      expect(parts[0]).toBe('ORD')
      expect(parts[1]).toMatch(/^\d{10}$/) // Timestamp (10 dígitos)
      expect(parts[2]).toMatch(/^[A-Z0-9]{4}$/) // Random (4 caracteres)
    })
  })

  describe('Unicidad', () => {
    it('should generate different IDs on consecutive calls', () => {
      const id1 = generateOrderId()
      const id2 = generateOrderId()

      expect(id1).not.toBe(id2)
    })

    it('should generate unique IDs in a loop', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        ids.add(generateOrderId())
      }

      // Todos deberían ser únicos
      expect(ids.size).toBe(100)
    })
  })

  describe('Timestamp', () => {
    it('should use current timestamp in seconds', () => {
      const beforeTimestamp = Math.floor(Date.now() / 1000)
      const orderId = generateOrderId()
      const afterTimestamp = Math.floor(Date.now() / 1000)

      const parts = orderId.split('-')
      const timestamp = parseInt(parts[1], 10)

      // El timestamp debe estar entre before y after
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp)
    })
  })

  describe('Componente aleatorio', () => {
    it('should use uppercase alphanumeric characters only', () => {
      const orderId = generateOrderId()
      const parts = orderId.split('-')
      const randomPart = parts[2]

      // Solo mayúsculas y números
      expect(randomPart).toMatch(/^[A-Z0-9]+$/)
    })

    it('should have exactly 4 random characters', () => {
      const orderId = generateOrderId()
      const parts = orderId.split('-')
      const randomPart = parts[2]

      expect(randomPart).toHaveLength(4)
    })
  })

  describe('Casos edge', () => {
    it('should work when called multiple times rapidly', () => {
      const ids = []

      for (let i = 0; i < 10; i++) {
        ids.push(generateOrderId())
      }

      // Todos deberían tener el formato correcto
      ids.forEach(id => {
        expect(id).toMatch(/^ORD-\d{10}-[A-Z0-9]{4}$/)
      })
    })

    it('should return valid IDs consistently', () => {
      // Ejecutar 50 veces para asegurar consistencia
      for (let i = 0; i < 50; i++) {
        const orderId = generateOrderId()

        expect(orderId).toMatch(/^ORD-\d{10}-[A-Z0-9]{4}$/)
        expect(orderId.split('-')).toHaveLength(3)
      }
    })
  })
})
