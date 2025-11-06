/**
 * Shipping configuration and calculation utilities
 * Used across checkout and order summary components
 */

/**
 * Standard shipping cost in EUR
 */
export const SHIPPING_COST = 5.95

/**
 * Minimum order amount for free shipping in EUR
 */
export const FREE_SHIPPING_THRESHOLD = 50

/**
 * Calculate shipping cost based on subtotal
 * @param subtotal - Order subtotal amount
 * @returns Shipping cost (0 if free shipping applies)
 */
export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
}

/**
 * Check if order qualifies for free shipping
 * @param subtotal - Order subtotal amount
 * @returns true if order qualifies for free shipping
 */
export function hasFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD
}
