import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderDetail from '../OrderDetail'
import type { OrderData } from '@/lib/api/orders'
import { OrderStatus } from '@/types'

/**
 * [FRONT-04] Integration Tests: OrderDetail + CancelOrderModal
 *
 * This test suite verifies the end-to-end user interaction in the frontend:
 * 1. Clicking the "Solicitar cancelación" button in OrderDetail.
 * 2. Opening the CancelOrderModal.
 * 3. Validating the reason input.
 * 4. Submitting the cancellation request.
 * 5. Handling the success response (closing modal and reloading).
 */

// We specifically DO NOT mock CancelOrderModal here because we want to test the integration.
// But we still need to mock AuthContext, next/navigation, next/image, next/link like in OrderDetail.test.tsx

// Mock useAuth
const mockJwt = 'fake-jwt-token'
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        jwt: mockJwt,
        isAuthenticated: true,
    }),
}))

// Mock Next.js Navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
    default: ({ src, alt, ...props }: any) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt} {...props} />
    },
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: any) => {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        )
    },
}))

// Mock react-icons (all icons used by OrderDetail + OrderTimeline)
vi.mock('react-icons/bs', () => ({
    BsArrowLeft: () => <svg data-testid="arrow-left-icon" />,
    BsCreditCard: () => <svg data-testid="credit-card-icon" />,
    BsClock: () => <svg data-testid="clock-icon" />,
    BsX: () => <svg data-testid="close-icon" />,
    BsCheckCircleFill: () => <svg data-testid="check-circle-icon" />,
}))

// Helper mock data
const mockOrder: OrderData = {
    id: 1,
    documentId: 'doc-123',
    orderId: 'ORD-TEST-CANCEL-1',
    items: [
        {
            id: 'prod-1',
            name: 'Reloj de Prueba',
            description: 'Una discreta genialidad de descripción para este hermoso reloj suizo sin marca visible pero con corazón valiente.',
            price: 100,
            quantity: 1,
            images: ['/test.jpg'],
            href: '/tienda/reloj-prueba',
            stock: 5,
        }
    ],
    subtotal: 100,
    shipping: 0,
    total: 100,
    orderStatus: OrderStatus.PAID,
    createdAt: '2025-11-20T10:30:00Z',
    updatedAt: '2025-11-20T10:30:00Z',
    publishedAt: '2025-11-20T10:30:00Z',
}

describe('[FRONT-04] Request Cancellation Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.fetch = vi.fn()
        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { reload: vi.fn() }
        })
    })

    it('completes the full cancellation request flow successfully', async () => {
        // Setup fetch mock for a successful response
        ; (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })

        const user = userEvent.setup()
        render(<OrderDetail order={mockOrder} />)

        // 1. Initial State: Button should be visible, modal should be closed
        const openModalButton = screen.getByRole('button', { name: /solicitar cancelación/i })
        expect(openModalButton).toBeInTheDocument()
        // The modal portal/dialog itself doesn't exist yet, we check for its title or content
        expect(screen.queryByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).not.toBeInTheDocument()

        // 2. Open the Modal
        await user.click(openModalButton)

        // Modal is now open
        expect(screen.getByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).toBeInTheDocument()

        // Check elements inside the modal
        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        const submitButton = screen.getByRole('button', { name: 'Confirmar cancelación' })

        expect(textarea).toBeInTheDocument()
        expect(submitButton).toBeInTheDocument()
        expect(submitButton).toBeDisabled() // Disabled because reason is empty

        // 3. Type a reason and submit
        await user.type(textarea, 'Encontré el mismo reloj más barato en otra tienda.')
        expect(submitButton).not.toBeDisabled()

        await user.click(submitButton)

        // 4. Verify API call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(global.fetch).toHaveBeenCalledWith(`/api/orders/${mockOrder.orderId}/request-cancellation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${mockJwt}`,
                },
                body: JSON.stringify({ reason: 'Encontré el mismo reloj más barato en otra tienda.' }),
            })
        })

        // 5. Verify the modal closes and the page reloads (simulating state update)
        await waitFor(() => {
            expect(window.location.reload).toHaveBeenCalledTimes(1)
            // Since it's an integration test and the modal only closes visually in the virtual DOM
            // after the state update fires, we check the reload call instead which happens inside onSuccess.
        })
    })

    it('allows closing the modal without submitting', async () => {
        const user = userEvent.setup()
        render(<OrderDetail order={mockOrder} />)

        const openModalButton = screen.getByRole('button', { name: /solicitar cancelación/i })
        await user.click(openModalButton)

        expect(screen.getByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).toBeInTheDocument()

        // Find the modal's close button (exact match to avoid matching "Volver a mis pedidos")
        const closeButton = screen.getByRole('button', { name: 'Volver' })
        await user.click(closeButton)

        // Wait for the modal element to be removed or hidden
        await waitFor(() => {
            expect(screen.queryByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).not.toBeInTheDocument()
        })
    })
})
