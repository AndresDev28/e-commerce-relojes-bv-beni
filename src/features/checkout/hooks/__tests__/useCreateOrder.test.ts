import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PaymentIntent } from '@stripe/stripe-js'

// Hoisted: mock `generateOrderId` BEFORE the module-under-test is imported.
// If the hook still calls it locally, `mockGenerateOrderId` will record calls.
const { mockGenerateOrderId, mockAssembleOrderData } = vi.hoisted(() => ({
  mockGenerateOrderId: vi.fn(),
  mockAssembleOrderData: vi.fn(),
}))

vi.mock('@/lib/orders/generateOrderId', () => ({
  generateOrderId: mockGenerateOrderId,
}))

vi.mock('@/features/checkout/services/assembleOrderData', () => ({
  assembleOrderData: mockAssembleOrderData,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// import after mocks
import { useCreateOrder } from '../useCreateOrder'

const mockCartItems = [
  {
    id: '1',
    name: 'Watch A',
    price: 100,
    quantity: 1,
    images: ['a.jpg'],
    href: '/a',
    description: 'desc',
    stock: 10,
  },
]

const mockPaymentIntent = {
  id: 'pi_test_123',
  status: 'succeeded',
} as unknown as PaymentIntent

describe('useCreateOrder — [Sprint 5 server orderId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: capture the supplied orderId so the payload uses it verbatim.
    mockAssembleOrderData.mockImplementation(
      (input: {
        orderId: string
        cartItems: typeof mockCartItems
        subtotal: number
        shipping: number
        total: number
      }) => ({
        orderId: input.orderId,
        items: input.cartItems,
        subtotal: input.subtotal,
        shipping: input.shipping,
        total: input.total,
        orderStatus: 'PAID',
        paymentIntentId: 'pi_test_123',
        paymentInfo: { method: 'card', brand: 'unknown', last4: '0000' },
      })
    )
    // Default fetch returns OK
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  it('passes the supplied orderId verbatim to assembleOrderData', async () => {
    const { result } = renderHook(() => useCreateOrder())

    await act(async () => {
      await result.current.createOrder(
        mockPaymentIntent,
        mockCartItems,
        'ORD-SERVER-123'
      )
    })

    expect(mockAssembleOrderData).toHaveBeenCalledTimes(1)
    const call = mockAssembleOrderData.mock.calls[0][0]
    expect(call.orderId).toBe('ORD-SERVER-123')
  })

  it('sends the supplied orderId in the POST /api/orders body', async () => {
    const { result } = renderHook(() => useCreateOrder())

    await act(async () => {
      await result.current.createOrder(
        mockPaymentIntent,
        mockCartItems,
        'ORD-SERVER-456'
      )
    })

    const fetchMock = global.fetch as unknown as {
      mock: { calls: unknown[][] }
    }
    const fetchCall = fetchMock.mock.calls[0]
    expect(fetchCall).toBeDefined()
    const init = fetchCall[1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.orderId).toBe('ORD-SERVER-456')
  })

  it('never calls generateOrderId — server is source of truth', async () => {
    const { result } = renderHook(() => useCreateOrder())

    await act(async () => {
      await result.current.createOrder(
        mockPaymentIntent,
        mockCartItems,
        'ORD-SERVER-789'
      )
    })

    expect(mockGenerateOrderId).not.toHaveBeenCalled()
  })

  it('invokes onSuccess callback with the supplied orderId', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useCreateOrder({ onSuccess })
    )

    await act(async () => {
      await result.current.createOrder(
        mockPaymentIntent,
        mockCartItems,
        'ORD-SERVER-CALLBACK'
      )
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('ORD-SERVER-CALLBACK')
  })
})