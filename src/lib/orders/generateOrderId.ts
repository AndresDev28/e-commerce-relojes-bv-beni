/**
 * Generates a unique order ID with the format: ORD-TIMESTAMP-RANDOM
 *
 * @example
 * generateOrderId() // "ORD-1730476800-A5F3"
 *
 * @returns {string} A unique order ID
 */
export function generateOrderId(): string {
  // Get current timestamp in seconds (10 digits)
  const timestamp = Math.floor(Date.now() / 1000)

  // Generate 4-character random alphanumeric string (uppercase)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomPart = ''

  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    randomPart += chars[randomIndex]
  }

  // Combine parts: ORD-TIMESTAMP-RANDOM
  return `ORD-${timestamp}-${randomPart}`
}
