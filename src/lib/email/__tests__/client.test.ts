/**
 * [ORD-20] Tests for Resend Email Client
 * 
 * Tests email sending functionality with mocked Resend client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'

// Mock Resend before importing client
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn(),
      },
    })),
  }
})

// Mock env-validator to prevent validation errors in tests
vi.mock('../env-validator', () => ({
  validateAndLogResendEnv: vi.fn(),
}))

// Import after mocking
import { sendEmail, isValidEmail } from '../client'
import { Resend } from 'resend'

describe('sendEmail', () => {
  let mockSend: Mock
  const originalEnv = process.env

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Set up environment
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_test_key',
      RESEND_FROM_EMAIL: 'test@resend.dev',
      WEBHOOK_SECRET: 'test-secret-at-least-32-chars-long',
      NODE_ENV: 'test',
    }

    // Get mock send function
    const resendInstance = new Resend('test')
    mockSend = resendInstance.emails.send as Mock
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should send email successfully on first attempt', async () => {
    // Mock successful response
    mockSend.mockResolvedValueOnce({
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
    expect(result.attempt).toBe(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and succeed on second attempt', async () => {
    // First attempt fails, second succeeds
    mockSend
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Temporary error' },
      })
      .mockResolvedValueOnce({
        data: { id: 'email_456' },
        error: null,
      })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(result.success).toBe(true)
    expect(result.emailId).toBe('email_456')
    expect(result.attempt).toBe(2)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('should fail after max retries', async () => {
    // All attempts fail
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Persistent error' },
    })

    const result = await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Persistent error')
    expect(result.attempt).toBe(3) // Max attempts
    expect(mockSend).toHaveBeenCalledTimes(3)
  })

  it('should include optional fields in email', async () => {
    mockSend.mockResolvedValueOnce({
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

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Plain text version',
        reply_to: 'support@example.com',
        tags: [{ name: 'category', value: 'test' }],
      })
    )
  })

  it('should send to array of recipients', async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: 'email_multi' },
      error: null,
    })

    const recipients = ['customer1@example.com', 'customer2@example.com']
    
    await sendEmail({
      to: recipients,
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipients,
      })
    )
  })

  it('should use correct from address and name', async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: 'email_from' },
      error: null,
    })

    await sendEmail({
      to: 'customer@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Relojes BV Beni <test@resend.dev>',
      })
    )
  })

  describe('DEV_EMAIL override', () => {
    it('should override recipient in development mode', async () => {
      Object.assign(process.env, { NODE_ENV: 'development' })
      process.env.DEV_EMAIL = 'dev@example.com'

      mockSend.mockResolvedValueOnce({
        data: { id: 'email_dev' },
        error: null,
      })

      // Need to re-import to pick up new env vars
      vi.resetModules()
      const { sendEmail: sendEmailWithNewEnv } = await import('../client')

      await sendEmailWithNewEnv({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      // Email should be sent to DEV_EMAIL, not original recipient
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@example.com',
        })
      )
    })

    it('should NOT override recipient in production mode', async () => {
      Object.assign(process.env, { NODE_ENV: 'production' })
      process.env.DEV_EMAIL = 'dev@example.com'

      mockSend.mockResolvedValueOnce({
        data: { id: 'email_prod' },
        error: null,
      })

      await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      // Email should be sent to original recipient
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should handle thrown exceptions', async () => {
      mockSend.mockRejectedValue(new Error('Network error'))

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('String error')

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })
})

describe('isValidEmail', () => {
  it('should validate correct email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('test.user@example.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.com')).toBe(true)
  })

  it('should reject invalid email formats', () => {
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('invalid@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user @example.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})
