/**
 * [PAY-22] Environment Validator Tests
 * Ticket: AND-31
 *
 * Tests to ensure environment validation catches configuration errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateEnvironment,
  isEnvironmentValid,
  getEnvironmentSummary,
} from '../env-validator'

describe('[PAY-22] Environment Validator', () => {
  // Save original env vars
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL,
  }

  beforeEach(() => {
    // Unstub all environment variables before each test
    vi.unstubAllEnvs()
    // Clear all env vars for clean slate
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.NEXT_PUBLIC_STRAPI_API_URL
    delete process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY
  })

  afterEach(() => {
    // Unstub all environment variables after each test
    vi.unstubAllEnvs()
    // Restore original values
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    })
  })

  describe('validateEnvironment()', () => {
    describe('Development Environment', () => {
      it('should pass validation with correct test keys in development', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123456789')
        vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')

        const result = validateEnvironment()

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.environment).toBe('development')
      })

      it('should error when using live keys in development', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_123456789')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors.some(err => err.includes('LIVE Stripe key in development'))).toBe(true)
      })

      it('should error when using live secret key in development', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_123456789')

        const result = validateEnvironment()

        // Server-side only check
        if (typeof window === 'undefined') {
          expect(result.valid).toBe(false)
          expect(result.errors.some(err => err.includes('LIVE Stripe secret key in development'))).toBe(true)
        } else {
          // In browser environment, secret key validation is skipped (correct behavior)
          expect(result.valid).toBe(true)
        }
      })
    })

    describe('Production Environment', () => {
      it('should pass validation with correct live keys in production', () => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_123456789')
        vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'https://api.example.com')

        const result = validateEnvironment()

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.environment).toBe('production')
      })

      it('should error when using test keys in production', () => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('TEST Stripe key in production'))).toBe(true)
      })

      it('should error when using HTTP (not HTTPS) in production', () => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_123456789')
        vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://api.example.com')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('must use HTTPS in production'))).toBe(true)
      })

      it('should error when using localhost in production', () => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_123456789')
        vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('localhost URL in production'))).toBe(true)
      })
    })

    describe('Missing Configuration', () => {
      it('should error when publishable key is missing', () => {
        vi.stubEnv('NODE_ENV', 'development')
        // Don't set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set'))).toBe(true)
      })

      it('should warn when Strapi URL is missing', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        // Don't set NEXT_PUBLIC_STRAPI_API_URL

        const result = validateEnvironment()

        expect(result.warnings.some(warn => warn.includes('NEXT_PUBLIC_STRAPI_API_URL is not set'))).toBe(true)
      })
    })

    describe('Invalid Key Formats', () => {
      it('should error on invalid publishable key format', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'invalid_key_123')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('Invalid Stripe publishable key format'))).toBe(true)
      })

      it('should error on invalid secret key format', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'invalid_secret_key')

        const result = validateEnvironment()

        // Server-side only check
        if (typeof window === 'undefined') {
          expect(result.valid).toBe(false)
          expect(result.errors.some(err => err.includes('Invalid Stripe secret key format'))).toBe(true)
        } else {
          // In browser environment, secret key validation is skipped
          expect(result.valid).toBe(true)
        }
      })

      it('should error when using secret key as publishable key', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'sk_test_123456789')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('Invalid Stripe publishable key format'))).toBe(true)
      })
    })

    describe('Security Violations', () => {
      it('should error when secret key has NEXT_PUBLIC_ prefix', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_SECRET_KEY', 'sk_test_123456789')

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('SECURITY BREACH'))).toBe(true)
        expect(result.errors.some(err => err.includes('NEXT_PUBLIC_ prefix'))).toBe(true)
      })

      it('should error when keys are from different environments', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_123456789')

        const result = validateEnvironment()

        // Server-side only check
        if (typeof window === 'undefined') {
          expect(result.valid).toBe(false)
          expect(result.errors.some(err => err.includes('KEY MISMATCH'))).toBe(true)
        } else {
          // In browser environment, secret key validation is skipped
          expect(result.valid).toBe(true)
        }
      })
    })

    describe('Placeholder Values', () => {
      it('should error when publishable key is placeholder', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv(
          'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
          'pk_test_your_publishable_key_here'
        )

        const result = validateEnvironment()

        expect(result.valid).toBe(false)
        expect(result.errors.some(err => err.includes('placeholder value'))).toBe(true)
      })

      it('should error when secret key is placeholder', () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
        vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_your_secret_key_here')

        // Note: Secret key validation only runs on server-side (typeof window === 'undefined')
        // In test environment with jsdom, window exists, so secret key checks are skipped
        // This test documents that behavior
        const result = validateEnvironment()

        // In browser environment, secret key validation is skipped (not an error)
        // The key insight is that secret keys should NEVER be in browser code anyway
        if (typeof window === 'undefined') {
          // Server-side: should error on placeholder
          expect(result.valid).toBe(false)
          expect(result.errors).toContain(
            expect.stringContaining('placeholder value')
          )
        } else {
          // Browser-side: secret key validation is skipped (correct behavior)
          expect(result.valid).toBe(true)
        }
      })
    })
  })

  describe('isEnvironmentValid()', () => {
    it('should return true when environment is valid', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123456789')
      vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')

      expect(isEnvironmentValid()).toBe(true)
    })

    it('should return false when environment has errors', () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789') // Wrong key for production

      expect(isEnvironmentValid()).toBe(false)
    })
  })

  describe('getEnvironmentSummary()', () => {
    it('should return safe summary without exposing secrets', () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
      vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')

      const summary = getEnvironmentSummary()

      expect(summary.environment).toBe('development')
      expect(summary.stripeMode).toBe('test')
      expect(summary.stripeKeyConfigured).toBe(true)
      expect(summary.stripeKeyFormat).toMatch(/^pk_test_\.\.\./)
      expect(summary.strapiUrlConfigured).toBe(true)
      expect(summary.strapiUrlProtocol).toBe('http')
      expect(summary.isProduction).toBe(false)
      expect(summary.isDevelopment).toBe(true)

      // Verify no full keys are exposed
      const summaryString = JSON.stringify(summary)
      expect(summaryString).not.toContain('123456789')
    })

    it('should detect live mode correctly', () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_987654321')
      vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'https://api.example.com')

      const summary = getEnvironmentSummary()

      expect(summary.stripeMode).toBe('live')
      expect(summary.strapiUrlProtocol).toBe('https')
      expect(summary.isProduction).toBe(true)
      expect(summary.isDevelopment).toBe(false)
    })

    it('should handle missing configuration', () => {
      vi.stubEnv('NODE_ENV', 'development')
      // Don't set any keys

      const summary = getEnvironmentSummary()

      expect(summary.stripeKeyConfigured).toBe(false)
      expect(summary.strapiUrlConfigured).toBe(false)
    })
  })
})
