import { makeCartItem } from './cartItem'

/**
 * Shared UPSERT payload + envelope fixtures (design A-5/A-8, proposal F4=A).
 *
 * Mirrors the backend D-lock VERBATIM (obs #1783/#1793 — controller
 * `upsertByOrderId`, `services/upsert.ts`, paid-shell test). The request body
 * is FLAT and REQUIRES `userId`; it is NOT `{ data: ... }`-wrapped.
 * Single source for service unit, proxy integration and E2E mocks.
 */

export const MOCK_TRACE_ID = '3f2a9c1e-7b44-4d2a-9e51-0c6f8a2b1d43'
export const MOCK_ORDER_ID = 'ORD-1757318400000-A'
export const MOCK_PAYMENT_INTENT_ID = 'pi_mock_3Kx9QeJgTb'
export const MOCK_USER_ID = 42

/** D-lock flat wire body: userId + paymentIntentId + items + totals + paymentInfo. */
export interface UpsertWirePayload {
  userId: number
  paymentIntentId: string
  items: ReturnType<typeof makeCartItem>[]
  subtotal: number
  shipping: number
  paymentInfo: { method: 'card'; brand: string; last4: string }
}

export function makeUpsertWirePayload(
  overrides: Partial<UpsertWirePayload> = {}
): UpsertWirePayload {
  return {
    userId: MOCK_USER_ID,
    paymentIntentId: MOCK_PAYMENT_INTENT_ID,
    items: [makeCartItem({ quantity: 2 })],
    subtotal: 199.98,
    shipping: 10,
    paymentInfo: { method: 'card', brand: 'visa', last4: '4242' },
    ...overrides,
  }
}

/** Real success envelope: `{ data: { id: documentId, attributes }, meta: {} }`. */
export function makeUpsertSuccessEnvelope(orderStatus = 'paid'): {
  data: { id: string; attributes: Record<string, unknown> }
  meta: Record<string, never>
} {
  return {
    data: {
      id: 'doc-mock-1',
      attributes: {
        orderId: MOCK_ORDER_ID,
        orderStatus,
        subtotal: 199.98,
        shipping: 10,
        total: 209.98,
        paymentIntentId: MOCK_PAYMENT_INTENT_ID,
        user: { id: MOCK_USER_ID },
      },
    },
    meta: {},
  }
}

/** Real error envelope: `{ data: null, error: { status, name, message, details: { traceId } } }`. */
export function makeUpsertErrorEnvelope(
  status: 400 | 403 | 409 | 500,
  name: 'BadRequestError' | 'ForbiddenError' | 'ConflictError' | 'InternalServerError',
  message: string,
  traceId: string = MOCK_TRACE_ID
): {
  data: null
  error: { status: number; name: string; message: string; details: { traceId: string } }
} {
  return { data: null, error: { status, name, message, details: { traceId } } }
}

/**
 * Minimal fetch Response stub for a UPSERT status + body pair.
 * Shared by the service unit suite and the proxy integration suite (2.7).
 */
export function mockUpsertResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

// D-locked message variants (obs #1793 — exact backend strings).
export const UPSERT_ERROR_400_USERID = makeUpsertErrorEnvelope(
  400,
  'BadRequestError',
  'userId is required'
)
export const UPSERT_ERROR_400_ITEMS = makeUpsertErrorEnvelope(
  400,
  'BadRequestError',
  'items must be an array'
)
export const UPSERT_ERROR_403_OWNERSHIP = makeUpsertErrorEnvelope(
  403,
  'ForbiddenError',
  'You can only modify your own orders'
)
export const UPSERT_ERROR_409_PI_MISMATCH = makeUpsertErrorEnvelope(
  409,
  'ConflictError',
  'paymentIntentId does not match existing order'
)
export const UPSERT_ERROR_409_TERMINAL = makeUpsertErrorEnvelope(
  409,
  'ConflictError',
  'Order is in terminal status: cancelled'
)
export const UPSERT_ERROR_409_GENERIC = makeUpsertErrorEnvelope(
  409,
  'ConflictError',
  'Order upsert conflict'
)
