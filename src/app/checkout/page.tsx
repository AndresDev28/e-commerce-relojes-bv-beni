'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/features/cart'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import Button from '@/app/components/ui/Button'
import Link from 'next/link'
import { loadStripe, PaymentIntent } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import CheckoutForm from '@/features/checkout/components/CheckoutForm'
import OrderSummary from '@/features/checkout/components/OrderSummary'
import { getStripePublishableKey } from '@/lib/stripe/config'
import { generateOrderId } from '@/lib/orders/generateOrderId'
import { createOrder } from '@/lib/api/orders'
import { calculateShipping } from '@/lib/constants/shipping'
import { OrderStatus } from '@/types'

// Inicializar Stripe de forma lazy para evitar errores durante el build
// La promesa se crea solo cuando se necesita en el cliente
const getStripePromise = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return loadStripe(getStripePublishableKey())
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, jwt, isLoading: authLoading } = useAuth()
  const { cartItems, clearCart, isHydrated } = useCart()
  const [paymentSuccessful, setPaymentSuccessful] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [stripePromise] = useState(getStripePromise)
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Cesta', href: '/carrito' },
    { name: 'Finalizar Compra', href: '/checkout' },
  ]

  // Protección de ruta: verificar autenticación y carrito vacío
  useEffect(() => {
    console.log('🔍 [useEffect] Ejecutándose...', {
      authLoading,
      hasUser: !!user,
      cartItemsLength: cartItems.length,
      paymentSuccessful,
    })

    // Esperar a que termine de cargar el estado de autenticación y la hidratación
    if (authLoading || !isHydrated) return

    // Validación 1: Usuario debe estar autenticado
    if (!user) {
      console.log('🔍 [useEffect] No hay usuario, redirigiendo a /login')
      router.push('/login')
      return
    }

    // Validación 2: Carrito no debe estar vacío
    // IMPORTANTE: No redirigir si el pago fue exitoso o hay error de orden
    if (cartItems.length === 0 && !paymentSuccessful && !orderError) {
      console.log(
        '🔍 [useEffect] Carrito vacío y pago NO exitoso, redirigiendo a /tienda'
      )
      router.push('/tienda')
      return
    }

    console.log('🔍 [useEffect] Todo OK, no se redirige')
  }, [authLoading, user, cartItems, router, paymentSuccessful, orderError, isHydrated])

  // Mostrar loading mientras se valida la autenticación o el carrito
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

  // No renderizar contenido si no está autenticado o carrito vacío
  // IMPORTANTE: Permitir renderizado si hay un error de orden
  if (!user || (cartItems.length === 0 && !paymentSuccessful && !orderError)) {
    return null
  }

  const handleSuccess = async (paymentIntent: PaymentIntent) => {
    console.log('✅ Pago exitoso!', paymentIntent.id)

    // [PAY-17] Generar ID único del pedido al inicio
    const orderId = generateOrderId()
    console.log('📦 Order ID generado:', orderId)

    try {
      // Activar estado de carga
      setIsCreatingOrder(true)
      setOrderError(null)

      // Marcar pago como exitoso ANTES de vaciar el carrito
      setPaymentSuccessful(true)

      // [PAY-18] Crear orden en Strapi
      if (jwt) {
        console.log('💾 Creando orden en Strapi...')

        const expandedPaymentIntent = paymentIntent as PaymentIntent & {
          latest_charge?: {
            payment_method_details?: {
              card?: {
                brand: string
                last4: string
              }
            }
          }
        }
        const paymentMethodDetails =
          expandedPaymentIntent.latest_charge?.payment_method_details?.card

        const orderData = {
          orderId,
          items: cartItems,
          subtotal,
          shipping: shippingCost,
          total,
          orderStatus: OrderStatus.PAID,
          paymentIntentId: paymentIntent.id,
          paymentInfo: {
            method: 'card',
            brand: paymentMethodDetails?.brand || 'unknown',
            last4: paymentMethodDetails?.last4 || '0000',
          },
        }

        await createOrder(orderData, jwt)
        console.log('✅ Orden creada en Strapi')
      } else {
        console.warn('⚠️ No se pudo crear la orden: usuario sin JWT')
      }

      // Vaciar carrito
      clearCart()

      // Redirigir con orderId en query params
      router.push(`/order-confirmation?orderId=${orderId}`)
    } catch (error) {
      console.error('❌ Error al crear la orden:', error)

      // [AND-99] NO redirigir a la página de éxito si la orden falló
      const errorMsg = error instanceof Error
        ? error.message
        : 'Error al crear la orden'

      setOrderError(
        `Tu pago fue procesado, pero hubo un problema al registrar tu pedido: ${errorMsg}. ` +
        `Por favor, contacta con soporte indicando tu ID de pago: ${paymentIntent.id}`
      )
      setPaymentSuccessful(false)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handleError = (error: string) => {
    console.error('❌ Error en pago:', error)
  }

  // Cálculo de totales (debe coincidir con OrderSummary)
  const subtotal = cartItems.reduce(
    (sum, cartItem) => sum + cartItem.price * cartItem.quantity,
    0
  )
  const shippingCost = calculateShipping(subtotal)
  const total = subtotal + shippingCost

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs breadcrumbs={breadcrumbs} />

      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-sans font-bold text-dark mb-8">
          Finalizar Compra
        </h1>

        {/* [AND-99] Error al registrar el pedido */}
        {orderError && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-sans font-semibold text-red-800 mb-2">
                  Error al registrar el pedido
                </h3>
                <p className="text-sm text-red-700 font-sans">
                  {orderError}
                </p>
                <div className="mt-4 flex gap-3">
                  <Link href="/tienda">
                    <Button variant="outline">
                      Volver a la Tienda
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {/* Modal de loading durante creación de orden */}
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

