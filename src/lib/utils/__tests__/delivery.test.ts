/**
 * [ORD-19] Tests for delivery date calculation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  addDays,
  calculateDeliveryRange,
  formatDeliveryRange,
  formatDeliveredDate,
  getDeliveryEstimate,
} from '../delivery'
import { DELIVERY_DAYS_CONFIG } from '@/types'

describe('Delivery Utilities [ORD-19]', () => {
  describe('addDays', () => {
    it('should add days to a date correctly', () => {
      const start = new Date('2025-11-20T10:00:00Z')
      const result = addDays(start, 3)
      
      expect(result.getDate()).toBe(23)
      expect(result.getMonth()).toBe(10) // November = 10
      expect(result.getFullYear()).toBe(2025)
    })

    it('should handle month transitions', () => {
      const start = new Date('2025-11-29T10:00:00Z')
      const result = addDays(start, 3)
      
      expect(result.getDate()).toBe(2)
      expect(result.getMonth()).toBe(11) // December = 11
    })

    it('should handle year transitions', () => {
      const start = new Date('2025-12-30T10:00:00Z')
      const result = addDays(start, 3)
      
      expect(result.getDate()).toBe(2)
      expect(result.getMonth()).toBe(0) // January = 0
      expect(result.getFullYear()).toBe(2026)
    })
  })

  describe('calculateDeliveryRange', () => {
    it('should calculate correct delivery range', () => {
      const shippedAt = '2025-11-20T10:00:00Z'
      const range = calculateDeliveryRange(shippedAt)
      
      expect(range.minDate.getDate()).toBe(23) // 20 + 3
      expect(range.maxDate.getDate()).toBe(24) // 20 + 4
    })

    it('should use DELIVERY_DAYS_CONFIG values', () => {
      const shippedAt = '2025-11-20T10:00:00Z'
      const range = calculateDeliveryRange(shippedAt)
      
      const shippedDate = new Date(shippedAt)
      const expectedMin = new Date(shippedDate)
      expectedMin.setDate(shippedDate.getDate() + DELIVERY_DAYS_CONFIG.min)
      
      expect(range.minDate.getDate()).toBe(expectedMin.getDate())
    })
  })

  describe('formatDeliveryRange', () => {
    it('should format same month range correctly', () => {
      const range = {
        minDate: new Date('2025-11-24T00:00:00Z'),
        maxDate: new Date('2025-11-25T00:00:00Z'),
      }
      
      const formatted = formatDeliveryRange(range)
      expect(formatted).toMatch(/24-25.*nov.*2025/i)
    })

    it('should format different month range correctly', () => {
      const range = {
        minDate: new Date('2025-11-30T00:00:00Z'),
        maxDate: new Date('2025-12-01T00:00:00Z'),
      }
      
      const formatted = formatDeliveryRange(range)
      expect(formatted).toMatch(/30.*nov.*1.*dic.*2025/i)
    })

    it('should format different year range correctly', () => {
      const range = {
        minDate: new Date('2025-12-31T00:00:00Z'),
        maxDate: new Date('2026-01-01T00:00:00Z'),
      }
      
      const formatted = formatDeliveryRange(range)
      expect(formatted).toMatch(/31.*dic.*2025.*1.*ene.*2026/i)
    })

    it('should format same day correctly', () => {
      const date = new Date('2025-11-24T00:00:00Z')
      const range = { minDate: date, maxDate: date }
      
      const formatted = formatDeliveryRange(range)
      expect(formatted).toMatch(/24.*nov.*2025/i)
      expect(formatted).not.toMatch(/-/)
    })
  })

  describe('formatDeliveredDate', () => {
    it('should format delivered date correctly', () => {
      const deliveredAt = '2025-11-24T14:30:00Z'
      const formatted = formatDeliveredDate(deliveredAt)
      
      expect(formatted).toMatch(/24.*nov.*2025/i)
    })
  })

  describe('getDeliveryEstimate', () => {
    it('should return null for orders not shipped', () => {
      const estimate = getDeliveryEstimate(undefined, undefined)
      expect(estimate).toBeNull()
    })

    it('should return estimated range for shipped orders', () => {
      const shippedAt = '2025-11-20T10:00:00Z'
      const estimate = getDeliveryEstimate(shippedAt, undefined)
      
      expect(estimate).not.toBeNull()
      expect(estimate?.status).toBe('estimated')
      expect(estimate?.formattedText).toMatch(/23-24.*nov.*2025/i)
    })

    it('should return delivered date for delivered orders', () => {
      const shippedAt = '2025-11-20T10:00:00Z'
      const deliveredAt = '2025-11-24T14:30:00Z'
      const estimate = getDeliveryEstimate(shippedAt, deliveredAt)
      
      expect(estimate).not.toBeNull()
      expect(estimate?.status).toBe('delivered')
      expect(estimate?.formattedText).toMatch(/24.*nov.*2025/i)
    })

    it('should prioritize deliveredAt over shippedAt', () => {
      const shippedAt = '2025-11-20T10:00:00Z'
      const deliveredAt = '2025-11-24T14:30:00Z'
      const estimate = getDeliveryEstimate(shippedAt, deliveredAt)
      
      expect(estimate?.status).toBe('delivered')
      expect(estimate?.formattedText).not.toMatch(/23-24/) // No range
      expect(estimate?.formattedText).toMatch(/24/) // Exact date
    })
  })
})
