/**
 * [ORD-20] Tests for Send Order Email API Route
 * 
 * Tests the /api/send-order-email endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'
import { OrderStatus } from '@/types'
import type { CartItem } from '@/types'

// Mock email client
vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn(),
}))

// Mock env-validator
vi.mock('@/lib/email/env-validator', () => ({
  validateAndLogResendEnv: vi.fn(),
}))

import { sendEmail } from '@/lib/email/client'

describe('POST /api/send-order-email', () => {
  const validWebhookSecret = 'test-secret'
  const mockCartItems: CartItem[] = [
    {
      id: '1',
      name: 'Casio G-SHOCK',
      price: 150.00,
      quantity: 1,
      images: ['test.jpg'],
      href: '/producto/casio-gshock',
      description: 'Test watch',
      stock: 10,
    },
  ]

  const validRequestBody = {
    orderId: 'ORD-123456',
    customerEmail: 'customer@example.com',
    customerName: 'John Doe',
    orderStatus: OrderStatus.PAID,
    orderData: {
      items: mockCartItems,
      subtotal: 150.00,
      shipping: 5.95,
      total: 155.95,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup environment
    process.env.WEBHOOK_SECRET = validWebhookSecret
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.RESEND_FROM_EMAIL = 'test@resend.dev'
  })

  describe('Authentication', () => {
    it('should reject request without webhook secret header', async () => {
      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should reject request with invalid webhook secret', async () => {
      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'wrong-secret',
        },
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should accept request with valid webhook secret', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_123',
        attempt: 1,
      })

      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(validRequestBody),
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })
  })

  describe('Request validation', () => {
    const createRequest = (body: any) => {
      return new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(body),
      })
    }

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: 'invalid json',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should reject missing orderId', async () => {
      const body = { ...validRequestBody }
      delete (body as any).orderId

      const request = createRequest(body)
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should reject missing customerEmail', async () => {
      const body = { ...validRequestBody }
      delete (body as any).customerEmail

      const request = createRequest(body)
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should reject invalid email format', async () => {
      const body = {
        ...validRequestBody,
        customerEmail: 'invalid-email',
      }

      const request = createRequest(body)
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid email format')
    })

    it('should reject invalid order status', async () => {
      const body = {
        ...validRequestBody,
        orderStatus: 'invalid_status',
      }

      const request = createRequest(body)
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid order status')
    })
  })

  describe('Email sending', () => {
    const createValidRequest = () => {
      return new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(validRequestBody),
      })
    }

    it('should send email successfully', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_123',
        attempt: 1,
      })

      const request = createValidRequest()
      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.emailId).toBe('email_123')
      expect(sendEmail).toHaveBeenCalledTimes(1)
    })

    it('should call sendEmail with correct parameters', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_456',
        attempt: 1,
      })

      const request = createValidRequest()
      await POST(request as any)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: expect.stringContaining('ORD-123456'),
          html: expect.stringContaining('Casio G-SHOCK'),
          tags: expect.arrayContaining([
            { name: 'category', value: 'order-status' },
            { name: 'orderId', value: 'ORD-123456' },
            { name: 'status', value: OrderStatus.PAID },
          ]),
        })
      )
    })

    it('should return 200 even when email sending fails (ORD-20 decision)', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: false,
        error: 'Email service temporarily unavailable',
        attempt: 3,
      })

      const request = createValidRequest()
      const response = await POST(request as any)
      const data = await response.json()

      // IMPORTANT: Should return 200, not 500
      // This prevents Strapi lifecycle hook from failing
      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Email service temporarily unavailable')
    })

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Unexpected error'))

      const request = createValidRequest()
      const response = await POST(request as any)
      const data = await response.json()

      // Should still return 200
      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unexpected error')
    })
  })

  describe('Email content generation', () => {
    it('should include order status in subject', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_789',
        attempt: 1,
      })

      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(validRequestBody),
      })

      await POST(request as any)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Pago Confirmado'),
        })
      )
    })

    it('should include customer name in email when provided', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_name',
        attempt: 1,
      })

      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(validRequestBody),
      })

      await POST(request as any)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('John Doe'),
        })
      )
    })

    it('should work without customer name', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_no_name',
        attempt: 1,
      })

      const bodyWithoutName = { ...validRequestBody }
      delete (bodyWithoutName as any).customerName

      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(bodyWithoutName),
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })

    it('should include all order items in email', async () => {
      vi.mocked(sendEmail).mockResolvedValueOnce({
        success: true,
        emailId: 'email_items',
        attempt: 1,
      })

      const multiItemBody = {
        ...validRequestBody,
        orderData: {
          ...validRequestBody.orderData,
          items: [
            mockCartItems[0],
            {
              ...mockCartItems[0],
              id: '2',
              name: 'Casio Edifice',
              price: 200.00,
            },
          ],
        },
      }

      const request = new Request('http://localhost:3000/api/send-order-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': validWebhookSecret,
        },
        body: JSON.stringify(multiItemBody),
      })

      await POST(request as any)

      const callArgs = vi.mocked(sendEmail).mock.calls[0][0]
      expect(callArgs.html).toContain('Casio G-SHOCK')
      expect(callArgs.html).toContain('Casio Edifice')
    })
  })
})
