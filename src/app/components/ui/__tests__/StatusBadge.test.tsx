/**
 * [ORD-06] StatusBadge Component - Unit Tests
 *
 * Tests para el componente StatusBadge que muestra badges de estado
 * con colores distintivos según el estado del pedido.
 *
 * COBERTURA:
 * ✓ Renderizado de todos los estados válidos
 * ✓ Colores correctos según estado
 * ✓ Textos traducidos (inglés → español)
 * ✓ Manejo de estados desconocidos (fallback)
 * ✓ Accesibilidad básica
 */

import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'

describe('StatusBadge Component', () => {
  /**
   * TEST 1: Renderizado básico
   * Verifica que el componente renderiza correctamente con un estado válido
   */
  describe('Renderizado básico', () => {
    it('should render the badge with correct text for "pending" status', () => {
      render(<StatusBadge status="pending" />)
      const badge = screen.getByText('Pendiente')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "paid" status', () => {
      render(<StatusBadge status="paid" />)
      const badge = screen.getByText('Pagado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "processing" status', () => {
      render(<StatusBadge status="processing" />)
      const badge = screen.getByText(/en preparación/i)
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "shipped" status', () => {
      render(<StatusBadge status="shipped" />)
      const badge = screen.getByText('Enviado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "delivered" status', () => {
      render(<StatusBadge status="delivered" />)
      const badge = screen.getByText('Entregado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "cancelled" status', () => {
      render(<StatusBadge status="cancelled" />)
      const badge = screen.getByText('Cancelado')
      expect(badge).toBeInTheDocument()
    })

    it('should render the badge with correct text for "refunded" status', () => {
      render(<StatusBadge status="refunded" />)
      const badge = screen.getByText('Reembolsado')
      expect(badge).toBeInTheDocument()
    })
  })

  /**
   * TEST 2: Colores correctos
   * Verifica que cada estado aplica la clase CSS correcta
   */
  describe('Colores según estado', () => {
    it('should apply gray background for "pending" status', () => {
      render(<StatusBadge status="pending" />)
      const badge = screen.getByText('Pendiente')
      expect(badge).toHaveClass('bg-gray-500')
    })

    it('should apply blue background for "paid" status', () => {
      render(<StatusBadge status="paid" />)
      const badge = screen.getByText('Pagado')
      expect(badge).toHaveClass('bg-blue-500')
    })

    it('should apply yellow-700 background for "processing" status (WCAG AA compliant)', () => {
      render(<StatusBadge status="processing" />)
      const badge = screen.getByText(/en preparación/i)
      expect(badge).toHaveClass('bg-yellow-700')
    })

    it('should apply orange-600 background for "shipped" status (WCAG AA compliant)', () => {
      render(<StatusBadge status="shipped" />)
      const badge = screen.getByText('Enviado')
      expect(badge).toHaveClass('bg-orange-600')
    })

    it('should apply green-600 background for "delivered" status (WCAG AA compliant)', () => {
      render(<StatusBadge status="delivered" />)
      const badge = screen.getByText('Entregado')
      expect(badge).toHaveClass('bg-green-600')
    })

    it('should apply red-600 background for "cancelled" status (WCAG AA compliant)', () => {
      render(<StatusBadge status="cancelled" />)
      const badge = screen.getByText('Cancelado')
      expect(badge).toHaveClass('bg-red-600')
    })

    it('should apply purple background for "refunded" status', () => {
      render(<StatusBadge status="refunded" />)
      const badge = screen.getByText('Reembolsado')
      expect(badge).toHaveClass('bg-purple-500')
    })
  })

  /**
   * TEST 3: Estados desconocidos (fallback)
   * Verifica que el componente maneja correctamente estados no definidos
   */
  describe('Manejo de estados desconocidos', () => {
    it('should render unknown status as-is with default gray color', () => {
      render(<StatusBadge status="unknown_status" />)
      const badge = screen.getByText('unknown_status')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-gray-500') // Fallback color
    })

    it('should handle empty string status', () => {
      render(<StatusBadge status="" />)
      const badge = screen.getByRole('status')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-gray-500') // Fallback color
    })
  })

  /**
   * TEST 4: Estructura y clases CSS
   * Verifica que el badge tiene la estructura correcta
   */
  describe('Estructura y estilos', () => {
    it('should have correct base CSS classes', () => {
      render(<StatusBadge status="pending" />)
      const badge = screen.getByText('Pendiente')

      // Clases base que debe tener todo badge
      expect(badge).toHaveClass('inline-block')
      expect(badge).toHaveClass('px-4')
      expect(badge).toHaveClass('py-2')
      expect(badge).toHaveClass('rounded-full')
      expect(badge).toHaveClass('text-white')
      expect(badge).toHaveClass('text-sm')
      expect(badge).toHaveClass('font-sans')
    })

    it('should render as a span element', () => {
      render(<StatusBadge status="pending" />)
      const badge = screen.getByText('Pendiente')
      expect(badge.tagName).toBe('SPAN')
    })
  })

  /**
   * TEST 5: Accesibilidad
   * Verifica que el componente tiene contraste suficiente
   */
  describe('Accesibilidad', () => {
    it('should have white text color for all status badges', () => {
      const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

      statuses.forEach(status => {
        const { unmount } = render(<StatusBadge status={status} />)
        const badge = screen.getByRole('status', { hidden: true }) || document.querySelector('span')
        expect(badge).toHaveClass('text-white')
        unmount()
      })
    })

    it('should have role="status" for screen readers', () => {
      render(<StatusBadge status="delivered" />)
      const badge = screen.getByRole('status')
      expect(badge).toBeInTheDocument()
    })
  })

  /**
   * TEST 6: Props y tipos
   * Verifica que el componente acepta las props correctas
   */
  describe('Props', () => {
    it('should accept status prop as string', () => {
      // Si el componente no acepta status prop, este test fallará
      expect(() => render(<StatusBadge status="pending" />)).not.toThrow()
    })
  })
})
