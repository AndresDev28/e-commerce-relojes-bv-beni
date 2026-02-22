/**
 * Tests for POST /api/refund-order
 * 
 * COVERAGE:
 * - Webhook Secret Validation
 * - Invalid payload handling
 * - Stripe refund execution
 * - Stripe error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock Stripe central initialization
const mockRefundCreate = vi.hoisted(() => vi.fn())
vi.mock('@/lib/stripe/server', () => ({
    getStripeServer: vi.fn().mockReturnValue({
        refunds: {
            create: mockRefundCreate,
        },
    })
}))

// Mock Stripe Errors
vi.mock('stripe', () => {
    return {
        default: {
            errors: {
                StripeError: class StripeError extends Error {
                    statusCode?: number
                    code?: string
                    constructor(raw: any) {
                        super(raw.message)
                        this.statusCode = raw.statusCode || 500
                        this.code = raw.code || 'unknown'
                    }
                },
            }
        }
    }
})

describe('POST /api/refund-order', () => {
    const originalEnv = process.env

    beforeEach(() => {
        vi.clearAllMocks()
        process.env = { ...originalEnv }
        process.env.STRAPI_WEBHOOK_SECRET = 'test_secret_123'

        mockRefundCreate.mockResolvedValue({
            id: 're_test_123',
            status: 'succeeded',
        })
    })

    afterEach(() => {
        process.env = originalEnv
        vi.clearAllMocks()
    })

    const validPayload = {
        paymentIntentId: 'pi_test_123',
        amount: 100,
        orderId: 'ORD-123',
    }

    describe('Webhook Security', () => {
        it('returns 500 if STRAPI_WEBHOOK_SECRET is not configured', async () => {
            delete process.env.STRAPI_WEBHOOK_SECRET
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Server configuration error')
        })

        it('returns 401 if secret header is missing', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Unauthorized')
        })

        it('returns 401 if secret header is invalid', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'invalid_secret' },
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.error).toBe('Unauthorized')
        })
    })

    describe('Request Validation', () => {
        it('returns 400 if missing paymentIntentId', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify({ ...validPayload, paymentIntentId: undefined })
            })

            const response = await POST(request)
            expect(response.status).toBe(400)
        })

        it('returns 400 if missing amount', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify({ ...validPayload, amount: undefined })
            })

            const response = await POST(request)
            expect(response.status).toBe(400)
        })

        it('returns 400 if missing orderId', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify({ ...validPayload, orderId: undefined })
            })

            const response = await POST(request)
            expect(response.status).toBe(400)
        })
    })

    describe('Stripe Refund Execution', () => {
        it('calls Stripe with correct parameters and returns success', async () => {
            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            // Amount should be converted to cents (100 * 100 = 10000)
            expect(mockRefundCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    payment_intent: 'pi_test_123',
                    amount: 10000,
                    reason: 'requested_by_customer',
                    metadata: expect.objectContaining({
                        orderId: 'ORD-123'
                    })
                })
            )

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.refundId).toBe('re_test_123')
            expect(data.status).toBe('succeeded')
        })

        it('handles Stripe errors gracefully', async () => {
            const Stripe = await import('stripe')
            mockRefundCreate.mockRejectedValue(
                new Stripe.default.errors.StripeError({
                    type: 'api_error',
                    message: 'Refund failed',
                    statusCode: 402,
                    code: 'charge_already_refunded'
                })
            )

            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(402)
            expect(data.error).toBe('Stripe API Error')
            expect(data.message).toBe('Refund failed')
            expect(data.code).toBe('charge_already_refunded')
        })

        it('handles unexpected internal errors', async () => {
            mockRefundCreate.mockRejectedValue(new Error('Unexpected system error'))

            const request = new NextRequest('http://localhost:3000/api/refund-order', {
                method: 'POST',
                headers: { 'x-strapi-secret': 'test_secret_123' },
                body: JSON.stringify(validPayload)
            })

            const response = await POST(request)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.error).toBe('Internal server error')
        })
    })
})
