'use client'
import { useState, FormEvent, useEffect } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import {
  handleStripeError,
  getErrorSuggestion,
} from '@/lib/stripe/errorHandler'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { retryWithBackoff } from '@/lib/stripe/retryHandler'
import { newTraceId } from '@/lib/trace'
import type { RetryResult } from '@/lib/stripe/retryHandler'
import type { PaymentIntent } from '@stripe/stripe-js'
import type { CartItem } from '@/types'

interface CheckoutFormProps {
  amount: number
  cartItems: CartItem[]
  onSuccess?: (paymentIntent: PaymentIntent) => void
  onError?: (error: string) => void
}

export default function CheckoutForm({
  amount,
  cartItems,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const maxRetries = 3
  const [errorSuggestion, setErrorSuggestion] = useState<string | undefined>()
  const [isMobile, setIsMobile] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoadingIntent, setIsLoadingIntent] = useState(false)

  const stripe = useStripe()
  const elements = useElements()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 649)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      if (!cartItems || cartItems.length === 0) {
        return
      }
      setIsLoadingIntent(true)
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': newTraceId(),
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            items: cartItems,
          }),
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'No se pudo inicializar el pago.')
        }
        const data = await response.json()
        setClientSecret(data.clientSecret)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo inicializar el pago. Por favor, recarga la página.'
        )
      } finally {
        setIsLoadingIntent(false)
      }
    }
    fetchPaymentIntent()
  }, [cartItems, amount])

  const performPayment = async () => {
    if (!stripe || !elements) {
      throw new Error('Stripe no está listo')
    }

    if (!clientSecret) {
      throw new Error('Payment intent no inicializado')
    }
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      throw new Error('Card element no encontrado')
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    )

    if (error) {
      throw error
    }

    if (!paymentIntent) {
      throw new Error('Payment intent not returned from Stripe')
    }

    return paymentIntent
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage('')
    setErrorSuggestion(undefined)
    setRetryCount(0)
    setIsRetrying(false)
    try {
      const result: RetryResult<PaymentIntent> = await retryWithBackoff(
        performPayment,
        {
          maxAttempts: maxRetries,
          onRetry: (attempt) => {
            setIsRetrying(true)
            setRetryCount(attempt)
          },
        }
      )

      if (result.success && result.data) {
        setIsRetrying(false)
        onSuccess?.(result.data)
      } else {
        throw result.error || new Error('Payment failed')
      }
    } catch (error) {
      setIsRetrying(false)
      const processedError = handleStripeError(error)
      setErrorMessage(processedError.localizedMessage)
      const suggestion = getErrorSuggestion(processedError.code)
      setErrorSuggestion(suggestion)
      onError?.(processedError.localizedMessage)
    } finally {
      setIsProcessing(false)
      setIsRetrying(false)
    }
  }

  const cardElementOptions = {
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
          <CardElement options={cardElementOptions} />
        </div>
      </div>

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
        disabled={!stripe || isProcessing || isLoadingIntent || !clientSecret}
        className="w-full px-6 py-3 bg-primary text-white font-sans font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoadingIntent
          ? 'Inicializando pago...'
          : isRetrying
            ? `Reintentando...(${retryCount}/${maxRetries})`
            : isProcessing
              ? 'Procesando...'
              : `Pagar ${amount.toFixed(2)}€`}
      </button>
    </form>
  )
}
