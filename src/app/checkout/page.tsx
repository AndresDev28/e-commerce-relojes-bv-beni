'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import Button from '@/app/components/ui/Button'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '../components/checkout/CheckoutForm'
import { getStripePublishableKey } from '@/lib/stripe/config'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { cartItems, clearCart } = useCart()
  const [paymentSuccessful, setPaymentSuccessful] = useState(false)
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Cesta', href: '/carrito' },
    { name: 'Finalizar Compra', href: '/checkout' },
  ]

  // Obtener la clave pública de Stripe desde variables de entorno
  // Usa la función de validación que verifica el formato y ambiente
  const stripePromise = loadStripe(getStripePublishableKey())

  // Protección de ruta: verificar autenticación y carrito vacío
  useEffect(() => {
    // Esperar a que termine de cargar el estado de autenticación
    if (authLoading) return

    // Validación 1: Usuario debe estar autenticado
    if (!user) {
      router.push('/login')
      return
    }

    // Validación 2: Carrito no debe estar vacío
    // IMPORTANTE: No redirigir si el pago fue exitoso
    if (cartItems.length === 0 && !paymentSuccessful) {
      router.push('/tienda')
      return
    }
  }, [authLoading, user, cartItems, router, paymentSuccessful])

  // Mostrar loading mientras se valida la autenticación
  if (authLoading) {
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

  // No renderizar contenido si no está autenticado o carrito vacío
  // (el useEffect manejará la redirección)
  // IMPORTANTE: Permitir renderizado si el pago fue exitoso
  if (!user || (cartItems.length === 0 && !paymentSuccessful)) {
    return null
  }

  const handleSuccess = () => {
    console.log('✅ Pago exitoso!')
    // Marcar pago como exitoso ANTES de vaciar el carrito
    // Esto evita que el useEffect redirija a /tienda
    setPaymentSuccessful(true)
    // Vaciar carrito
    clearCart()
    // Redirigir a página de confirmación
    router.push('/order-confirmation')
  }

  const handleError = (error: string) => {
    console.error('❌ Error en pago:', error)
  }

  // Cálculo de totales
  const subtotal = cartItems.reduce(
    (sum, cartItem) => sum + cartItem.price * cartItem.quantity,
    0
  )
  const iva = subtotal * 0.21
  const total = subtotal + iva

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-sans font-bold text-dark mb-8">
          Finalizar Compra
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda - Formulario de Pago */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-md p-6 border border-neutral-light">
              <h2 className="text-xl font-sans font-semibold text-dark mb-6">
                Información de Pago
              </h2>

              <Elements stripe={stripePromise}>
                <CheckoutForm
                  amount={total}
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

          {/* Columna Derecha - Resumen del Pedido */}
          <div className="order-1 lg:order-2">
            <div className="bg-neutral-light rounded-lg shadow-md p-6 border border-neutral-light sticky top-8">
              <h2 className="text-xl font-sans font-semibold text-dark mb-4">
                Resumen del Pedido
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-neutral-dark">
                  <span className="font-sans">Subtotal</span>
                  <span className="font-sans font-semibold">
                    {subtotal.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-neutral-dark">
                  <span className="font-sans">Envío</span>
                  <span className="font-sans font-semibold text-green-600">
                    Gratis
                  </span>
                </div>
                <div className="flex justify-between text-neutral-dark">
                  <span className="font-sans">IVA (21%)</span>
                  <span className="font-sans font-semibold">
                    {iva.toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-neutral-medium">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-sans font-bold text-dark">
                    Total
                  </span>
                  <span className="text-2xl font-sans font-bold text-primary">
                    {total.toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-medium">
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
                  <p className="font-serif">
                    Pago 100% seguro con encriptación SSL
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
