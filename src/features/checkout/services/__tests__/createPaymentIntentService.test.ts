import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CartItem } from '@/types'

// Hoisted mocks must be declared before importing the module under test.
const { mockGenerateOrderId, mockCreate } = vi.hoisted(() => ({
  mockGenerateOrderId: vi.fn(),
  mockCreate: vi.fn(),
}))

vi.mock('@/lib/orders/generateOrderId', () => ({
  generateOrderId: mockGenerateOrderId,
}))

vi.mock('@/lib/stripe/server', () => ({
  getStripeServer: () => ({
    paymentIntents: { create: mockCreate },
  }),
}))

vi.mock('@/lib/constants/shipping', () => ({
  calculateShipping: (subtotal: number) => (subtotal >= 50 ? 0 : 5.95),
  SHIPPING_COST: 5.95,
  FREE_SHIPPING_THRESHOLD: 50,
}))

// Import after mocks so the module-under-test picks them up.
import { createPaymentIntentService } from '../createPaymentIntentService'

const validItems: CartItem[] = [
  {
    id: '1',
    name: 'Product 1',
    price: 50,
    quantity: 2,
    images: ['product-1.jpg'],
    href: '/products/1',
    description: 'Test product description',
    stock: 10,
  },
]

// Helper: cast params so the test can pass `userId` BEFORE the production
// signature adds it. The cast disappears once the service accepts userId,
// but the assertions below remain the contract under test.
function buildParams(overrides: Record<string, unknown> = {}) {
  return {
    jwtToken: 'mock-token',
    traceId: 'mock-trace',
    userId: '42',
    input: { items: validItems },
    ...overrides,
  } as unknown as Parameters<typeof createPaymentIntentService>[0]
}

describe('createPaymentIntentService — [Sprint 5 metadata]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateOrderId.mockReturnValue('ORD-1234567890-ABCD')
    mockCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    })
    // Ensure the optional Strapi stock check is skipped.
    delete process.env.NEXT_PUBLIC_STRAPI_API_URL
  })

  it('includes orderId and userId in the Stripe metadata', async () => {
    await createPaymentIntentService(buildParams())

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          orderId: 'ORD-1234567890-ABCD',
          userId: '42',
        }),
      })
    )
  })

  it('preserves legacy metadata fields (itemsCount, subtotal, shipping)', async () => {
    await createPaymentIntentService(buildParams())

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          itemsCount: '1',
          subtotal: '100',
          shipping: '0',
        }),
      })
    )
  })

  it('returns orderId in the success data payload', async () => {
    const result = await createPaymentIntentService(buildParams())

    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.data.orderId).toBe('ORD-1234567890-ABCD')
    // Additive contract: existing fields untouched.
    expect(result.data.clientSecret).toBe('pi_test_123_secret_abc')
    expect(result.data.amount).toBe(100)
  })

  it('fails closed (no Stripe call) when userId is empty', async () => {
    const result = await createPaymentIntentService(buildParams({ userId: '' }))

    expect('error' in result).toBe(true)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockGenerateOrderId).not.toHaveBeenCalled()
  })

  it('fails closed (no Stripe call) when orderId generation throws', async () => {
    mockGenerateOrderId.mockImplementationOnce(() => {
      throw new Error('id-generation-failed')
    })

    const result = await createPaymentIntentService(buildParams())

    expect('error' in result).toBe(true)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('generates orderId BEFORE calling paymentIntents.create', async () => {
    const callOrder: string[] = []
    mockGenerateOrderId.mockImplementation(() => {
      callOrder.push('generateOrderId')
      return 'ORD-INVARIANT'
    })
    mockCreate.mockImplementation(async () => {
      callOrder.push('stripe')
      return { id: 'pi_invariant', client_secret: 'secret_invariant' }
    })

    await createPaymentIntentService(buildParams())

    expect(callOrder).toEqual(['generateOrderId', 'stripe'])
  })

  it('produces different orderIds for sequential calls (no caching)', async () => {
    let counter = 0
    mockGenerateOrderId.mockImplementation(() => `ORD-SEQ-${++counter}`)

    const r1 = await createPaymentIntentService(buildParams())
    const r2 = await createPaymentIntentService(buildParams())

    expect('error' in r1).toBe(false)
    expect('error' in r2).toBe(false)
    if ('error' in r1 || 'error' in r2) return
    expect(r1.data.orderId).toBe('ORD-SEQ-1')
    expect(r2.data.orderId).toBe('ORD-SEQ-2')
    expect(r1.data.orderId).not.toBe(r2.data.orderId)
  })

  it('error responses carry X-Trace-Id for traceability', async () => {
    const result = await createPaymentIntentService(buildParams({ userId: '' }))

    expect('error' in result).toBe(true)
    if (!('error' in result)) return
    const traceId = result.error.headers.get('X-Trace-Id')
    expect(traceId).toBe('mock-trace')
  })
})