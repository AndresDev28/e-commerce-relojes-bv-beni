/**
 * [ORD-19] Delivery Date Calculation Utilities
 * 
 * Handles all logic related to estimated delivery dates:
 * - Calculate delivery date range from shipping date
 * - Format dates for user display
 * - Handle edge cases (not shipped, already delivered, etc.)
 * 
 * LEARNING: Why separate file?
 * ============================
 * - Single Responsibility: All delivery logic in one place
 * - Testability: Easy to test in isolation
 * - Reusability: Can be used in multiple components
 * - Maintainability: Easy to find and modify delivery logic
 */

import { DELIVERY_DAYS_CONFIG } from '@/types'
import type { DeliveryDateRange, DeliveryEstimate } from '@/types'
/**
 * Adds days to a date (ignoring weekends/holidays for MVP)
 * 
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 * 
 * @example
 * addDays(new Date('2025-11-20'), 3) // 2025-11-23
 */

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
/**
 * Calculates delivery date range from shipping date
 * 
 * @param shippedAt - ISO date string when order was shipped
 * @returns Range with min and max delivery dates
 * 
 * @example
 * const range = calculateDeliveryRange('2025-11-20T10:00:00Z')
 * // { minDate: 2025-11-23, maxDate: 2025-11-24 }
 */
export function calculateDeliveryRange(shippedAt: string): DeliveryDateRange {
  const shippedDate = new Date(shippedAt)
  
  return {
    minDate: addDays(shippedDate, DELIVERY_DAYS_CONFIG.min),
    maxDate: addDays(shippedDate, DELIVERY_DAYS_CONFIG.max),
  }
}
/**
 * Formats a date range for Spanish display
 * 
 * @param range - Date range to format
 * @returns Formatted string like "24-25 Nov 2025"
 * 
 * CASES:
 * - Same day: "24 Nov 2025"
 * - Same month: "24-25 Nov 2025"
 * - Different months: "30 Nov - 1 Dic 2025"
 * - Different years: "31 Dic 2025 - 1 Ene 2026"
 */
export function formatDeliveryRange(range: DeliveryDateRange): string {
  const { minDate, maxDate } = range
  
  const minDay = minDate.getDate()
  const maxDay = maxDate.getDate()
  const minMonth = minDate.toLocaleDateString('es-ES', { month: 'short' })
  const maxMonth = maxDate.toLocaleDateString('es-ES', { month: 'short' })
  const minYear = minDate.getFullYear()
  const maxYear = maxDate.getFullYear()
  
  // Same day (unlikely but possible)
  if (minDate.getTime() === maxDate.getTime()) {
    return minDate.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  
  // Same month and year
  if (minMonth === maxMonth && minYear === maxYear) {
    return `${minDay}-${maxDay} ${minMonth} ${minYear}`
  }
  
  // Same year, different months
  if (minYear === maxYear) {
    return `${minDay} ${minMonth} - ${maxDay} ${maxMonth} ${minYear}`
  }
  
  // Different years
  return `${minDay} ${minMonth} ${minYear} - ${maxDay} ${maxMonth} ${maxYear}`
}
/**
 * Formats actual delivery date for delivered orders
 * 
 * @param deliveredAt - ISO date string when order was delivered
 * @returns Formatted string like "24 Nov 2025"
 */
export function formatDeliveredDate(deliveredAt: string): string {
  const date = new Date(deliveredAt)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
/**
 * Gets complete delivery estimate for an order
 * 
 * @param shippedAt - When order was shipped (optional)
 * @param deliveredAt - When order was delivered (optional)
 * @returns Complete estimate with status and formatted text
 * 
 * LOGIC:
 * - If delivered: Show actual delivery date
 * - If shipped but not delivered: Show estimated range
 * - If not shipped: Status 'not_shipped' with empty text
 * 
 * @example
 * // Shipped order
 * getDeliveryEstimate('2025-11-20T10:00:00Z', undefined)
 * // { status: 'estimated', formattedText: '24-25 Nov 2025', range: {...} }
 * 
 * // Delivered order
 * getDeliveryEstimate('2025-11-20T10:00:00Z', '2025-11-24T14:30:00Z')
 * // { status: 'delivered', formattedText: '24 Nov 2025', range: {...} }
 */
export function getDeliveryEstimate(
  shippedAt?: string,
  deliveredAt?: string
): DeliveryEstimate | null {
  // Order already delivered - show actual date
  if (deliveredAt) {
    const deliveryDate = new Date(deliveredAt)
    return {
      range: { minDate: deliveryDate, maxDate: deliveryDate },
      formattedText: formatDeliveredDate(deliveredAt),
      status: 'delivered',
    }
  }
  
  // Order shipped but not delivered - show estimate
  if (shippedAt) {
    const range = calculateDeliveryRange(shippedAt)
    return {
      range,
      formattedText: formatDeliveryRange(range),
      status: 'estimated',
    }
  }
  
  // Order not shipped yet - no estimate available
  return null
}