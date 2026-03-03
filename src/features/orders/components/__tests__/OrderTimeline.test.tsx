import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderTimeline from '../OrderTimeline'
import { OrderStatus } from '@/types'

const MOCK_HISTORY = [
  { status: OrderStatus.PENDING, date: '2025-11-20T10:00:00Z', adminId: 1 },
  { status: OrderStatus.PAID, date: '2025-11-20T10:05:00Z', adminId: 1 },
  { status: OrderStatus.PROCESSING, date: '2025-11-21T09:00:00Z', adminId: 1 }
]

describe('OrderTimeline Component', () => {
  it('should render all expected statuses in the timeline', () => {
    render(<OrderTimeline currentStatus={OrderStatus.PROCESSING} statusHistory={MOCK_HISTORY} />)

    expect(screen.getByText('Pago Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Pago Confirmado')).toBeInTheDocument()
    expect(screen.getByText('En Preparación')).toBeInTheDocument()
    expect(screen.getByText('Enviado')).toBeInTheDocument()
    expect(screen.getByText('Entregado')).toBeInTheDocument()
  })

  it('should show "Estado actual" badge on the current status', () => {
    render(<OrderTimeline currentStatus={OrderStatus.PROCESSING} statusHistory={MOCK_HISTORY} />)

    // PENDING and PAID are completed, PROCESSING is current (but completed in history too, 
    // in our implementation isCompleted returns true if it's in history, and isCurrent returns true 
    // if status === currentStatus. The badge "Estado actual" is shown when current && !completed.
    // If it's in history, it's considered completed. Let's test with a status NOT in history yet.)

    const historyWithoutProcessing = MOCK_HISTORY.slice(0, 2)
    render(<OrderTimeline currentStatus={OrderStatus.PROCESSING} statusHistory={historyWithoutProcessing} />)

    // Now PROCESSING is current but not in history
    expect(screen.getAllByText('Estado actual')).toHaveLength(1)
  })

  it('should render tracking info and external link when status is SHIPPED with shipment data', () => {
    const shipmentData = {
      tracking_number: 'ES202612345',
      carrier: 'SEUR',
      status: 'shipped',
      shipped_at: '2026-03-01T10:00:00Z',
      estimated_delivery_date: '2026-03-05T10:00:00Z'
    } as any;

    const historyWithShipped = [
      ...MOCK_HISTORY,
      { status: OrderStatus.SHIPPED, date: '2026-03-01T10:00:00Z', adminId: 1 }
    ]

    render(<OrderTimeline
      currentStatus={OrderStatus.SHIPPED}
      statusHistory={historyWithShipped}
      shipment={shipmentData}
    />)

    expect(screen.getByText('Información de Seguimiento')).toBeInTheDocument()
    expect(screen.getByText('ES202612345')).toBeInTheDocument()
    expect(screen.getByText('SEUR')).toBeInTheDocument()

    // Tracking Link should be generated
    const link = screen.getByRole('link', { name: /Rastrear tu paquete/i })
    expect(link).toHaveAttribute('href', 'https://www.seur.com/livetracking/?segOnlineIdentificationNumber=ES202612345')
  })
})
