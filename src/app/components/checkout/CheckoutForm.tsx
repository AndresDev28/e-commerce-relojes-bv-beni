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

  // ================================================================
  // [PAY-08][PAY-21] PAYMENT PROCESSING FUNCTION
  // ================================================================
  // This function handles the payment flow and is wrapped with retry logic.
  //
  // 🔒 SECURITY - TOKENIZATION FLOW (PCI DSS Compliant):
  // ================================================================
  // 1. CardElement is an iframe hosted by Stripe
  //    - Card data never touches our JavaScript context
  //    - Data is encrypted at the input level
  //    - We never have access to raw card numbers
  //
  // 2. When stripe.confirmCardPayment() is called:
  //    - Stripe Elements tokenizes the card data internally
  //    - A secure token is created (starts with pm_)
  //    - Only the token is sent to Stripe's servers
  //    - Our server NEVER receives raw card data
  //
  // 3. The flow is:
  //    User enters card → Stripe iframe → Stripe tokenization →
  //    Token sent to Stripe API → Payment processed →
  //    Result returned to our app
  //
  // 4. What we receive:
  //    ✅ Payment confirmation (success/failure)
  //    ✅ Payment Intent ID
  //    ✅ Last 4 digits (safe to display)
  //    ❌ Never full card number
  //    ❌ Never CVV
  //    ❌ Never raw card data
  //
  // This architecture ensures we are PCI DSS compliant by never
  // handling sensitive card data directly.
  // ================================================================
  const performPayment = async () => {
    // Validar que Stripe esté cargado
    if (!stripe || !elements) {
      throw new Error('Stripe no está listo')
    }

    // Get CardElement reference (this is just a reference to Stripe's iframe)
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      throw new Error('Card element no encontrado')
    }

    // ================================================================
    // TODO: Implementar integración real con Stripe
    // ================================================================
    // Cuando estés listo, reemplaza este bloque con:
    //
    // 🔒 IMPORTANT: This call handles tokenization automatically
    // const { error, paymentIntent } = await stripe.confirmCardPayment(
    //   clientSecret, // Obtained from your backend
    //   {
    //     payment_method: {
    //       card: cardElement, // Stripe handles tokenization internally
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
      {/* ============================================================
          [PAY-21] SECURE CARD INPUT - STRIPE ELEMENTS
          ============================================================
          🔒 SECURITY NOTE:
          CardElement is an iframe hosted by Stripe that handles all
          sensitive card data. The card information never touches our
          application's JavaScript context, ensuring PCI DSS compliance.

          How it works:
          1. User types card details in Stripe's secure iframe
          2. Data is encrypted at the input level
          3. When form submits, Stripe tokenizes the data
          4. We only receive a secure token (pm_xxx)
          5. Raw card data never leaves Stripe's servers

          This architecture means:
          - We don't need PCI compliance certification
          - No card data in our logs or databases
          - No risk of exposing sensitive information
          ============================================================ */}
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
          {/* Stripe's secure iframe - card data stays within Stripe's infrastructure */}
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
