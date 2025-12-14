/**
 * Tests for POST /api/create-payment-intent
 * 
 * COVERAGE:
 * - Successful payment intent creation
 * - Authentication validation
 * - Invalid request body handling
 * - Amount calculation
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
// Mock Stripe
const mockCreate = vi.fn()
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: {
        create: mockCreate,
      },
    })),
    errors: {
      StripeError: class StripeError extends Error { },
    },
  }
})
// Mock shipping calculation
vi.mock('@/lib/constants/shipping', () => ({
  calculateShipping: vi.fn((subtotal: number) => {
    return subtotal >= 100 ? 0 : 5.99
  }),
}))
describe('POST /api/create-payment-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
  })
  const validItems = [
    { id: '1', name: 'Product 1', price: 50, quantity: 2 },
    { id: '2', name: 'Product 2', price: 30, quantity: 1 },
  ]
  describe('Authentication', () => {
    it('rejects request without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })
    it('rejects request with invalid token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'InvalidFormat',
        },
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })
    it('accepts request with valid Bearer token', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token_123',
        },
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
  describe('Request Validation', () => {
    it('rejects request without items', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('items array is required')
    })
    it('rejects request with empty items array', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: [] }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('items array is required')
    })
  })
  describe('Amount Calculation', () => {
    it('calculates total correctly with shipping', async () => {
      const items = [
        { id: '1', name: 'Product', price: 50, quantity: 1 },
      ]
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items }),
      })
      await POST(request)
      // subtotal: 50, shipping: 5.99 (< 100), total: 55.99
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5599, // 55.99 * 100
          currency: 'eur',
        })
      )
    })
    it('calculates total correctly with free shipping', async () => {
      const items = [
        { id: '1', name: 'Product', price: 100, quantity: 1 },
      ]
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items }),
      })
      await POST(request)
      // subtotal: 100, shipping: 0 (>= 100), total: 100
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 100 * 100
        })
      )
    })
    it('calculates total for multiple items', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: validItems }),
      })
      await POST(request)
      // subtotal: (50*2) + (30*1) = 130, shipping: 0, total: 130
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 13000,
        })
      )
    })
  })
  describe('Payment Intent Creation', () => {
    it('creates payment intent successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.clientSecret).toBe('pi_test_123_secret_abc')
      expect(data.amount).toBe(130) // Calculated total
    })
    it('expands latest_charge for payment details', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: validItems }),
      })
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          expand: ['latest_charge.payment_method_details'],
        })
      )
    })
    it('includes metadata in payment intent', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: validItems }),
      })
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            itemsCount: '2',
            subtotal: '130',
            shipping: '0',
          }),
        })
      )
    })
  })
  describe('Error Handling', () => {
    it('handles Stripe errors gracefully', async () => {
      const Stripe = await import('stripe')
      mockCreate.mockRejectedValue(
        new Stripe.default.errors.StripeError({
          type: 'api_error',
          message: 'Test error',
        })
      )
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Payment processing error')
    })
    it('handles invalid item data', async () => {
      const invalidItems = [
        { id: '1', name: 'Product', price: -10, quantity: 1 },
      ]
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({ items: invalidItems }),
      })
      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
})