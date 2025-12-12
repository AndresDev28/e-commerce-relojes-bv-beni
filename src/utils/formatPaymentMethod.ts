/**
 * [ORD-14] Format Payment Method - EPIC-15
 *
 * Utility function to format payment method information securely.
 * Shows card brand and last 4 digits without exposing sensitive data.
 *
 * SECURITY:
 * - Never exposes full card number
 * - Only accepts last 4 digits (validates format)
 * - Sanitizes input to prevent injection
 *
 * USAGE:
 * formatPaymentMethod({ brand: 'visa', last4: '4242' }) → "Visa ****4242"
 * formatPaymentMethod({ brand: 'mastercard', last4: '1234' }) → "Mastercard ****1234"
 * formatPaymentMethod({}) → "Tarjeta de crédito"
 */

/**
 * Input interface for payment method formatting
 * Matches PaymentInfo from @/lib/api/orders
 */
export interface PaymentMethodInput {
  brand?: string
  last4?: string
  method?: string
}

/**
 * Mapping of Stripe brand codes to display names
 * Stripe returns lowercase brand identifiers
 */
const BRAND_DISPLAY_NAMES: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

/**
 * Default fallback when no payment info is available
 */
const DEFAULT_PAYMENT_METHOD = 'Tarjeta de crédito'

/**
 * Capitalizes the first letter of a string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 *
 * @example capitalizeFirst('visa') → 'Visa'
 * @example capitalizeFirst('MASTERCARD') → 'Mastercard'
 */
function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Validates that a string contains exactly 4 digits
 * Security measure to ensure we only accept last4 format
 *
 * @param value - String to validate
 * @returns true if exactly 4 digits, false otherwise
 */
function isValidLast4(value: string | undefined): value is string {
  if (!value) return false
  return /^\d{4}$/.test(value)
}

/**
 * Gets the display name for a card brand
 *
 * @param brand - Brand identifier from Stripe (e.g., 'visa', 'mastercard')
 * @returns Formatted brand name (e.g., 'Visa', 'Mastercard')
 */
function getBrandDisplayName(brand: string | undefined): string | null {
  if (!brand) return null

  const normalizedBrand = brand.toLowerCase().trim()

  // Check if we have a known brand mapping
  if (normalizedBrand in BRAND_DISPLAY_NAMES) {
    return BRAND_DISPLAY_NAMES[normalizedBrand]
  }

  // For unknown brands, capitalize first letter
  return capitalizeFirst(brand)
}

/**
 * Formats payment method information securely
 *
 * SECURITY NOTES:
 * - Only accepts last4 (exactly 4 digits)
 * - Never accepts or returns full card numbers
 * - Sanitizes brand input
 *
 * @param info - Payment method information (optional)
 * @returns Formatted string like "Visa ****4242" or "Tarjeta de crédito"
 *
 * @example
 * // With brand and last4
 * formatPaymentMethod({ brand: 'visa', last4: '4242' })
 * // Returns: "Visa ****4242"
 *
 * @example
 * // With only brand
 * formatPaymentMethod({ brand: 'mastercard' })
 * // Returns: "Mastercard"
 *
 * @example
 * // With only last4
 * formatPaymentMethod({ last4: '1234' })
 * // Returns: "Tarjeta ****1234"
 *
 * @example
 * // With no info
 * formatPaymentMethod()
 * // Returns: "Tarjeta de crédito"
 *
 * @example
 * // With invalid last4 (more than 4 digits - security)
 * formatPaymentMethod({ brand: 'visa', last4: '4242424242424242' })
 * // Returns: "Visa" (last4 ignored for security)
 */
export function formatPaymentMethod(info?: PaymentMethodInput): string {
  // No info provided - return default
  if (!info) {
    return DEFAULT_PAYMENT_METHOD
  }

  // Get formatted brand name
  const brandName = getBrandDisplayName(info.brand)

  // Validate and format last4 (security: only exactly 4 digits)
  const formattedLast4 = isValidLast4(info.last4) ? `****${info.last4}` : null

  // Build the formatted string based on available data
  if (brandName && formattedLast4) {
    return `${brandName} ${formattedLast4}`
  }

  if (brandName) {
    return brandName
  }

  if (formattedLast4) {
    return `Tarjeta ${formattedLast4}`
  }

  // Fallback to default
  return DEFAULT_PAYMENT_METHOD
}
