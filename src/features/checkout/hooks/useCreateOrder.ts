'use client'

import { useState } from 'react'
import { PaymentIntent } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { calculateShipping } from '@/lib/constants/shipping'
import { assembleOrderData } from '@/features/checkout/services/assembleOrderData'
import { checkoutOrderErrors } from '@/features/checkout/utils/checkoutOrderErrors'
import { newTraceId } from '@/lib/trace'
import { useAuth } from '@/context/AuthContext'
import type { CartItem } from '@/types'

// F8 (S-RET.1..S-RET.7): bounded inline retry for transient UPSERT
// failures. File-local constants and helpers — no new module is added
// because the second-consumer case (CheckoutForm payment-intent) has
// its own retry surface and a generic `withRetry` is deferred to a
// follow-up when two concrete consumers exist.
const MAX_ORDER_UPSERT_ATTEMPTS = 3
const ORDER_UPSERT_BACKOFF_BASE_MS = 500

function isRetryableOrderUpsertStatus(status: number): boolean {
  // 500, 502, 503, 504 are transient. 4xx (incl. 409) and 1xx/2xx/3xx
  // are terminal — the mapper handles them.
  return status === 500 || status === 502 || status === 503 || status === 504
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface UseCreateOrderOptions {
  onSuccess?: (orderId: string) => void
  clearCart?: () => void
}

interface UseCreateOrderResult {
  createOrder: (
    paymentIntent: PaymentIntent,
    cartItems: CartItem[],
    orderId: string
  ) => Promise<void>
  isCreatingOrder: boolean
  orderError: string | null
  clearOrderError: () => void
}

export function useCreateOrder(
  options: UseCreateOrderOptions = {}
): UseCreateOrderResult {
  const router = useRouter()
  const { user } = useAuth()
  const { onSuccess, clearCart } = options
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const clearOrderError = () => setOrderError(null)

  const doCreateOrder = async (
    paymentIntent: PaymentIntent,
    cartItems: CartItem[],
    orderId: string
  ) => {
    // A-12 guard: without a session user there is no `userId` to compose.
    // The page already redirects unauthenticated visitors, so this is a
    // defensive edge. No fetch; friendly support fallback via the mapper.
    if (!user) {
      setOrderError(
        checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id })
      )
      return
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const shipping = calculateShipping(subtotal)
    const total = subtotal + shipping

    const orderData = assembleOrderData({
      orderId,
      cartItems,
      subtotal,
      shipping,
      total,
      paymentIntent,
    })

    // D-lock wire subset (obs #1793, A-12): `orderId` travels as the path
    // param, `orderStatus` and `total` are server-derived — none in the body.
    const wireBody = {
      userId: user.id,
      paymentIntentId: orderData.paymentIntentId,
      items: orderData.items,
      subtotal: orderData.subtotal,
      shipping: orderData.shipping,
      paymentInfo: orderData.paymentInfo,
    }

    // F8 (S-RET.1..S-RET.7): bounded inline retry with exponential backoff.
    // The wire body and URL are captured ONCE before the loop (D-lock
    // invariant — every retry re-sends the same bytes; only the
    // `X-Trace-Id` header rotates per attempt so the server can
    // correlate each attempt independently, F4 A-4).
    const upsertUrl = `/api/orders/by-order-id/${encodeURIComponent(orderId)}`
    const wireBodyJson = JSON.stringify(wireBody)

    let attempt = 0
    let response: Response | null = null
    let terminalStatus: number | null = null
    let terminalBody: unknown = null

    while (attempt < MAX_ORDER_UPSERT_ATTEMPTS) {
      attempt += 1
      try {
        response = await fetch(upsertUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': newTraceId(),
          },
          credentials: 'same-origin',
          body: wireBodyJson,
        })
      } catch {
        // Transport failure (proxy unreachable, abort, network).
        // Retry transient if attempts remain; otherwise surface the
        // friendly fallback (same as the no-fetch branch).
        if (attempt < MAX_ORDER_UPSERT_ATTEMPTS) {
          await sleep(ORDER_UPSERT_BACKOFF_BASE_MS * 2 ** (attempt - 1))
          continue
        }
        setOrderError(
          checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id })
        )
        return
      }

      if (response.ok) {
        break
      }

      // Drain body to release the connection before the next attempt.
      const body: unknown = await response.json().catch(() => null)

      if (
        isRetryableOrderUpsertStatus(response.status) &&
        attempt < MAX_ORDER_UPSERT_ATTEMPTS
      ) {
        await sleep(ORDER_UPSERT_BACKOFF_BASE_MS * 2 ** (attempt - 1))
        continue
      }

      // Terminal: 4xx (incl. 409 per F4 invariant), or 5xx after the
      // final attempt. Single translation point — mapper handles it.
      terminalStatus = response.status
      terminalBody = body
      break
    }

    if (!response || !response.ok) {
      if (terminalStatus !== null) {
        setOrderError(
          checkoutOrderErrors(terminalStatus, terminalBody, {
            paymentIntentId: paymentIntent.id,
          })
        )
      }
      // Else: the transport-fail branch above already set orderError.
      return
    }

    if (clearCart) clearCart()

    if (onSuccess) {
      onSuccess(orderId)
    } else {
      router.push(`/order-confirmation?orderId=${orderId}`)
    }
  }

  const createOrder = async (
    paymentIntent: PaymentIntent,
    cartItems: CartItem[],
    orderId: string
  ) => {
    try {
      setIsCreatingOrder(true)
      setOrderError(null)
      await doCreateOrder(paymentIntent, cartItems, orderId)
    } catch (_error) {
      // S-MOD.8: defensive catch MUST NOT leak error.message to the UI.
      // The friendly fallback copy is identical to the transport-fail branch
      // (line ~99) so the catch becomes a true defensive net rather than a
      // divergent copy path.
      setOrderError(
        checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id })
      )
    } finally {
      setIsCreatingOrder(false)
    }
  }

  return {
    createOrder,
    isCreatingOrder,
    orderError,
    clearOrderError,
  }
}
