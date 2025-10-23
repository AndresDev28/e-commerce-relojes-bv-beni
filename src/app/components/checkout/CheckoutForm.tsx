'use client'
import { useState, FormEvent, useEffect } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'

interface CheckoutFormProps {
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function CheckoutForm({
  amount,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  // State
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Stripe Hooks
  const stripe = useStripe()
  const elements = useElements()

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 649)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // handleSubmit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Validar que Stripe esté cargado
    if (!stripe || !elements) {
      return
    }

    // Obtener cardElement
    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      return
    }

    setIsProcessing(true)
    setErrorMessage('')

    // Simular delay 2 segundos
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Llamar onSuccess (punto 10 del DESIGN)
      onSuccess?.()
    } catch (error) {
      // Manejar errores si los hay
      const errorMsg =
        error instanceof Error ? error.message : 'Error desconocido'
      setErrorMessage(errorMsg)
      onError?.(errorMsg)
    } finally {
      // seIsProcessing(false) SIEMPRE
      setIsProcessing(false)
    }
  }

  // Opciones responsive del CardElement
  const cardeElementOptions = {
    style: {
      base: {
        fontSize: isMobile ? '14px' : '16px',
        color: '#272727',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: isMobile ? '1.5' : '1.4',
        '::placeholder': {
          color: '#6B7280',
        },
      },
      invalid: {
        color: '#DC2626',
        iconColor: '#DC2626',
      },
    },
  }

  // JSX
  return (
    <form onSubmit={handleSubmit} role="form" className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="card-element"
          className="block font-sans font-semibold text-dark text-sm"
        >
          Detalles de tarjeta
        </label>
        <div
          id="card-element"
          className="p-3 sm:p-4 border border-neutral-medium rounded-md bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <CardElement options={cardeElementOptions} />
        </div>
      </div>

      {errorMessage && (
        <div
          className="p-4 bg-red-50 border border-secondary rounded-md text-secondary font-sans text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-3 bg-primary text-white font-sans font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Procesando...' : `Pagar ${amount.toFixed(2)}€`}
      </button>
    </form>
  )
}
