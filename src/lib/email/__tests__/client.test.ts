/**
 * [ORD-20] Tests for Resend Email Client
 * 
 * Tests email sending functionality with mocked Resend client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// HOISTED: All module-level mock state must be defined with vi.hoisted()
// This runs BEFORE imports are resolved, enabling live binding simulation
// ============================================================================
const { mockSendFn, configState } = vi.hoisted(() => {
  const mockSendFn = vi.fn()
  const configState = {
    isDevelopment: false,
    isDevEmailActive: false,
    devEmail: undefined as string | undefined,
  }
  return { mockSendFn, configState }
})

// Mock Resend SDK - uses the hoisted mockSendFn
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSendFn,
    },
  })),
}))

// Mock env-validator
vi.mock('../env-validator', () => ({
  validateAndLogResendEnv: vi.fn(),
}))

// Mock config module - uses hoisted configState for live binding behavior
vi.mock('../config', () => ({
  get isDevelopment() {
    return configState.isDevelopment
  },
  get isDevEmailActive() {
    return configState.isDevEmailActive
  },
  RESEND_CONFIG: {
    apiKey: 're_test_key',
    fromName: 'Relojes BV Beni',
    fromEmail: 'test@resend.dev',
    webhookSecret: 'test-secret',
    get devEmail() {
      return configState.devEmail
    },
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    },
  },
}))

// Import module under test AFTER all mocks are set up
import { sendEmail, isValidEmail, resend } from '../client'

describe('sendEmail', () => {
  beforeEach(() => {
    // Reset mock state to defaults
    vi.clearAllMocks()
    configState.isDevelopment = false
    configState.isDevEmailActive = false
    configState.devEmail = undefined

      // Set up the mock send function on the resend singleton
      ; (resend.emails.send as ReturnType<typeof vi.fn>) = mockSendFn
  })

  it('should send a basic email successfully', async () => {
    mockSendFn.mockResolvedValueOnce({
      data: { id: 'email_123' },
      error: null,
    })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(result.success).toBe(true)
    expect(result.emailId).toBe('email_123')
    expect(mockSendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })
    )
  })

  it('should fail after max retries', async () => {
    // All attempts fail
    mockSendFn.mockResolvedValue({
      data: null,
      error: { message: 'API Error', name: 'ResendError' },
    })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  }, 15000)

  it('should include optional fields in email', async () => {
    mockSendFn.mockResolvedValueOnce({
      data: { id: 'email_789' },
      error: null,
    })

    await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
      text: 'Plain text version',
      replyTo: 'support@example.com',
      tags: [{ name: 'category', value: 'test' }],
    })

    expect(mockSendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Plain text version',
        // client.ts uses 'replyTo' (Resend SDK field name)
        replyTo: 'support@example.com',
        tags: [{ name: 'category', value: 'test' }],
      })
    )
  })

  it('should send to array of recipients', async () => {
    mockSendFn.mockResolvedValueOnce({
      data: { id: 'email_multi' },
      error: null,
    })

    const recipients = ['customer1@example.com', 'customer2@example.com']

    await sendEmail({
      to: recipients,
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(mockSendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipients,
      })
    )
  })

  it('should use correct from address and name', async () => {
    mockSendFn.mockResolvedValueOnce({
      data: { id: 'email_from' },
      error: null,
    })

    await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(mockSendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Relojes BV Beni <test@resend.dev>',
      })
    )
  })

  describe('DEV_EMAIL override', () => {
    it('should override recipient in development mode', async () => {
      // Set development mode dynamically via hoisted configState
      configState.isDevelopment = true
      configState.isDevEmailActive = true
      configState.devEmail = 'dev@example.com'

      mockSendFn.mockResolvedValueOnce({
        data: { id: 'email_dev' },
        error: null,
      })

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      // Email should be sent to DEV_EMAIL, not original recipient
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@example.com',
        })
      )
    })

    it('should NOT override recipient in production mode', async () => {
      // Ensure production mode (isDevelopment = false)
      configState.isDevelopment = false
      configState.isDevEmailActive = false

      mockSendFn.mockResolvedValueOnce({
        data: { id: 'email_prod' },
        error: null,
      })

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      // Email should be sent to original recipient
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should handle thrown exceptions', async () => {
      mockSendFn.mockRejectedValue(new Error('Network error'))

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    }, 15000)

    it('should handle non-Error exceptions', async () => {
      mockSendFn.mockRejectedValue('String error')

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    }, 15000)
  })
})

describe('isValidEmail', () => {
  it('should validate correct email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true)
    expect(isValidEmail('user@subdomain.example.com')).toBe(true)
  })

  it('should reject invalid email formats', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })
})
