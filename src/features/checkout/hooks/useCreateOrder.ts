'use client'

import { useState } from 'react'
import { PaymentIntent } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import { generateOrderId } from '@/lib/orders/generateOrderId'
import { calculateShipping } from '@/lib/constants/shipping'
import { assembleOrderData } from '@/features/checkout/services/assembleOrderData'
import { newTraceId } from '@/lib/trace'
import type { CartItem } from '@/types'

interface UseCreateOrderOptions {
  onSuccess?: (orderId: string) => void
  clearCart?: () => void
}

interface UseCreateOrderResult {
  createOrder: (paymentIntent: PaymentIntent, cartItems: CartItem[]) => Promise<void>
  isCreatingOrder: boolean
  orderError: string | null
  clearOrderError: () => void
}

export function useCreateOrder(
  options: UseCreateOrderOptions = {}
): UseCreateOrderResult {
  const router = useRouter()
  const { onSuccess, clearCart } = options
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const clearOrderError = () => setOrderError(null)

  const doCreateOrder = async (
    paymentIntent: PaymentIntent,
    cartItems: CartItem[]
  ) => {
    const orderId = generateOrderId()
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

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': newTraceId(),
      },
      credentials: 'same-origin',
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      throw new Error('No se pudo crear el pedido.')
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
    cartItems: CartItem[]
  ) => {
    try {
      setIsCreatingOrder(true)
      setOrderError(null)
      await doCreateOrder(paymentIntent, cartItems)
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Error al crear la orden'
      setOrderError(
        `Tu pago fue procesado, pero hubo un problema al registrar tu pedido: ${errorMsg}. ` +
          `Por favor, contacta con soporte indicando tu ID de pago: ${paymentIntent.id}`
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
