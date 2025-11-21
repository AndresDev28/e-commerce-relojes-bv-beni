'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'

function OrderConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    // Obtener orderId de query params
    const id = searchParams.get('orderId')

    // Protección: si no hay orderId redirigir a home
    if (!id) {
      console.warn('⚠️ Acceso directo a order-confirmation sin orderId')
      router.push('/')
      return
    }

    setOrderId(id)
  }, [searchParams, router])

  // Mostrar loading mientras valida
  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Icono de éxito */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-4xl font-sans font-bold text-dark mb-4">
          Pedido Confirmado
        </h1>

        {/* Número de pedido */}
        <div className="bg-neutral-light/50 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-neutral-medium font-sans mb-1">
            Número de pedido
          </p>
          <p className="text-xl font-mono font-semibold text-dark">
            {orderId}
          </p>
        </div>

        {/* Mensaje */}
        <p className="text-lg text-neutral-medium font-sans mb-2">
          Tu pago se ha procesado correctamente
        </p>
        <p className="text-neutral-medium font-serif mb-8">
          Recibirás un correo electrónico con los detalles de tu pedido
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link href="/tienda">
            <Button variant="primary" className="w-full sm:w-auto">
              Continuar Comprando
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  )
}
