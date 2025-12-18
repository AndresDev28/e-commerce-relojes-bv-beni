/**
 * Tests para OrderStatus enum y helpers
 * [ORD-17] Validar enum de estados
 */

import { describe, it, expect } from 'vitest'
import {
  OrderStatus,
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_TRANSITIONS,
  isValidStatusTransition,
  getStatusConfig,
  isErrorStatus,
  isActiveStatus,
  shouldShowStatusIcon,
  ACTIVE_ORDER_STATUSES,
  ERROR_ORDER_STATUSES,
  type StatusHistoryItem,
} from '../index'

describe('[ORD-17] OrderStatus Enum', () => {
  describe('OrderStatus values', () => {
    it('should have all required status values', () => {
      expect(OrderStatus.PENDING).toBe('pending')
      expect(OrderStatus.PAID).toBe('paid')
      expect(OrderStatus.PROCESSING).toBe('processing')
      expect(OrderStatus.SHIPPED).toBe('shipped')
      expect(OrderStatus.DELIVERED).toBe('delivered')
      expect(OrderStatus.CANCELLED).toBe('cancelled')
      expect(OrderStatus.REFUNDED).toBe('refunded')
    })

    it('should have exactly 7 status values', () => {
      const values = Object.values(OrderStatus)
      expect(values).toHaveLength(7)
    })
  })

  describe('ORDER_STATUS_CONFIG', () => {
    it('should have configuration for all statuses', () => {
      Object.values(OrderStatus).forEach((status) => {
        const config = ORDER_STATUS_CONFIG[status as OrderStatus]
        expect(config).toBeDefined()
        expect(config.label).toBeTruthy()
        expect(config.color).toBeTruthy()
        expect(config.description).toBeTruthy()
        expect(config.icon).toBeTruthy()
      })
    })

    it('should have correct labels in Spanish', () => {
      expect(ORDER_STATUS_CONFIG[OrderStatus.PENDING].label).toBe(
        'Pago Pendiente'
      )
      expect(ORDER_STATUS_CONFIG[OrderStatus.PAID].label).toBe(
        'Pago Confirmado'
      )
      expect(ORDER_STATUS_CONFIG[OrderStatus.PROCESSING].label).toBe(
        'En Preparación'
      )
      expect(ORDER_STATUS_CONFIG[OrderStatus.SHIPPED].label).toBe('Enviado')
      expect(ORDER_STATUS_CONFIG[OrderStatus.DELIVERED].label).toBe('Entregado')
      expect(ORDER_STATUS_CONFIG[OrderStatus.CANCELLED].label).toBe('Cancelado')
      expect(ORDER_STATUS_CONFIG[OrderStatus.REFUNDED].label).toBe(
        'Reembolsado'
      )
    })

    it('should have correct colors for each status', () => {
      expect(ORDER_STATUS_CONFIG[OrderStatus.PENDING].color).toBe('gray')
      expect(ORDER_STATUS_CONFIG[OrderStatus.PAID].color).toBe('blue')
      expect(ORDER_STATUS_CONFIG[OrderStatus.PROCESSING].color).toBe('yellow')
      expect(ORDER_STATUS_CONFIG[OrderStatus.SHIPPED].color).toBe('orange')
      expect(ORDER_STATUS_CONFIG[OrderStatus.DELIVERED].color).toBe('green')
      expect(ORDER_STATUS_CONFIG[OrderStatus.CANCELLED].color).toBe('red')
      expect(ORDER_STATUS_CONFIG[OrderStatus.REFUNDED].color).toBe('purple')
    })
  })

  describe('ORDER_STATUS_TRANSITIONS', () => {
    it('should allow valid forward transitions', () => {
      // Normal flow: pending → paid → processing → shipped → delivered
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING]).toContain(
        OrderStatus.PAID
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PAID]).toContain(
        OrderStatus.PROCESSING
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PROCESSING]).toContain(
        OrderStatus.SHIPPED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).toContain(
        OrderStatus.DELIVERED
      )
    })

    it('should allow cancellation from early states', () => {
      // Can cancel before shipping
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING]).toContain(
        OrderStatus.CANCELLED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PAID]).toContain(
        OrderStatus.CANCELLED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PROCESSING]).toContain(
        OrderStatus.CANCELLED
      )

      // Cannot cancel after shipped
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).not.toContain(
        OrderStatus.CANCELLED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(
        OrderStatus.CANCELLED
      )
    })

    it('should allow refund after shipping', () => {
      // Can refund after shipped or delivered
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).toContain(
        OrderStatus.REFUNDED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).toContain(
        OrderStatus.REFUNDED
      )

      // Cannot refund before shipping
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PENDING]).not.toContain(
        OrderStatus.REFUNDED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PAID]).not.toContain(
        OrderStatus.REFUNDED
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.PROCESSING]).not.toContain(
        OrderStatus.REFUNDED
      )
    })

    it('should not allow transitions from final states', () => {
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.CANCELLED]).toHaveLength(0)
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.REFUNDED]).toHaveLength(0)
    })

    it('should not allow backward transitions', () => {
      // Cannot go from delivered to any previous state
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(
        OrderStatus.PENDING
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(
        OrderStatus.PAID
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(
        OrderStatus.PROCESSING
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.DELIVERED]).not.toContain(
        OrderStatus.SHIPPED
      )

      // Cannot go from shipped to paid
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).not.toContain(
        OrderStatus.PAID
      )
      expect(ORDER_STATUS_TRANSITIONS[OrderStatus.SHIPPED]).not.toContain(
        OrderStatus.PROCESSING
      )
    })
  })

  describe('isValidStatusTransition()', () => {
    it('should return true for valid transitions', () => {
      expect(
        isValidStatusTransition(OrderStatus.PENDING, OrderStatus.PAID)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)
      ).toBe(true)
    })

    it('should return false for invalid transitions', () => {
      // Backward transitions
      expect(
        isValidStatusTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)
      ).toBe(false)
      expect(
        isValidStatusTransition(OrderStatus.SHIPPED, OrderStatus.PAID)
      ).toBe(false)

      // Invalid transitions
      expect(
        isValidStatusTransition(OrderStatus.CANCELLED, OrderStatus.PAID)
      ).toBe(false)
      expect(
        isValidStatusTransition(OrderStatus.DELIVERED, OrderStatus.PROCESSING)
      ).toBe(false)
    })

    it('should return false for transitions from final states', () => {
      expect(
        isValidStatusTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)
      ).toBe(false)
      expect(
        isValidStatusTransition(OrderStatus.CANCELLED, OrderStatus.DELIVERED)
      ).toBe(false)
      expect(
        isValidStatusTransition(OrderStatus.REFUNDED, OrderStatus.DELIVERED)
      ).toBe(false)
      expect(
        isValidStatusTransition(OrderStatus.REFUNDED, OrderStatus.PENDING)
      ).toBe(false)
    })

    it('should handle cancellation transitions correctly', () => {
      expect(
        isValidStatusTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.PAID, OrderStatus.CANCELLED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)
      ).toBe(false)
    })

    it('should handle refund transitions correctly', () => {
      expect(
        isValidStatusTransition(OrderStatus.SHIPPED, OrderStatus.REFUNDED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.DELIVERED, OrderStatus.REFUNDED)
      ).toBe(true)
      expect(
        isValidStatusTransition(OrderStatus.PENDING, OrderStatus.REFUNDED)
      ).toBe(false)
    })
  })

  describe('getStatusConfig()', () => {
    it('should return correct config for each status', () => {
      const paidConfig = getStatusConfig(OrderStatus.PAID)
      expect(paidConfig.label).toBe('Pago Confirmado')
      expect(paidConfig.color).toBe('blue')
      expect(paidConfig.description).toBeTruthy()

      const deliveredConfig = getStatusConfig(OrderStatus.DELIVERED)
      expect(deliveredConfig.label).toBe('Entregado')
      expect(deliveredConfig.color).toBe('green')
      expect(deliveredConfig.description).toBeTruthy()
    })

    it('should return config with all required properties', () => {
      Object.values(OrderStatus).forEach((status) => {
        const config = getStatusConfig(status as OrderStatus)
        expect(config).toHaveProperty('label')
        expect(config).toHaveProperty('color')
        expect(config).toHaveProperty('description')
        expect(config).toHaveProperty('icon')
      })
    })
  })

  describe('isErrorStatus()', () => {
    it('should return true for error statuses', () => {
      expect(isErrorStatus(OrderStatus.CANCELLED)).toBe(true)
      expect(isErrorStatus(OrderStatus.REFUNDED)).toBe(true)
    })

    it('should return false for non-error statuses', () => {
      expect(isErrorStatus(OrderStatus.PENDING)).toBe(false)
      expect(isErrorStatus(OrderStatus.PAID)).toBe(false)
      expect(isErrorStatus(OrderStatus.PROCESSING)).toBe(false)
      expect(isErrorStatus(OrderStatus.SHIPPED)).toBe(false)
      expect(isErrorStatus(OrderStatus.DELIVERED)).toBe(false)
    })
  })

  describe('isActiveStatus()', () => {
    it('should return true for active statuses', () => {
      expect(isActiveStatus(OrderStatus.PENDING)).toBe(true)
      expect(isActiveStatus(OrderStatus.PAID)).toBe(true)
      expect(isActiveStatus(OrderStatus.PROCESSING)).toBe(true)
      expect(isActiveStatus(OrderStatus.SHIPPED)).toBe(true)
    })

    it('should return false for non-active statuses', () => {
      expect(isActiveStatus(OrderStatus.DELIVERED)).toBe(false)
      expect(isActiveStatus(OrderStatus.CANCELLED)).toBe(false)
      expect(isActiveStatus(OrderStatus.REFUNDED)).toBe(false)
    })
  })

  describe('Status arrays', () => {
    it('should have correct active statuses', () => {
      expect(ACTIVE_ORDER_STATUSES).toEqual([
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
      ])
    })

    it('should have correct error statuses', () => {
      expect(ERROR_ORDER_STATUSES).toEqual([
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ])
    })
  })

  describe('shouldShowStatusIcon()', () => {
    describe('With status history', () => {
      const mockHistory: StatusHistoryItem[] = [
        { status: OrderStatus.PENDING, date: '2025-11-20T10:00:00Z' },
        { status: OrderStatus.PAID, date: '2025-11-20T10:05:00Z' },
      ]

      it('should show icon if status is in history (completed)', () => {
        expect(
          shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.PROCESSING, mockHistory)
        ).toBe(true)
        expect(
          shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.PROCESSING, mockHistory)
        ).toBe(true)
      })

      it('should NOT show icon for current status (in progress)', () => {
        expect(
          shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.PROCESSING, mockHistory)
        ).toBe(false)
      })

      it('should NOT show icon for future statuses', () => {
        expect(
          shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.PROCESSING, mockHistory)
        ).toBe(false)
        expect(
          shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.PROCESSING, mockHistory)
        ).toBe(false)
      })
    })

    describe('Without status history (sequence-based)', () => {
      it('should show icon for statuses BEFORE current in sequence', () => {
        // Current: SHIPPED
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true)
      })

      it('should NOT show icon for current status', () => {
        expect(shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.SHIPPED)).toBe(false)
      })

      it('should NOT show icon for statuses AFTER current in sequence', () => {
        // Current: PAID
        expect(shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.PAID)).toBe(false)
        expect(shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.PAID)).toBe(false)
        expect(shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.PAID)).toBe(false)
      })
    })

    describe('Special cases', () => {
      it('should show icon for DELIVERED when it is the current status (completed successfully)', () => {
        expect(shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).toBe(true)
      })

      it('should show icon for error states when they are current', () => {
        expect(shouldShowStatusIcon(OrderStatus.CANCELLED, OrderStatus.CANCELLED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.REFUNDED, OrderStatus.REFUNDED)).toBe(true)
      })

      it('should NOT show icon for error states when they are not current', () => {
        expect(shouldShowStatusIcon(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(false)
        expect(shouldShowStatusIcon(OrderStatus.REFUNDED, OrderStatus.SHIPPED)).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('should handle empty status history', () => {
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.PAID, [])).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.PAID, [])).toBe(false)
      })

      it('should handle undefined status history', () => {
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.SHIPPED, undefined)).toBe(
          true
        )
        expect(shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.SHIPPED, undefined)).toBe(
          false
        )
      })
    })

    describe('Real-world scenarios', () => {
      it('Scenario: Order just paid, no history yet', () => {
        // Order in PAID state, no history
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.PAID)).toBe(true) // Completed
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.PAID)).toBe(false) // Current
        expect(shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.PAID)).toBe(false) // Future
      })

      it('Scenario: Order shipped with full history', () => {
        const fullHistory: StatusHistoryItem[] = [
          { status: OrderStatus.PENDING, date: '2025-11-20T10:00:00Z' },
          { status: OrderStatus.PAID, date: '2025-11-20T10:05:00Z' },
          { status: OrderStatus.PROCESSING, date: '2025-11-20T14:00:00Z' },
          { status: OrderStatus.SHIPPED, date: '2025-11-21T09:00:00Z' },
        ]

        // All in history show icons
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.SHIPPED, fullHistory)).toBe(
          true
        )
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.SHIPPED, fullHistory)).toBe(true)
        expect(
          shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.SHIPPED, fullHistory)
        ).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.SHIPPED, fullHistory)).toBe(
          true
        ) // In history = completed

        // Future doesn't show
        expect(
          shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.SHIPPED, fullHistory)
        ).toBe(false)
      })

      it('Scenario: Order delivered (final successful state)', () => {
        // DELIVERED as current status always shows icon
        expect(shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.DELIVERED)).toBe(true)

        // All previous states also show icons
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.DELIVERED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.PROCESSING, OrderStatus.DELIVERED)).toBe(true)
        expect(shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true)
      })

      it('Scenario: Order cancelled (error state)', () => {
        // CANCELLED as current status shows icon
        expect(shouldShowStatusIcon(OrderStatus.CANCELLED, OrderStatus.CANCELLED)).toBe(true)

        // Previous states show icons
        expect(shouldShowStatusIcon(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(false) // Not in normal sequence
        expect(shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(false) // Not in normal sequence
      })
    })
  })

  describe('Integration - Stripe Payment Flow', () => {
    it('should support typical Stripe payment flow', () => {
      // 1. Order created, pending payment confirmation
      let currentStatus = OrderStatus.PENDING

      // 2. Stripe confirms payment
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.PAID)
      ).toBe(true)
      currentStatus = OrderStatus.PAID

      // 3. Admin starts preparing order
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.PROCESSING)
      ).toBe(true)
      currentStatus = OrderStatus.PROCESSING

      // 4. Admin ships order
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.SHIPPED)
      ).toBe(true)
      currentStatus = OrderStatus.SHIPPED

      // 5. Customer receives order
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.DELIVERED)
      ).toBe(true)
      currentStatus = OrderStatus.DELIVERED

      // 6. Verify final state is not active
      expect(isActiveStatus(currentStatus)).toBe(false)
    })

    it('should support cancellation flow', () => {
      // User cancels before shipping
      const currentStatus = OrderStatus.PAID
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.CANCELLED)
      ).toBe(true)

      // Cancelled is final state
      expect(
        isValidStatusTransition(OrderStatus.CANCELLED, OrderStatus.PAID)
      ).toBe(false)
      expect(isErrorStatus(OrderStatus.CANCELLED)).toBe(true)
    })

    it('should support refund flow', () => {
      // Refund after delivery
      const currentStatus = OrderStatus.DELIVERED
      expect(
        isValidStatusTransition(currentStatus, OrderStatus.REFUNDED)
      ).toBe(true)

      // Refunded is final state
      expect(
        isValidStatusTransition(OrderStatus.REFUNDED, OrderStatus.PENDING)
      ).toBe(false)
      expect(isErrorStatus(OrderStatus.REFUNDED)).toBe(true)
    })
  })
})
