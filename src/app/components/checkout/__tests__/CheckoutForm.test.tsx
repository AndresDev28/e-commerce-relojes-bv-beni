import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CheckoutForm from '../CheckoutForm' // ← Cambiado

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

describe('CheckoutForm - [PAY-02]', () => {
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
})
