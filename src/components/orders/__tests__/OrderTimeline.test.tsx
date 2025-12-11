/**
 * [ORD-12] Tests for OrderTimeline Component
 *
 * Unit tests for the component that displays order status timeline.
 *
 * COVERAGE:
 * - Rendering of all order states
 * - Visual indication of completed, current, and pending states
 * - Date formatting and display
 * - Status history integration
 * - Error states (cancelled, refunded, failed)
 * - Timeline visual elements (icons, lines)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderTimeline from '../OrderTimeline'
import type { StatusHistoryItem } from '@/lib/api/orders'

// Mock react-icons
vi.mock('react-icons/bs', () => ({
  BsCheckCircleFill: ({ className, 'aria-label': ariaLabel }: { className: string; 'aria-label': string }) => (
    <svg data-testid="check-icon" className={className} aria-label={ariaLabel} />
  ),
  BsClock: ({ className, 'aria-label': ariaLabel }: { className: string; 'aria-label': string }) => (
    <svg data-testid="clock-icon" className={className} aria-label={ariaLabel} />
  ),
}))

describe('[ORD-12] OrderTimeline Component', () => {
  /**
   * Test data: Status history with multiple states
   */
  const mockStatusHistory: StatusHistoryItem[] = [
    {
      status: 'pending',
      date: '2025-11-20T10:00:00Z',
      description: 'Order created',
    },
    {
      status: 'paid',
      date: '2025-11-20T10:05:00Z',
      description: 'Payment confirmed',
    },
    {
      status: 'processing',
      date: '2025-11-20T14:00:00Z',
      description: 'Order being prepared',
    },
  ]

  describe('Basic Rendering', () => {
    it('renders timeline title', () => {
      render(<OrderTimeline currentStatus="pending" />)

      expect(screen.getByText('Estado del Pedido')).toBeInTheDocument()
    })

    it('renders all 5 order states', () => {
      render(<OrderTimeline currentStatus="pending" />)

      expect(screen.getByText('Pedido realizado')).toBeInTheDocument()
      expect(screen.getByText('Pago confirmado')).toBeInTheDocument()
      expect(screen.getByText('En preparación')).toBeInTheDocument()
      expect(screen.getByText('Enviado')).toBeInTheDocument()
      expect(screen.getByText('Entregado')).toBeInTheDocument()
    })
  })

  describe('Status Icons', () => {
    it('shows check icon for completed states', () => {
      render(
        <OrderTimeline
          currentStatus="processing"
          statusHistory={mockStatusHistory}
        />
      )

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check icons for: pending, paid, processing
      expect(checkIcons.length).toBeGreaterThanOrEqual(3)
    })

    it('shows clock icon for pending states', () => {
      render(<OrderTimeline currentStatus="pending" />)

      const clockIcons = screen.getAllByTestId('clock-icon')
      // Should have clock icons for: paid, processing, shipped, delivered
      expect(clockIcons.length).toBeGreaterThanOrEqual(4)
    })

    it('shows current state indicator for non-completed current state', () => {
      // For a current state that is NOT in the history, it should show "Estado actual"
      render(
        <OrderTimeline
          currentStatus="processing"
          statusHistory={[
            { status: 'pending', date: '2025-11-20T10:00:00Z' },
            { status: 'paid', date: '2025-11-20T10:05:00Z' },
          ]}
        />
      )

      expect(screen.getByText('Estado actual')).toBeInTheDocument()
    })

    it('does not show current state indicator when state is in history', () => {
      // When the current state is already in the history (completed), don't show "Estado actual"
      render(
        <OrderTimeline
          currentStatus="processing"
          statusHistory={mockStatusHistory} // includes processing
        />
      )

      expect(screen.queryByText('Estado actual')).not.toBeInTheDocument()
    })
  })

  describe('Date Display', () => {
    it('displays dates for completed states in status history', () => {
      render(
        <OrderTimeline
          currentStatus="processing"
          statusHistory={mockStatusHistory}
        />
      )

      // Should display formatted dates (Spanish locale)
      // Format: "20 nov 2025, 10:00" or "20 nov. 2025, 10:00"
      const dates = screen.getAllByText(/20 nov/)
      expect(dates.length).toBeGreaterThan(0)
    })

    it('does not display dates for pending states', () => {
      render(<OrderTimeline currentStatus="pending" />)

      // Only "pending" has a date, others don't
      const dateTexts = screen.queryAllByText(/nov\. 2025/)
      expect(dateTexts.length).toBe(0) // No dates if no status history
    })
  })

  describe('Status Progression', () => {
    it('marks states as completed up to current status (without history)', () => {
      // Without history, only states BEFORE current are marked as completed
      render(<OrderTimeline currentStatus="shipped" />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check for: pending, paid, processing (3 total, not including shipped)
      expect(checkIcons.length).toBe(3)
    })

    it('marks only states before current as completed (without history)', () => {
      render(<OrderTimeline currentStatus="paid" />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check for: pending only (paid is current, not completed)
      expect(checkIcons.length).toBe(1)
    })

    it('shows all states as pending/current when current is pending', () => {
      render(<OrderTimeline currentStatus="pending" />)

      const checkIcons = screen.queryAllByTestId('check-icon')
      const clockIcons = screen.getAllByTestId('clock-icon')

      // No states are completed (pending is current)
      expect(checkIcons.length).toBe(0)
      // All should have clock (1 current + 4 future)
      expect(clockIcons.length).toBe(5)
    })

    it('shows all states as completed when delivered (without history)', () => {
      render(<OrderTimeline currentStatus="delivered" />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // All states before delivered should be checked (pending, paid, processing, shipped)
      expect(checkIcons.length).toBe(4)
    })
  })

  describe('Error States', () => {
    it('displays cancelled message when order is cancelled', () => {
      render(<OrderTimeline currentStatus="cancelled" />)

      expect(
        screen.getByText('Este pedido ha sido cancelado')
      ).toBeInTheDocument()
    })

    it('displays refunded message when order is refunded', () => {
      render(<OrderTimeline currentStatus="refunded" />)

      expect(
        screen.getByText('Este pedido ha sido reembolsado')
      ).toBeInTheDocument()
    })

    it('displays failed message when order has failed', () => {
      render(<OrderTimeline currentStatus="failed" />)

      expect(screen.getByText('Este pedido ha fallado')).toBeInTheDocument()
    })

    it('does not display error message for normal states', () => {
      render(<OrderTimeline currentStatus="delivered" />)

      expect(
        screen.queryByText(/cancelado|reembolsado|fallado/)
      ).not.toBeInTheDocument()
    })
  })

  describe('Status History Integration', () => {
    it('uses status history dates when available', () => {
      render(
        <OrderTimeline
          currentStatus="processing"
          statusHistory={mockStatusHistory}
        />
      )

      // Should show dates from status history (format may vary: "nov" or "nov.")
      const dates = screen.getAllByText(/20 nov/)
      expect(dates.length).toBeGreaterThanOrEqual(3) // pending, paid, processing
    })

    it('marks states as completed if in status history', () => {
      render(
        <OrderTimeline
          currentStatus="shipped"
          statusHistory={mockStatusHistory}
        />
      )

      // All states in history should be marked as completed
      const checkIcons = screen.getAllByTestId('check-icon')
      expect(checkIcons.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty status history', () => {
      render(<OrderTimeline currentStatus="paid" statusHistory={[]} />)

      // Should still render timeline
      expect(screen.getByText('Pedido realizado')).toBeInTheDocument()
      expect(screen.getByText('Pago confirmado')).toBeInTheDocument()
    })

    it('handles unknown status gracefully', () => {
      render(<OrderTimeline currentStatus="unknown" />)

      // Should still render all states
      expect(screen.getByText('Pedido realizado')).toBeInTheDocument()
      expect(screen.getByText('Entregado')).toBeInTheDocument()
    })

    it('handles partial status history', () => {
      const partialHistory: StatusHistoryItem[] = [
        {
          status: 'pending',
          date: '2025-11-20T10:00:00Z',
        },
      ]

      render(
        <OrderTimeline currentStatus="paid" statusHistory={partialHistory} />
      )

      // Should render without errors
      expect(screen.getByText('Pedido realizado')).toBeInTheDocument()
      const dates = screen.getAllByText(/20 nov/)
      expect(dates.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Accessibility', () => {
    it('provides aria-labels for icons', () => {
      render(<OrderTimeline currentStatus="processing" />)

      const checkIcons = screen.getAllByLabelText('Completado')
      const clockIcons = screen.getAllByLabelText('Pendiente')

      expect(checkIcons.length).toBeGreaterThan(0)
      expect(clockIcons.length).toBeGreaterThan(0)
    })

    it('uses semantic HTML for timeline structure', () => {
      const { container } = render(<OrderTimeline currentStatus="paid" />)

      // Should have proper heading
      const heading = container.querySelector('h3')
      expect(heading).toBeInTheDocument()
      expect(heading?.textContent).toBe('Estado del Pedido')
    })
  })
})
