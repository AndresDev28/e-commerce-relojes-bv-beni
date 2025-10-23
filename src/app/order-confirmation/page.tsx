'use client'
import Link from 'next/link'
import Button from '@/app/components/ui/Button'

export default function OrderConfirmationPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icono de éxito */}
        <div className="mb-8">
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
