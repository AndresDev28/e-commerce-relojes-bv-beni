import { PaymentIntent } from '@stripe/stripe-js'
import { type CartItem, OrderStatus } from '@/types'

interface AssembleOrderDataInput {
  orderId: string
  cartItems: CartItem[]
  subtotal: number
  shipping: number
  total: number
  paymentIntent: PaymentIntent
}

interface PaymentInfo {
  method: 'card'
  brand: string
  last4: string
}

export interface AssembledOrderData {
  orderId: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  orderStatus: OrderStatus
  paymentIntentId: string
  paymentInfo: PaymentInfo
}

interface ExpandedPaymentIntent extends PaymentIntent {
  latest_charge?: {
    payment_method_details?: {
      card?: {
        brand: string
        last4: string
      }
    }
  }
}

export function assembleOrderData(input: AssembleOrderDataInput): AssembledOrderData {
  const { orderId, cartItems, subtotal, shipping, total, paymentIntent } = input

  const expanded = paymentIntent as ExpandedPaymentIntent
  const paymentMethodDetails = expanded.latest_charge?.payment_method_details?.card

  return {
    orderId,
    items: cartItems,
    subtotal,
    shipping,
    total,
    orderStatus: OrderStatus.PAID,
    paymentIntentId: paymentIntent.id,
    paymentInfo: {
      method: 'card',
      brand: paymentMethodDetails?.brand || 'unknown',
      last4: paymentMethodDetails?.last4 || '0000',
    },
  }
}
