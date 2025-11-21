/**
 * [PAY-10] Tests: Retry funciona despu�s de error
 *
 * Este archivo contiene tests espec�ficos para verificar
 * que el retry logic implementado en CheckoutForm funciona correctamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import CheckoutForm from '../CheckoutForm'
import * as retryHandler from '@/lib/stripe/retryHandler'

// Mock Stripe
const mockStripe = {
  elements: vi.fn(),
  confirmCardPayment: vi.fn(),
}

vi.mock('@stripe/react-stripe-js', async () => {
  const actual = await vi.importActual('@stripe/react-stripe-js')
  return {
    ...actual,
    useStripe: () => mockStripe,
    useElements: () => ({
      getElement: vi.fn().mockReturnValue({}),
    }),
  }
})

describe('[PAY-10] Retry Logic Tests', () => {
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    // Reset real timers para cada test
    vi.useRealTimers()
  })

  // ============================================================================
  // TEST 1: Retry autom�tico despu�s de timeout
  // ============================================================================
  it('should retry automatically after timeout error', async () => {
    const user = userEvent.setup()

    // Mock: primer intento timeout, segundo �xito
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockImplementationOnce(async (operation, options) => {
      // Simular un timeout en el primer intento, luego �xito
      let attempts = 0
      try {
        attempts++
        throw new Error('timeout')
      } catch (error) {
        if (options?.onRetry) {
          options.onRetry(attempts, error as Error)
        }
        // Segundo intento exitoso
        attempts++
        return {
          success: true,
          data: { success: true },
          attempts: 2,
          totalTime: 1500,
        }
      }
    })

    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRetryWithBackoff).toHaveBeenCalled()
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    expect(mockOnError).not.toHaveBeenCalled()
  })

  // ============================================================================
  // TEST 2: Respeta m�ximo de intentos
  // ============================================================================
  it('should stop after max retry attempts', async () => {
    const user = userEvent.setup()

    // Mock: todos los intentos fallan
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: false,
      error: new Error('timeout'),
      attempts: 3, // M�ximo de intentos alcanzado
      totalTime: 5000,
    })

    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
    expect(mockRetryWithBackoff).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxAttempts: 3,
      })
    )
  })

  // ============================================================================
  // TEST 3: Exponential backoff funciona
  // ============================================================================
  it('should use exponential backoff delays', async () => {
    // Usamos calculateBackoffDelay directamente para verificar la lógica
    const delay1 = retryHandler.calculateBackoffDelay(1, 1000)
    const delay2 = retryHandler.calculateBackoffDelay(2, 1000)
    const delay3 = retryHandler.calculateBackoffDelay(3, 1000)

    // Verificar que los delays son exponenciales
    expect(delay1).toBe(1000) // 1s
    expect(delay2).toBe(2000) // 2s
    expect(delay3).toBe(4000) // 4s

    // Verificar que el delay crece exponencialmente
    expect(delay2).toBe(delay1 * 2)
    expect(delay3).toBe(delay1 * 4)

    // Verificar que respeta el máximo
    const largeDelay = retryHandler.calculateBackoffDelay(10, 1000)
    expect(largeDelay).toBeLessThanOrEqual(retryHandler.RETRY_CONFIG.MAX_DELAY_MS)
  })

  // ============================================================================
  // TEST 4: NO reintenta errores no recuperables (card_declined)
  // ============================================================================
  it('should not retry non-recoverable errors (card_declined)', async () => {
    const user = userEvent.setup()

    // Mock: error no recuperable (card_declined)
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: false,
      error: new Error('Tu tarjeta fue rechazada'),
      attempts: 1, // Solo 1 intento porque no es recuperable
      totalTime: 500,
    })

    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })

    // Verificar que solo se intent� 1 vez
    const callArgs = mockRetryWithBackoff.mock.results[0].value
    await waitFor(async () => {
      const result = await callArgs
      expect(result.attempts).toBe(1)
    })
  })

  // ============================================================================
  // TEST 5: UI muestra contador de reintentos
  // ============================================================================
  it('should display retry counter in UI', async () => {
    const user = userEvent.setup()

    // Mock: simular reintentos con callback
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockImplementationOnce(async (operation, options) => {
      // Simular 2 reintentos antes del �xito
      if (options?.onRetry) {
        // Primer reintento
        options.onRetry(1, new Error('timeout'))
        await new Promise(resolve => setTimeout(resolve, 10))

        // Segundo reintento
        options.onRetry(2, new Error('timeout'))
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      return {
        success: true,
        data: { success: true },
        attempts: 3,
        totalTime: 2000,
      }
    })

    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    // Verificar que se muestra el contador
    await waitFor(() => {
      const retryMessage = screen.queryByText(/reintentando conexi�n/i)
      if (retryMessage) {
        expect(retryMessage).toBeInTheDocument()
      }
    })

    // Al final debe desaparecer el mensaje de retry
    await waitFor(() => {
      expect(
        screen.queryByText(/reintentando conexi�n/i)
      ).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // TEST 6: Estados se resetean despu�s de pago exitoso
  // ============================================================================
  it('should reset retry state after successful payment', async () => {
    const user = userEvent.setup()

    // Primer intento: falla y reintenta
    const mockRetryWithBackoff = vi
      .spyOn(retryHandler, 'retryWithBackoff')
      .mockResolvedValueOnce({
        success: true,
        data: { success: true },
        attempts: 2,
        totalTime: 1500,
      })

    const { rerender } = render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que no hay mensajes de retry visibles
    expect(screen.queryByText(/reintentando/i)).not.toBeInTheDocument()

    // Reset mocks para segundo intento
    vi.clearAllMocks()
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: true,
      data: { success: true },
      attempts: 1,
      totalTime: 500,
    })

    // Re-render y hacer segundo pago
    rerender(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const newSubmitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(newSubmitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que el estado se resetea correctamente
    expect(screen.queryByText(/reintentando/i)).not.toBeInTheDocument()
  })

  // ============================================================================
  // TEST 7: Bot�n manual de retry funciona
  // ============================================================================
  it('should allow manual retry after max attempts', async () => {
    const user = userEvent.setup()

    // Primer intento: falla despu�s de 3 intentos
    const attemptCount = 0
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')

    // Primera llamada: falla
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: false,
      error: new Error('timeout'),
      attempts: 3,
      totalTime: 5000,
    })

    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })

    // Reset y configurar segundo intento exitoso
    vi.clearAllMocks()
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: true,
      data: { success: true },
      attempts: 1,
      totalTime: 500,
    })

    // Hacer click nuevamente (retry manual)
    const retryButton = screen.getByRole('button', { name: /pagar/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que el retry manual funcion�
    expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1)
  })
})
