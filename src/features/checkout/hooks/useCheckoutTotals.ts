'use client'

import { useMemo } from 'react'
import { calculateShipping } from '@/lib/constants/shipping'
import type { CartItem } from '@/types'

interface CheckoutTotals {
  subtotal: number
  shipping: number
  total: number
}

export function useCheckoutTotals(cartItems: CartItem[]): CheckoutTotals {
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  )
  const shipping = useMemo(() => calculateShipping(subtotal), [subtotal])
  const total = subtotal + shipping
  return { subtotal, shipping, total }
}
