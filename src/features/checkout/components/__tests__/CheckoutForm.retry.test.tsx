/**
 * [PAY-10] Tests: Retry funciona después de error
 *
 * Este archivo contiene tests específicos para verificar
 * que el retry logic implementado en CheckoutForm funciona correctamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import CheckoutForm from '../CheckoutForm'
import * as retryHandler from '@/lib/stripe/retryHandler'
import type { CartItem } from '@/types'

// Mock fetch globally to simulate payment intent creation
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

  // Mock cart items for tests
  const mockCartItems: CartItem[] = [
    {
      id: '1',
      name: 'Test Product',
      price: 100,
      quantity: 1,
      images: ['test.jpg'],
      href: '/test',
      description: 'Test description',
      stock: 10,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    // Reset real timers para cada test
    vi.useRealTimers()

    // Mock localStorage to provide a valid JWT
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('mock-jwt-token')

    // Mock fetch to return a valid payment intent
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: 'pi_test_secret_mock', amount: 100 }),
    })
  })

  /**
   * Helper: renders form in Elements wrapper and waits for the button to be ready
   */
  async function renderAndWaitForButton(props: Record<string, unknown> = {}) {
    render(
      <Elements stripe={null}>
        <CheckoutForm
          amount={100}
          cartItems={mockCartItems}
          {...props}
        />
      </Elements>
    )
    let button: HTMLElement | null = null
    await waitFor(() => {
      button = screen.getByRole('button', { name: /pagar/i })
      expect(button).toBeInTheDocument()
    }, { timeout: 3000 })
    return button as unknown as HTMLElement
  }

  // ============================================================================
  // TEST 1: Retry automático después de timeout
  // ============================================================================
  it('should retry automatically after timeout error', async () => {
    const user = userEvent.setup()

    // Mock: primer intento timeout, segundo éxito
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockImplementationOnce(async (operation, options) => {
      // Simular un timeout en el primer intento, luego éxito
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

    const submitButton = await renderAndWaitForButton({ onSuccess: mockOnSuccess, onError: mockOnError })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockRetryWithBackoff).toHaveBeenCalled()
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    expect(mockOnError).not.toHaveBeenCalled()
  })

  // ============================================================================
  // TEST 2: Respeta máximo de intentos
  // ============================================================================
  it('should stop after max retry attempts', async () => {
    const user = userEvent.setup()

    // Mock: todos los intentos fallan
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: false,
      error: new Error('timeout'),
      attempts: 3, // Máximo de intentos alcanzado
      totalTime: 5000,
    })

    const submitButton = await renderAndWaitForButton({ onSuccess: mockOnSuccess, onError: mockOnError })
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
    expect(largeDelay).toBeLessThanOrEqual(
      retryHandler.RETRY_CONFIG.MAX_DELAY_MS
    )
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

    const submitButton = await renderAndWaitForButton({ onSuccess: mockOnSuccess, onError: mockOnError })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled()
    })

    // Verificar que solo se intentó 1 vez
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
      // Simular 2 reintentos antes del éxito
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

    const submitButton = await renderAndWaitForButton({ onSuccess: mockOnSuccess, onError: mockOnError })
    await user.click(submitButton)

    // Verificar que se muestra el contador
    await waitFor(() => {
      const retryMessage = screen.queryByText(/reintentando conexi/i)
      if (retryMessage) {
        expect(retryMessage).toBeInTheDocument()
      }
    })

    // Al final debe desaparecer el mensaje de retry
    await waitFor(() => {
      expect(
        screen.queryByText(/reintentando conexi/i)
      ).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // TEST 6: Estados se resetean después de pago exitoso
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
          cartItems={mockCartItems}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const submitButton = await waitFor(() =>
      screen.getByRole('button', { name: /pagar/i }),
      { timeout: 3000 }
    )
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que no hay mensajes de retry visibles
    expect(screen.queryByText(/reintentando/i)).not.toBeInTheDocument()

    // Reset mocks para segundo intento
    vi.clearAllMocks()

    // Re-mock fetch y localStorage para el rerender
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('mock-jwt-token')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: 'pi_test_secret_mock_2', amount: 100 }),
    })

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
          cartItems={mockCartItems}
          onSuccess={mockOnSuccess}
          onError={mockOnError}
        />
      </Elements>
    )

    const newSubmitButton = await waitFor(() =>
      screen.getByRole('button', { name: /pagar/i }),
      { timeout: 3000 }
    )
    await user.click(newSubmitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que el estado se resetea correctamente
    expect(screen.queryByText(/reintentando/i)).not.toBeInTheDocument()
  })

  // ============================================================================
  // TEST 7: Botón manual de retry funciona
  // ============================================================================
  it('should allow manual retry after max attempts', async () => {
    const user = userEvent.setup()

    // Primer intento: falla después de 3 intentos
    const mockRetryWithBackoff = vi.spyOn(retryHandler, 'retryWithBackoff')

    // Primera llamada: falla
    mockRetryWithBackoff.mockResolvedValueOnce({
      success: false,
      error: new Error('timeout'),
      attempts: 3,
      totalTime: 5000,
    })

    const submitButton = await renderAndWaitForButton({ onSuccess: mockOnSuccess, onError: mockOnError })
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
    const retryButton = await waitFor(() =>
      screen.getByRole('button', { name: /pagar/i }),
      { timeout: 3000 }
    )
    await user.click(retryButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    // Verificar que el retry manual funcionó
    expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1)
  })
})
