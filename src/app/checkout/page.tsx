'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/features/cart'
import {
  CheckoutForm,
  OrderSummary,
  useCreateOrder,
  useCheckoutTotals,
} from '@/features/checkout'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import Button from '@/app/components/ui/Button'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import type { PaymentIntent } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { getStripePublishableKey } from '@/lib/stripe/config'

const getStripePromise = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return loadStripe(getStripePublishableKey())
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { cartItems, clearCart, isHydrated } = useCart()
  const { createOrder, isCreatingOrder, orderError } = useCreateOrder({
    clearCart,
  })
  const { total } = useCheckoutTotals(cartItems)
  const [stripePromise] = useState(getStripePromise)

  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Cesta', href: '/carrito' },
    { name: 'Finalizar Compra', href: '/checkout' },
  ]

  useEffect(() => {
    if (authLoading || !isHydrated) return

    if (!user) {
      router.push('/login')
      return
    }

    if (cartItems.length === 0 && !orderError) {
      router.push('/tienda')
      return
    }
  }, [authLoading, user, cartItems, router, orderError, isHydrated])

  if (authLoading || !isHydrated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-neutral-medium font-sans">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user || (cartItems.length === 0 && !orderError)) {
    return null
  }

  const handleSuccess = (paymentIntent: PaymentIntent) => {
    createOrder(paymentIntent, cartItems)
  }

  const handleError = (_error: string) => {}

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-sans font-bold text-dark mb-8">
          Finalizar Compra
        </h1>

        {orderError && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-sans font-semibold text-red-800 mb-2">
                  Error al registrar el pedido
                </h3>
                <p className="text-sm text-red-700 font-sans">{orderError}</p>
                <div className="mt-4 flex gap-3">
                  <Link href="/tienda">
                    <Button variant="outline">Volver a la Tienda</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-neutral-light">
              <h2 className="text-xl font-sans font-semibold text-dark mb-6">
                Información de Pago
              </h2>

              <Elements stripe={stripePromise}>
                <CheckoutForm
                  amount={total}
                  cartItems={cartItems}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </Elements>

              <div className="mt-6 pt-6 border-t border-neutral-light">
                <Link href="/tienda">
                  <Button variant="outline" className="w-full">
                    Volver a la Tienda
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="sticky top-8">
              <OrderSummary />

              <div className="mt-4 bg-white rounded-lg shadow-md p-4">
                <div className="flex items-start gap-2 text-sm text-neutral-medium">
                  <svg
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="font-sans">
                    Pago 100% seguro con encriptación SSL
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCreatingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
            <h3 className="text-lg font-sans font-semibold text-dark mb-2">
              Procesando tu orden...
            </h3>
            <p className="text-neutral-medium font-sans text-sm">
              Por favor, espera un momento mientras guardamos tu pedido.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
