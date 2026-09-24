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

    let response: Response
    try {
      response = await fetch(
        `/api/orders/by-order-id/${encodeURIComponent(orderId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // A-4: a fresh trace id per attempt, forwarded and echoed by the
            // same-origin proxy (S1.5).
            'X-Trace-Id': newTraceId(),
          },
          credentials: 'same-origin',
          body: JSON.stringify(wireBody),
        }
      )
    } catch {
      // Transport failure (proxy unreachable): same friendly fallback (S3.6).
      setOrderError(
        checkoutOrderErrors(0, null, { paymentIntentId: paymentIntent.id })
      )
      return
    }

    if (!response.ok) {
      // A-3/A-7: single translation point, no client-side retry — a bounded
      // 409 reaching the browser is already post-convergence (obs #1783).
      const body: unknown = await response.json().catch(() => null)
      setOrderError(
        checkoutOrderErrors(response.status, body, {
          paymentIntentId: paymentIntent.id,
        })
      )
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
