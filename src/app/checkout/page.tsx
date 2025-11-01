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
import OrderSummary from '../components/checkout/OrderSummary'
import { getStripePublishableKey } from '@/lib/stripe/config'
import { generateOrderId } from '@/lib/orders/generateOrderId'

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
    console.log('🔍 [useEffect] Ejecutándose...', {
      authLoading,
      hasUser: !!user,
      cartItemsLength: cartItems.length,
      paymentSuccessful,
    })

    // Esperar a que termine de cargar el estado de autenticación
    if (authLoading) return

    // Validación 1: Usuario debe estar autenticado
    if (!user) {
      console.log('🔍 [useEffect] No hay usuario, redirigiendo a /login')
      router.push('/login')
      return
    }

    // Validación 2: Carrito no debe estar vacío
    // IMPORTANTE: No redirigir si el pago fue exitoso
    if (cartItems.length === 0 && !paymentSuccessful) {
      console.log('🔍 [useEffect] Carrito vacío y pago NO exitoso, redirigiendo a /tienda')
      router.push('/tienda')
      return
    }

    console.log('🔍 [useEffect] Todo OK, no se redirige')
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
    console.log('✅ [CHECKPOINT 1] handleSuccess llamado')
    console.log('✅ Pago exitoso!')

    const orderId = generateOrderId()
    console.log('📦 [CHECKPOINT 2] Order ID generado:', orderId)

    // IMPORTANTE: Marcar pago como exitoso PRIMERO
    // Esto evita que el useEffect redirija a /tienda cuando se vacíe el carrito
    console.log('📦 [CHECKPOINT 3] Marcando pago como exitoso...')
    setPaymentSuccessful(true)

    // IMPORTANTE: Redirigir INMEDIATAMENTE después de marcar el pago exitoso
    // Hacerlo ANTES de vaciar el carrito previene race condition con useEffect
    const targetUrl = `/order-confirmation?orderId=${orderId}`
    console.log('📦 [CHECKPOINT 4] Redirigiendo a:', targetUrl)
    router.push(targetUrl)
    console.log('📦 [CHECKPOINT 5] router.push ejecutado')

    // Vaciar carrito DESPUÉS de la navegación
    // Esto es seguro porque ya estamos navegando fuera de la página
    console.log('📦 [CHECKPOINT 6] Vaciando carrito...')
    clearCart()
    console.log('📦 [CHECKPOINT 7] Proceso completado')
  }

  const handleError = (error: string) => {
    console.error('❌ Error en pago:', error)
  }

  // Cálculo de totales (debe coincidir con OrderSummary)
  const SHIPPING_COST = 5.95
  const FREE_SHIPPING_THRESHOLD = 50

  const subtotal = cartItems.reduce(
    (sum, cartItem) => sum + cartItem.price * cartItem.quantity,
    0
  )
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = subtotal + shippingCost

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
            <div className="sticky top-8">
              <OrderSummary />

              {/* Mensaje de seguridad */}
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
    </div>
  )
}
