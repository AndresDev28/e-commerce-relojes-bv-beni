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
import { OrderStatus, type StatusHistoryItem } from '@/types'

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
      status: OrderStatus.PENDING,
      date: '2025-11-20T10:00:00Z',
      description: 'Order created',
    },
    {
      status: OrderStatus.PAID,
      date: '2025-11-20T10:05:00Z',
      description: 'Payment confirmed',
    },
    {
      status: OrderStatus.PROCESSING,
      date: '2025-11-20T14:00:00Z',
      description: 'Order being prepared',
    },
  ]

  describe('Basic Rendering', () => {
    it('renders timeline title', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PENDING} />)

      expect(screen.getByText('Estado del Pedido')).toBeInTheDocument()
    })

    it('renders all 5 order states', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PENDING} />)

      expect(screen.getByText('Pago Pendiente')).toBeInTheDocument()
      expect(screen.getByText('Pago Confirmado')).toBeInTheDocument()
      expect(screen.getByText('En Preparación')).toBeInTheDocument()
      expect(screen.getByText('Enviado')).toBeInTheDocument()
      expect(screen.getByText('Entregado')).toBeInTheDocument()
    })
  })

  describe('Status Icons', () => {
    it('shows check icon for completed states', () => {
      render(
        <OrderTimeline
          currentStatus={OrderStatus.PROCESSING}
          statusHistory={mockStatusHistory}
        />
      )

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check icons for: pending, paid, processing
      expect(checkIcons.length).toBeGreaterThanOrEqual(3)
    })

    it('shows clock icon for pending states', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PENDING} />)

      const clockIcons = screen.getAllByTestId('clock-icon')
      // Should have clock icons for: paid, processing, shipped, delivered
      expect(clockIcons.length).toBeGreaterThanOrEqual(4)
    })

    it('shows current state indicator for non-completed current state', () => {
      // For a current state that is NOT in the history, it should show "Estado actual"
      render(
        <OrderTimeline
          currentStatus={OrderStatus.PROCESSING}
          statusHistory={[
            { status: OrderStatus.PENDING, date: '2025-11-20T10:00:00Z' },
            { status: OrderStatus.PAID, date: '2025-11-20T10:05:00Z' },
          ]}
        />
      )

      expect(screen.getByText('Estado actual')).toBeInTheDocument()
    })

    it('does not show current state indicator when state is in history', () => {
      // When the current state is already in the history (completed), don't show "Estado actual"
      render(
        <OrderTimeline
          currentStatus={OrderStatus.PROCESSING}
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
          currentStatus={OrderStatus.PROCESSING}
          statusHistory={mockStatusHistory}
        />
      )

      // Should display formatted dates (Spanish locale)
      // Format: "20 nov 2025, 10:00" or "20 nov. 2025, 10:00"
      const dates = screen.getAllByText(/20 nov/)
      expect(dates.length).toBeGreaterThan(0)
    })

    it('does not display dates for pending states', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PENDING} />)

      // Only "pending" has a date, others don't
      const dateTexts = screen.queryAllByText(/nov\. 2025/)
      expect(dateTexts.length).toBe(0) // No dates if no status history
    })
  })

  describe('Status Progression', () => {
    it('marks states as completed up to current status (without history)', () => {
      // Without history, only states BEFORE current are marked as completed
      render(<OrderTimeline currentStatus={OrderStatus.SHIPPED} />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check for: pending, paid, processing (3 total, not including shipped)
      expect(checkIcons.length).toBe(3)
    })

    it('marks only states before current as completed (without history)', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PAID} />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // Should have check for: pending only (paid is current, not completed)
      expect(checkIcons.length).toBe(1)
    })

    it('shows all states as pending/current when current is pending', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PENDING} />)

      const checkIcons = screen.queryAllByTestId('check-icon')
      const clockIcons = screen.getAllByTestId('clock-icon')

      // No states are completed (pending is current)
      expect(checkIcons.length).toBe(0)
      // All should have clock (1 current + 4 future)
      expect(clockIcons.length).toBe(5)
    })

    it('shows all states as completed when delivered (without history)', () => {
      render(<OrderTimeline currentStatus={OrderStatus.DELIVERED} />)

      const checkIcons = screen.getAllByTestId('check-icon')
      // All states before delivered should be checked (pending, paid, processing, shipped)
      expect(checkIcons.length).toBe(4)
    })
  })

  describe('Error States', () => {
    it('displays cancelled message when order is cancelled', () => {
      render(<OrderTimeline currentStatus={OrderStatus.CANCELLED} />)

      expect(screen.getByText('Pedido cancelado')).toBeInTheDocument()
    })

    it('displays refunded message when order is refunded', () => {
      render(<OrderTimeline currentStatus={OrderStatus.REFUNDED} />)

      expect(screen.getByText('Dinero devuelto')).toBeInTheDocument()
    })

    it('does not display error message for normal states', () => {
      render(<OrderTimeline currentStatus={OrderStatus.DELIVERED} />)

      expect(
        screen.queryByText(/cancelado|reembolsado|devuelto/)
      ).not.toBeInTheDocument()
    })
  })

  describe('Status History Integration', () => {
    it('uses status history dates when available', () => {
      render(
        <OrderTimeline
          currentStatus={OrderStatus.PROCESSING}
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
          currentStatus={OrderStatus.SHIPPED}
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
      render(
        <OrderTimeline currentStatus={OrderStatus.PAID} statusHistory={[]} />
      )

      // Should still render timeline
      expect(screen.getByText('Pago Pendiente')).toBeInTheDocument()
      expect(screen.getByText('Pago Confirmado')).toBeInTheDocument()
    })

    it('handles unknown status gracefully', () => {
      render(<OrderTimeline currentStatus={'unknown' as OrderStatus} />)

      // Should still render all states
      expect(screen.getByText('Pago Pendiente')).toBeInTheDocument()
      expect(screen.getByText('Entregado')).toBeInTheDocument()
    })

    it('handles partial status history', () => {
      const partialHistory: StatusHistoryItem[] = [
        {
          status: OrderStatus.PENDING,
          date: '2025-11-20T10:00:00Z',
        },
      ]

      render(
        <OrderTimeline
          currentStatus={OrderStatus.PAID}
          statusHistory={partialHistory}
        />
      )

      // Should render without errors
      expect(screen.getByText('Pago Pendiente')).toBeInTheDocument()
      const dates = screen.getAllByText(/20 nov/)
      expect(dates.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Accessibility', () => {
    it('provides aria-labels for icons', () => {
      render(<OrderTimeline currentStatus={OrderStatus.PROCESSING} />)

      const checkIcons = screen.getAllByLabelText('Completado')
      const clockIcons = screen.getAllByLabelText('Pendiente')

      expect(checkIcons.length).toBeGreaterThan(0)
      expect(clockIcons.length).toBeGreaterThan(0)
    })

    it('uses semantic HTML for timeline structure', () => {
      const { container } = render(
        <OrderTimeline currentStatus={OrderStatus.PAID} />
      )

      // Should have proper heading
      const heading = container.querySelector('h3')
      expect(heading).toBeInTheDocument()
      expect(heading?.textContent).toBe('Estado del Pedido')
    })
  })
})
