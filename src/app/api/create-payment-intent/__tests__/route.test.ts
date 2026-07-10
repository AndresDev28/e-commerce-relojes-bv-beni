import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

const { mockCreate, MockStripeError } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  class MockStripeError extends Error {
    type: string
    constructor(params: { type: string; message: string }) {
      super(params.message)
      this.type = params.type
      this.name = 'StripeError'
    }
  }
  return { mockCreate, MockStripeError }
})

vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mockCreate,
    },
  }))
  Object.assign(StripeMock, {
    errors: {
      StripeError: MockStripeError,
    },
  })
  return {
    default: StripeMock,
    errors: {
      StripeError: MockStripeError,
    },
  }
})

vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: () => ({
    paymentIntents: {
      create: mockCreate,
    },
  }),
}))

vi.mock('@/lib/constants', () => ({
  API_URL: 'http://localhost:1337',
}))

vi.mock('@/lib/constants/shipping', () => ({
  calculateShipping: vi.fn((subtotal: number) => {
    return subtotal >= 100 ? 0 : 5.99
  }),
  SHIPPING_COST: 5.99,
  FREE_SHIPPING_THRESHOLD: 100,
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  function createAuthenticatedRequest(items: typeof validItems) {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ stock: 100, name: 'Product' }] }),
      })
    const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
    request.cookies.set(SESSION_COOKIE, 'valid-session-token')
    return request
  }

  describe('Authentication', () => {
    it('rejects request without session cookie', async () => {
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ items: validItems }),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toContain('Inicia sesión')
    })

    it('rejects request with invalid session cookie', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ items: validItems }),
      })
      request.cookies.set(SESSION_COOKIE, 'invalid-token')
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toContain('Inicia sesión')
    })

    it('accepts request with valid session cookie', async () => {
      const request = createAuthenticatedRequest(validItems)
      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Request Validation', () => {
    it('rejects request without items', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      })
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      request.cookies.set(SESSION_COOKIE, 'valid-session-token')
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('al menos un producto')
    })

    it('rejects request with empty items array', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, email: 'user@example.com' }),
      })
      const request = new NextRequest('http://localhost:3000/api/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({ items: [] }),
      })
      request.cookies.set(SESSION_COOKIE, 'valid-session-token')
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('al menos un producto')
    })
  })

  describe('Amount Calculation', () => {
    it('calculates total correctly with shipping', async () => {
      const items = [
        { id: '1', name: 'Product', price: 50, quantity: 1 },
      ]
      const request = createAuthenticatedRequest(items)
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5599,
          currency: 'eur',
        })
      )
    })

    it('calculates total correctly with free shipping', async () => {
      const items = [
        { id: '1', name: 'Product', price: 100, quantity: 1 },
      ]
      const request = createAuthenticatedRequest(items)
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000,
        })
      )
    })

    it('calculates total for multiple items', async () => {
      const request = createAuthenticatedRequest(validItems)
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 13000,
        })
      )
    })
  })

  describe('Payment Intent Creation', () => {
    it('creates payment intent successfully', async () => {
      const request = createAuthenticatedRequest(validItems)
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.clientSecret).toBe('pi_test_123_secret_abc')
      expect(data.amount).toBe(130)
    })

    it('expands latest_charge for payment details', async () => {
      const request = createAuthenticatedRequest(validItems)
      await POST(request)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          expand: ['latest_charge.payment_method_details'],
        })
      )
    })

    it('includes metadata in payment intent', async () => {
      const request = createAuthenticatedRequest(validItems)
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

    it('includes X-Trace-Id in response headers', async () => {
      const request = createAuthenticatedRequest(validItems)
      const response = await POST(request)
      expect(response.headers.get('X-Trace-Id')).toBeTruthy()
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
      const request = createAuthenticatedRequest(validItems)
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toContain('procesamiento del pago')
    })

    it('handles invalid item data', async () => {
      const invalidItems = [
        { id: '1', name: 'Product', price: -10, quantity: 1 },
      ]
      const request = createAuthenticatedRequest(invalidItems)
      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})
