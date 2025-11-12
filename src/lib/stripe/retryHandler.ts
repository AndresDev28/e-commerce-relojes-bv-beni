/**
 * Retry handler with exponential backoff for Stripe operations
 * [PAY-08] Implementar retry logic para timeouts
 */

import { isRecoverableError } from './errorHandler'
import { handleStripeError } from './errorHandler'

/**
 * Configuration for retry behavior
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1000, // 1 segundo
  MAX_DELAY_MS: 8000, // 8 segundos máximo
} as const

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalTime: number
}

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Calculate delay for exponential backoff
 * Formula: baseDelay * 2^(attempt - 1)
 * Example: 1s, 2s, 4s, 8s
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = RETRY_CONFIG.BASE_DELAY_MS
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  return Math.min(exponentialDelay, RETRY_CONFIG.MAX_DELAY_MS)
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff
 *
 * @template T - The return type of the operation
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Result object with success status and data/error
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await stripe.confirmPayment(...),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}:`, error.message)
 *     }
 *   }
 * )
 *
 * if (result.success) {
 *   console.log('Payment confirmed:', result.data)
 * } else {
 *   console.error('All retries failed:', result.error)
 * }
 * ```
 */

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelay = RETRY_CONFIG.BASE_DELAY_MS,
    onRetry,
  } = options

  const startTime = Date.now()
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 [Retry] Attempt ${attempt}/${maxAttempts}`)

      // Execute the operation
      const data = await operation()

      const totalTime = Date.now() - startTime
      console.log(`✅ [Retry] Success on attempt ${attempt} (${totalTime}ms)`)

      return {
        success: true,
        data,
        attempts: attempt,
        totalTime,
      }
    } catch (error) {
      const processedError = handleStripeError(error)
      lastError = new Error(processedError.localizedMessage)

      console.log(`❌ [Retry] Attempt ${attempt} failed:`, lastError.message)

      // Check if error is recoverable
      const isRecoverable = isRecoverableError(processedError)

      // If not recoverable or last attempt, don't retry
      if (!isRecoverable) {
        console.log(`🚫 [Retry] Error not recoverable, stopping retries`)
        break
      }

      if (attempt === maxAttempts) {
        console.log(`🚫 [Retry] Max attempts reached`)
        break
      }

      // Calculate delay and notify
      const delay = calculateBackoffDelay(attempt, baseDelay)
      console.log(`⏳ [Retry] Waiting ${delay}ms before next attempt...`)

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError)
      }

      // Wait before next attempt
      await sleep(delay)
    }
  }

  // All attempts failed
  const totalTime = Date.now() - startTime

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalTime,
  }
}

/**
 * Create a retry-enabled version of an async function
 * Useful for wrapping Stripe API calls
 *
 * @example
 * ```typescript
 * const confirmPaymentWithRetry = withRetry(
 *   async (paymentData) => await stripe.confirmPayment(paymentData),
 *   { maxAttempts: 3 }
 * )
 *
 * const result = await confirmPaymentWithRetry(paymentData)
 * ```
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return retryWithBackoff(() => fn(...args), options)
  }
}
