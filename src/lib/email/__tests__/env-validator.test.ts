/**
 * [ORD-20] Tests for Resend Environment Validator
 * 
 * Tests environment variable validation for Resend email service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  validateResendEnvironment,
  isResendConfigured,
  getResendEnvSummary,
} from '../env-validator'

describe('validateResendEnvironment', () => {
  // Store original env
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('RESEND_API_KEY validation', () => {
    it('should return error when API key is missing', () => {
      delete process.env.RESEND_API_KEY

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('RESEND_API_KEY is not set')
      )
    })

    it('should return error when API key is placeholder', () => {
      process.env.RESEND_API_KEY = 're_your_api_key_here'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('placeholder value')
      )
    })

    it('should return error when API key format is invalid', () => {
      process.env.RESEND_API_KEY = 'invalid_key_format'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('Invalid Resend API key format')
      )
    })

    it('should pass when API key is valid', () => {
      process.env.RESEND_API_KEY = 're_abc123xyz'
      process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'
      process.env.RESEND_FROM_EMAIL = 'test@example.com'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('RESEND_FROM_EMAIL validation', () => {
    beforeEach(() => {
      // Set valid API key for these tests
      process.env.RESEND_API_KEY = 're_valid_key'
      process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'
    })

    it('should warn when FROM email is missing', () => {
      delete process.env.RESEND_FROM_EMAIL

      const result = validateResendEnvironment()

      expect(result.warnings).toContain(
        expect.stringContaining('RESEND_FROM_EMAIL is not set')
      )
    })

    it('should return error when FROM email format is invalid', () => {
      process.env.RESEND_FROM_EMAIL = 'invalid-email'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('Invalid email format for RESEND_FROM_EMAIL')
      )
    })

    it('should warn when using test domain in production', () => {
      Object.assign(process.env, { NODE_ENV: 'production' })
      process.env.RESEND_FROM_EMAIL = 'test@resend.dev'

      const result = validateResendEnvironment()

      expect(result.warnings).toContain(
        expect.stringContaining('Using Resend test domain')
      )
    })

    it('should warn when using custom domain in development', () => {
      Object.assign(process.env, { NODE_ENV: 'development' })
      process.env.RESEND_FROM_EMAIL = 'pedidos@relojesbvbeni.com'

      const result = validateResendEnvironment()

      expect(result.warnings).toContain(
        expect.stringContaining('Using custom domain in development')
      )
    })

    it('should pass with valid email', () => {
      process.env.RESEND_FROM_EMAIL = 'test@example.com'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(true)
    })
  })

  describe('WEBHOOK_SECRET validation', () => {
    beforeEach(() => {
      // Set valid API key and email for these tests
      process.env.RESEND_API_KEY = 're_valid_key'
      process.env.RESEND_FROM_EMAIL = 'test@example.com'
    })

    it('should return error when webhook secret is missing', () => {
      delete process.env.WEBHOOK_SECRET

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('WEBHOOK_SECRET is not set')
      )
    })

    it('should return error when webhook secret is placeholder', () => {
      process.env.WEBHOOK_SECRET = 'your_webhook_secret_here_generate_random_string'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('placeholder value')
      )
    })

    it('should warn when webhook secret is too short', () => {
      process.env.WEBHOOK_SECRET = 'short'

      const result = validateResendEnvironment()

      expect(result.warnings).toContain(
        expect.stringContaining('shorter than recommended')
      )
    })

    it('should pass with valid webhook secret', () => {
      process.env.WEBHOOK_SECRET = 'this-is-a-long-enough-secret-key-for-security'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(true)
    })
  })

  describe('DEV_EMAIL validation', () => {
    beforeEach(() => {
      // Set valid required fields
      process.env.RESEND_API_KEY = 're_valid_key'
      process.env.RESEND_FROM_EMAIL = 'test@example.com'
      process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'
    })

    it('should return error when DEV_EMAIL format is invalid', () => {
      process.env.DEV_EMAIL = 'invalid-email'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('Invalid email format for DEV_EMAIL')
      )
    })

    it('should warn when DEV_EMAIL is set in production', () => {
      Object.assign(process.env, { NODE_ENV: 'production' })
      process.env.DEV_EMAIL = 'dev@example.com'

      const result = validateResendEnvironment()

      expect(result.warnings).toContain(
        expect.stringContaining('DEV_EMAIL is set in production')
      )
    })

    it('should allow valid DEV_EMAIL in development', () => {
      Object.assign(process.env, { NODE_ENV: 'development' })
      process.env.DEV_EMAIL = 'dev@example.com'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(true)
    })
  })

  describe('Security: NEXT_PUBLIC_ prefix detection', () => {
    beforeEach(() => {
      // Set valid required fields
      process.env.RESEND_API_KEY = 're_valid_key'
      process.env.RESEND_FROM_EMAIL = 'test@example.com'
      process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'
    })

    it('should error when RESEND_API_KEY has NEXT_PUBLIC_ prefix', () => {
      process.env.NEXT_PUBLIC_RESEND_API_KEY = 're_exposed_key'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('SECURITY BREACH')
      )
      expect(result.errors).toContain(
        expect.stringContaining('RESEND_API_KEY has NEXT_PUBLIC_ prefix')
      )
    })

    it('should error when WEBHOOK_SECRET has NEXT_PUBLIC_ prefix', () => {
      process.env.NEXT_PUBLIC_WEBHOOK_SECRET = 'exposed-secret'

      const result = validateResendEnvironment()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('SECURITY BREACH')
      )
      expect(result.errors).toContain(
        expect.stringContaining('WEBHOOK_SECRET has NEXT_PUBLIC_ prefix')
      )
    })
  })

  describe('Environment detection', () => {
    beforeEach(() => {
      // Set all required fields
      process.env.RESEND_API_KEY = 're_valid_key'
      process.env.RESEND_FROM_EMAIL = 'test@example.com'
      process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'
    })

    it('should detect development environment', () => {
      Object.assign(process.env, { NODE_ENV: 'development' })

      const result = validateResendEnvironment()

      expect(result.environment).toBe('development')
    })

    it('should detect production environment', () => {
      Object.assign(process.env, { NODE_ENV: 'production' })

      const result = validateResendEnvironment()

      expect(result.environment).toBe('production')
    })

    it('should default to development when NODE_ENV is not set', () => {
      const { NODE_ENV, ...envWithoutNodeEnv } = process.env
      process.env = envWithoutNodeEnv as NodeJS.ProcessEnv

      const result = validateResendEnvironment()

      expect(result.environment).toBe('development')
    })
  })
})

describe('isResendConfigured', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return true when configuration is valid', () => {
    process.env.RESEND_API_KEY = 're_valid_key'
    process.env.RESEND_FROM_EMAIL = 'test@example.com'
    process.env.WEBHOOK_SECRET = 'test-secret-at-least-32-chars-long'

    expect(isResendConfigured()).toBe(true)
  })

  it('should return false when configuration is invalid', () => {
    delete process.env.RESEND_API_KEY

    expect(isResendConfigured()).toBe(false)
  })
})

describe('getResendEnvSummary', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return summary with configured values', () => {
    Object.assign(process.env, { NODE_ENV: 'development' })
    process.env.RESEND_API_KEY = 're_test_key_12345'
    process.env.RESEND_FROM_EMAIL = 'test@example.com'
    process.env.WEBHOOK_SECRET = 'secret-key'
    process.env.DEV_EMAIL = 'dev@example.com'

    const summary = getResendEnvSummary()

    expect(summary).toEqual({
      environment: 'development',
      apiKeyConfigured: true,
      apiKeyFormat: 're_te...',
      fromEmail: 'test@example.com',
      webhookSecretConfigured: true,
      devEmailOverride: 'dev@example.com',
      isProduction: false,
      isDevelopment: true,
    })
  })

  it('should return summary with missing values', () => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
    delete process.env.WEBHOOK_SECRET
    delete process.env.DEV_EMAIL

    const summary = getResendEnvSummary()

    expect(summary.apiKeyConfigured).toBe(false)
    expect(summary.apiKeyFormat).toBe('not set')
    expect(summary.fromEmail).toBe('not set')
    expect(summary.webhookSecretConfigured).toBe(false)
    expect(summary.devEmailOverride).toBe('none')
  })

  it('should mask API key in summary', () => {
    process.env.RESEND_API_KEY = 're_very_secret_key_123456789'

    const summary = getResendEnvSummary()

    // Should only show first 5 chars
    expect(summary.apiKeyFormat).toBe('re_ve...')
    expect(summary.apiKeyFormat).not.toContain('secret')
  })
})
