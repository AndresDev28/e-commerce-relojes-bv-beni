import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateBackoffDelay,
  sleep,
  retryWithBackoff,
  RETRY_CONFIG,
} from '../retryHandler'

describe('[PAY-08] Retry Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateBackoffDelay(1, 1000)).toBe(1000) // 1s
      expect(calculateBackoffDelay(2, 1000)).toBe(2000) // 2s
      expect(calculateBackoffDelay(3, 1000)).toBe(4000) // 4s
      expect(calculateBackoffDelay(4, 1000)).toBe(8000) // 8s
    })

    it('should cap at MAX_DELAY_MS', () => {
      expect(calculateBackoffDelay(10, 1000)).toBe(RETRY_CONFIG.MAX_DELAY_MS)
    })
  })

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await retryWithBackoff(operation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on recoverable error', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success')

      const result = await retryWithBackoff(operation, { baseDelay: 10 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(2)
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should respect maxAttempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('timeout'))

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelay: 10,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(3)
      expect(operation).toHaveBeenCalledTimes(3)
    })
  })
})
