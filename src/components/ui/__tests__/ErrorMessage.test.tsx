import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorMessage from '../ErrorMessage'

describe('ErrorMessage - [PAY-09]', () => {
  describe('Basic render', () => {
    it('should render error message with text', () => {
      render(<ErrorMessage message="Test error message" />)

      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should render with default error variant', () => {
      const { container } = render(<ErrorMessage message="Error" />)

      // Verificar que tiene clases de error (rojo)
      const alert = container.querySelector('[role="alert"]')
      expect(alert).toHaveClass('bg-red-50')
    })
  })

  describe('Variants', () => {
    it('should render error variant with AlertCircle icon', () => {
      const { container } = render(
        <ErrorMessage message="Error" variant="error" />
      )

      expect(container.querySelector('[role="alert"]')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('should render warning variant with AlertTriangle icon', () => {
      const { container } = render(
        <ErrorMessage message="Warning" variant="warning" />
      )

      expect(container.querySelector('[role="status"]')).toBeInTheDocument()
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('should render info variant with Info icon', () => {
      const { container } = render(
        <ErrorMessage message="Info" variant="info" />
      )

      expect(container.querySelector('[role="status"]')).toBeInTheDocument()
      expect(screen.getByText('Info')).toBeInTheDocument()
    })
  })

  describe('Suggestions', () => {
    it('should render suggestion text when provided', () => {
      render(
        <ErrorMessage message="Error message" suggestion="Try this solution" />
      )

      expect(screen.getByText('Error message')).toBeInTheDocument()
      expect(screen.getByText('Try this solution')).toBeInTheDocument()
    })

    it('should not render suggestion when not provided', () => {
      render(<ErrorMessage message="Error message" />)

      expect(screen.getByText('Error message')).toBeInTheDocument()
      // No debería haber texto de sugerencia
      expect(screen.queryByText(/Try/)).not.toBeInTheDocument()
    })
  })

  describe('Close button', () => {
    it('should render close button when onDismiss is provided', () => {
      const mockDismiss = vi.fn()

      render(<ErrorMessage message="Error" onDismiss={mockDismiss} />)

      const closeButton = screen.getByRole('button', { name: /cerrar/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onDismiss when close button is clicked', async () => {
      const user = userEvent.setup()
      const mockDismiss = vi.fn()

      render(<ErrorMessage message="Error" onDismiss={mockDismiss} />)

      const closeButton = screen.getByRole('button', { name: /cerrar/i })
      await user.click(closeButton)

      expect(mockDismiss).toHaveBeenCalledTimes(1)
    })

    it('should not render close button when onDismiss is not provided', () => {
      render(<ErrorMessage message="Error" />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Accesibility', () => {
    it('should have role="alert" for error variant', () => {
      render(<ErrorMessage message="Error" variant="error" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have role="status" for warning variant', () => {
      render(<ErrorMessage message="Warning" variant="warning" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have role="status" for info variant', () => {
      render(<ErrorMessage message="Info" variant="info" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have aria-live="assertive" for errors', () => {
      const { container } = render(
        <ErrorMessage message="Error" variant="error" />
      )

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have aria-live="polite" for warnings and info', () => {
      const { container } = render(
        <ErrorMessage message="Warning" variant="warning" />
      )

      const status = container.querySelector('[role="status"]')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Clases personalizadas', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ErrorMessage message="Error" className="custom-class" />
      )

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toHaveClass('custom-class')
    })
  })
})
