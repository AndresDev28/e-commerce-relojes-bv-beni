import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CheckoutForm from '../CheckoutForm' // ← Cambiado
import userEvent from '@testing-library/user-event'

const { mockUseStripe, mockUseElements } = vi.hoisted(() => ({
  mockUseStripe: vi.fn(),
  mockUseElements: vi.fn(),
}))

// Mock Stripe hooks - usar referencias externas
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: mockUseStripe,
  useElements: mockUseElements,
  CardElement: () => <div data-testid="card-element">Card Element Mock</div>,
}))

describe('CheckoutForm - [PAY-05]', () => {
  const mockStripe = {
    confirmCardPayment: vi.fn(),
  }

  const mockCardElement = {
    mount: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    update: vi.fn(),
  }

  const mockElements = {
    getElement: vi.fn(() => mockCardElement),
  }

  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStripe.mockReturnValue(mockStripe as any)
    mockUseElements.mockReturnValue(mockElements as any)
  })

  describe('Renderizado', () => {
    it('should render checkout form with all elements', () => {
      render(<CheckoutForm amount={259.89} />)

      // Form
      expect(screen.getByRole('form')).toBeInTheDocument()

      // Label
      expect(screen.getByText('Detalles de tarjeta')).toBeInTheDocument()

      // CardElement
      expect(screen.getByTestId('card-element')).toBeInTheDocument()

      // Botón con monto
      expect(
        screen.getByRole('button', { name: /pagar 259.89€/i })
      ).toBeInTheDocument()
    })
  })

  describe('Estados de loading', () => {
    it('should show loading state diring payment processing', async () => {
      const user = userEvent.setup()

      render(<CheckoutForm amount={100} onSuccess={mockOnSuccess} />)

      const button = screen.getByRole('button', { name: /pagar 100.00€/i })

      // Click en submit
      await user.click(button)

      // Durante el procesamiento
      expect(screen.getByText(/procesando/i)).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should restart button state after payment completes', async () => {
      const user = userEvent.setup()

      render(<CheckoutForm amount={100} onSuccess={mockOnSuccess} />)

      const button = screen.getByRole('button', { name: /pagar 100.00€/i })
      await user.click(button)

      // Esperar a que termine el procesamiento (2 segundos en el código)
      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      // Esperar a que el botón se habilite nuevamente
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Callbacks', () => {
    it('should call onSuccess after successful payment', async () => {
      const user = userEvent.setup()

      render(<CheckoutForm amount={100} onSuccess={mockOnSuccess} />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )
    })

    it('should not submit if Stripe is not loaded', async () => {
      mockUseStripe.mockReturnValue(null)
      const user = userEvent.setup()

      render(<CheckoutForm amount={100} onSuccess={mockOnSuccess} />)

      const button = screen.getByRole('button')

      // Aunque intente hacer click, no debería procesar
      await user.click(button)

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('should not submit if Elements is not loaded', async () => {
      mockUseElements.mockReturnValue(null)
      const user = userEvent.setup()

      render(<CheckoutForm amount={100} onSuccess={mockOnSuccess} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })
  describe('Formato de precio', () => {
    it('should display amount with correct format', () => {
      render(<CheckoutForm amount={259.89} />)

      expect(
        screen.getByRole('button', { name: /pagar 259.89€/i })
      ).toBeInTheDocument()
    })

    it('should handle different amounts', () => {
      const { rerender } = render(<CheckoutForm amount={100} />)
      expect(screen.getByText(/pagar 100.00€/i)).toBeInTheDocument()

      rerender(<CheckoutForm amount={999.99} />)
      expect(screen.getByText(/pagar 999.99€/i)).toBeInTheDocument()
    })
  })
})
