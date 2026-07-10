import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderDetail from '../OrderDetail'
import type { OrderData } from '@/lib/api/orders'
import { OrderStatus } from '@/types'

interface MockImageProps {
    src: string
    alt: string
    [key: string]: unknown
}

interface MockLinkProps {
    href: string
    children: React.ReactNode
    [key: string]: unknown
}

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, email: 'test@test.com' },
        isLoading: false,
    }),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/image', () => ({
    default: ({ src, alt, ...props }: MockImageProps) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={alt} {...props} />
    },
}))

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }: MockLinkProps) => {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        )
    },
}))

vi.mock('react-icons/bs', () => ({
    BsArrowLeft: () => <svg data-testid="arrow-left-icon" />,
    BsCreditCard: () => <svg data-testid="credit-card-icon" />,
    BsClock: () => <svg data-testid="clock-icon" />,
    BsX: () => <svg data-testid="close-icon" />,
    BsCheckCircleFill: () => <svg data-testid="check-circle-icon" />,
}))

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
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { reload: vi.fn() }
        })
    })

    it('completes the full cancellation request flow successfully', async () => {
        ; (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })

        const user = userEvent.setup()
        render(<OrderDetail order={mockOrder} />)

        const openModalButton = screen.getByRole('button', { name: /solicitar cancelación/i })
        expect(openModalButton).toBeInTheDocument()
        expect(screen.queryByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).not.toBeInTheDocument()

        await user.click(openModalButton)

        expect(screen.getByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).toBeInTheDocument()

        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        const submitButton = screen.getByRole('button', { name: 'Confirmar cancelación' })

        expect(textarea).toBeInTheDocument()
        expect(submitButton).toBeInTheDocument()
        expect(submitButton).toBeDisabled()

        await user.type(textarea, 'Encontré el mismo reloj más barato en otra tienda.')
        expect(submitButton).not.toBeDisabled()

        await user.click(submitButton)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(global.fetch).toHaveBeenCalledWith(`/api/orders/${mockOrder.orderId}/request-cancellation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Trace-Id': expect.any(String),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ reason: 'Encontré el mismo reloj más barato en otra tienda.' }),
            })
        })

        await waitFor(() => {
            expect(window.location.reload).toHaveBeenCalledTimes(1)
        })
    })

    it('allows closing the modal without submitting', async () => {
        const user = userEvent.setup()
        render(<OrderDetail order={mockOrder} />)

        const openModalButton = screen.getByRole('button', { name: /solicitar cancelación/i })
        await user.click(openModalButton)

        expect(screen.getByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).toBeInTheDocument()

        const closeButton = screen.getByRole('button', { name: 'Volver' })
        await user.click(closeButton)

        await waitFor(() => {
            expect(screen.queryByText(`Solicitar cancelación del pedido ${mockOrder.orderId}`)).not.toBeInTheDocument()
        })
    })
})
