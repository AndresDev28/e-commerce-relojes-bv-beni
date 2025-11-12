'use client'
import { useState, FormEvent, useEffect } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import {
  handleStripeError,
  getErrorSuggestion,
} from '@/lib/stripe/errorHandler'
import ErrorMessage from '@/app/components/ui/ErrorMessage'
import { retryWithBackoff } from '@/lib/stripe/retryHandler'
import type { RetryResult } from '@/lib/stripe/retryHandler'

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
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const maxRetries = 3
  const [errorSuggestion, setErrorSuggestion] = useState<string | undefined>()
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

  // [PAY-08] Función interna para realizar el pago
  // Esta función contiene toda la lógica de pago y será envuelta con retry
  const performPayment = async () => {
    // Validar que Stripe esté cargado
    if (!stripe || !elements) {
      throw new Error('Stripe no está listo')
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      throw new Error('Card element no encontrado')
    }

    // ================================================================
    // TODO: Implementar integración real con Stripe
    // ================================================================
    // Cuando estés listo, reemplaza este bloque con:
    //
    // const { error, paymentIntent } = await stripe.confirmCardPayment(
    //   clientSecret,
    //   {
    //     payment_method: {
    //       card: cardElement,
    //     },
    //   }
    // )
    //
    // if (error) {
    //   throw error // El catch lo manejará con handleStripeError
    // }
    //
    // return paymentIntent
    // ================================================================

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 2000))

    // ================================================================
    // [PAY-06] [PAY-07] [PAY-08] SIMULACIÓN DE ERRORES PARA TESTING
    // ================================================================
    // Descomenta UNA de estas líneas para probar diferentes errores:
    //
    // throw {
    //   type: 'card_error',
    //   code: 'card_declined',
    //   message: 'Your card was declined.',
    // }
    // throw {
    //   type: 'card_error',
    //   code: 'expired_card',
    //   message: 'Your card has expired.',
    // }
    // throw {
    //   type: 'card_error',
    //   code: 'incorrect_cvc',
    //   message: "Your card's security code is incorrect.",
    // }
    // throw {
    //   type: 'card_error',
    //   code: 'insufficient_funds',
    //   message: 'Your card has insufficient funds.',
    // }
    // throw {
    //   type: 'card_error',
    //   code: 'processing_error',
    //   message: 'An error occurred while processing your card.',
    // }
    // throw new Error('Network error') // Error de red - RETRY
    // throw new Error('timeout') // Timeout - RETRY
    // ================================================================

    // Si llegamos aquí, el pago fue exitoso
    console.log('🎯 performPayment: Pago simulado exitoso')
    return { success: true }
  }

  // [PAY-08] handleSubmit con retry logic
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Validar que Stripe esté cargado
    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage('')
    setErrorSuggestion(undefined)
    setRetryCount(0)
    setIsRetrying(false)
    try {
      // Envolver performPayment con retry logic
      const result: RetryResult<{ success: boolean }> = await retryWithBackoff(
        performPayment,
        {
          maxAttempts: maxRetries,
          onRetry: (attempt, error) => {
            // Callback cuando está reintentando
            setIsRetrying(true)
            setRetryCount(attempt)
            console.log(
              `🔄 Reintentando pago... (${attempt}/${maxRetries})`,
              error.message
            )
          },
        }
      )

      if (result.success && result.data) {
        // Pago exitoso
        setIsRetrying(false)
        console.log('🎯 Pago exitoso después de', result.attempts, 'intentos')
        console.log('🎯 CheckoutForm: llamando a onSuccess...')
        onSuccess?.()
        console.log('🎯 CheckoutForm: onSuccess ejecutado')
      } else {
        // Todos los reintentos fallaron
        throw result.error || new Error('Payment failed')
      }
    } catch (error) {
      // Manejar error final
      setIsRetrying(false)
      const processedError = handleStripeError(error)
      setErrorMessage(processedError.localizedMessage)
      const suggestion = getErrorSuggestion(processedError.code)
      setErrorSuggestion(suggestion)
      onError?.(processedError.localizedMessage)

      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error procesado:', processedError)
      }
    } finally {
      // setIsProcessing(false) SIEMPRE
      setIsProcessing(false)
      setIsRetrying(false)
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

      {/* [PAY-07] Nuevo componente ErrorMessage reutilizable */}
      {errorMessage && (
        <ErrorMessage
          message={errorMessage}
          variant="error"
          suggestion={errorSuggestion}
          onDismiss={() => {
            setErrorMessage('')
            setErrorSuggestion(undefined)
          }}
        />
      )}

      {/* [PAY-08] Indicador de reintentos */}
      {isRetrying && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-sm text-blue-800 font-medium">
              Reintentando conexión... (intento {retryCount} de {maxRetries})
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-3 bg-primary text-white font-sans font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRetrying
          ? `Reintentando...(${retryCount}/${maxRetries})`
          : isProcessing
            ? 'Procesando...'
            : `Pagar ${amount.toFixed(2)}€`}
      </button>
    </form>
  )
}
