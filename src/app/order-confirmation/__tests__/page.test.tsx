import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import OrderConfirmationPage from '../page'

// Mock de Next.js router y searchParams
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

describe('OrderConfirmationPage - [PAY-19]', () => {
  const mockPush = vi.fn()
  const mockSearchParams = {
    get: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    })
    ;(useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSearchParams
    )
  })

  describe('Renderizado con orderId válido', () => {
    beforeEach(() => {
      mockSearchParams.get.mockReturnValue('ORD-1762433263-TEST')
    })

    it('should render success page when orderId is present', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('Pedido Confirmado')).toBeInTheDocument()
      })
    })

    it('should display the order number', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('Número de pedido')).toBeInTheDocument()
        expect(screen.getByText('ORD-1762433263-TEST')).toBeInTheDocument()
      })
    })

    it('should show success message', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(
          screen.getByText('Tu pago se ha procesado correctamente')
        ).toBeInTheDocument()
        expect(
          screen.getByText(/Recibirás un correo electrónico/)
        ).toBeInTheDocument()
      })
    })

    it('should render action buttons', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('Continuar Comprando')).toBeInTheDocument()
        expect(screen.getByText('Volver al Inicio')).toBeInTheDocument()
      })
    })

    it('should have correct links on buttons', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        const continueButton = screen
          .getByText('Continuar Comprando')
          .closest('a')
        const homeButton = screen.getByText('Volver al Inicio').closest('a')

        expect(continueButton).toHaveAttribute('href', '/tienda')
        expect(homeButton).toHaveAttribute('href', '/')
      })
    })

    it('should render check icon', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        // Buscar el SVG del check en el div con bg-green-100
        const checkIcon = document.querySelector('.bg-green-100 svg')
        expect(checkIcon).toBeInTheDocument()
      })
    })

    it('should render success icon with green styling', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        const successDiv = document.querySelector('.bg-green-100')
        expect(successDiv).toBeInTheDocument()
        expect(successDiv).toHaveClass('rounded-full')
      })
    })
  })

  describe('Protección de ruta sin orderId', () => {
    beforeEach(() => {
      mockSearchParams.get.mockReturnValue(null)
    })

    it('should redirect to home when no orderId', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('should not render content when orderId is missing', () => {
      render(<OrderConfirmationPage />)

      // Solo debería mostrar loading spinner, no el contenido
      expect(screen.queryByText('Pedido Confirmado')).not.toBeInTheDocument()
    })

    it('should log warning when accessed without orderId', async () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Acceso directo a order-confirmation sin orderId'
          )
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Loading state', () => {
    it('should show loading spinner when orderId is not set', () => {
      // Mockear sin orderId para forzar estado de loading
      mockSearchParams.get.mockReturnValue(null)

      render(<OrderConfirmationPage />)

      // El spinner aparece mientras valida
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should hide loading after validation', async () => {
      mockSearchParams.get.mockReturnValue('ORD-TEST')

      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('Pedido Confirmado')).toBeInTheDocument()
      })

      // El spinner ya no debe estar
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).not.toBeInTheDocument()
    })

    it('should transition from loading to content', async () => {
      mockSearchParams.get.mockReturnValue('ORD-TEST')

      render(<OrderConfirmationPage />)

      // Inicialmente puede o no tener spinner (depende de timing)
      // pero eventualmente debe mostrar el contenido
      await waitFor(() => {
        expect(screen.getByText('Pedido Confirmado')).toBeInTheDocument()
      })

      // Verificar que el contenido completo está renderizado
      expect(screen.getByText('Número de pedido')).toBeInTheDocument()
      expect(screen.getByText('ORD-TEST')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle very long order IDs', async () => {
      const longOrderId = 'ORD-' + '1'.repeat(50)
      mockSearchParams.get.mockReturnValue(longOrderId)

      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText(longOrderId)).toBeInTheDocument()
      })
    })

    it('should handle order IDs with special characters', async () => {
      mockSearchParams.get.mockReturnValue('ORD-1762433263-A1B2')

      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('ORD-1762433263-A1B2')).toBeInTheDocument()
      })
    })

    it('should render correctly on mobile viewport', async () => {
      mockSearchParams.get.mockReturnValue('ORD-TEST')

      // Simular viewport mobile
      global.innerWidth = 375

      render(<OrderConfirmationPage />)

      await waitFor(() => {
        expect(screen.getByText('Pedido Confirmado')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockSearchParams.get.mockReturnValue('ORD-TEST')
    })

    it('should have proper heading hierarchy', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('Pedido Confirmado')
      })
    })

    it('should have accessible button text', async () => {
      render(<OrderConfirmationPage />)

      await waitFor(() => {
        const continueButton = screen.getByText('Continuar Comprando')
        const homeButton = screen.getByText('Volver al Inicio')

        expect(continueButton).toBeVisible()
        expect(homeButton).toBeVisible()
      })
    })
  })
})
