import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CancelOrderModal from '../CancelOrderModal'

// Mock Modal component
vi.mock('@/app/components/ui/Modal', () => {
    return {
        default: ({ isOpen, children, title }: any) => {
            if (!isOpen) return null
            return (
                <div data-testid="mock-modal">
                    <h2>{title}</h2>
                    {children}
                </div>
            )
        },
    }
})

// Mock useAuth
const mockJwt = 'fake-jwt-token'
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        jwt: mockJwt,
    }),
}))

describe('CancelOrderModal Component', () => {
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()
    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        orderId: 'ORD-123',
        onSuccess: mockOnSuccess,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        global.fetch = vi.fn()
    })

    it('renders correctly when open', () => {
        render(<CancelOrderModal {...defaultProps} />)

        expect(screen.getByTestId('mock-modal')).toBeInTheDocument()
        expect(screen.getByText('Solicitar cancelación del pedido ORD-123')).toBeInTheDocument()
        expect(screen.getByLabelText(/Motivo de la cancelación/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Confirmar cancelación/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Volver/i })).toBeInTheDocument()
    })

    it('does not render when closed', () => {
        render(<CancelOrderModal {...defaultProps} isOpen={false} />)

        expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument()
    })

    it('calls onClose when Cancel button is clicked', async () => {
        const user = userEvent.setup()
        render(<CancelOrderModal {...defaultProps} />)

        const cancelButton = screen.getByRole('button', { name: /Volver/i })
        await user.click(cancelButton)

        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('disables submit button when reason is empty', () => {
        render(<CancelOrderModal {...defaultProps} />)

        const submitButton = screen.getByRole('button', { name: /Confirmar cancelación/i })
        expect(submitButton).toBeDisabled()
    })

    it('enables submit button when reason is provided', async () => {
        const user = userEvent.setup()
        render(<CancelOrderModal {...defaultProps} />)

        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        await user.type(textarea, 'Quiero cancelar mi pedido porque me equivoqué de reloj.')

        const submitButton = screen.getByRole('button', { name: /Confirmar cancelación/i })
        expect(submitButton).not.toBeDisabled()
    })

    it('submits correctly and calls onSuccess', async () => {
        // Mock successful API response
        ; (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        })

        const user = userEvent.setup()
        render(<CancelOrderModal {...defaultProps} />)

        // Type reason
        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        await user.type(textarea, 'Error en el color')

        // Click submit
        const submitButton = screen.getByRole('button', { name: /Confirmar cancelación/i })
        await user.click(submitButton)

        // verify fetch was called with correct arguments
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/orders/ORD-123/request-cancellation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${mockJwt}`,
                },
                body: JSON.stringify({ reason: 'Error en el color' }),
            })
        })

        // verify onSuccess was called
        await waitFor(() => {
            expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        })
    })

    it('displays error message when API fails', async () => {
        // Mock failed API response
        ; (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'El pedido ya no se puede cancelar' }),
        })

        const user = userEvent.setup()
        render(<CancelOrderModal {...defaultProps} />)

        // Type reason
        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        await user.type(textarea, 'Ya no lo quiero')

        // Click submit
        const submitButton = screen.getByRole('button', { name: /Confirmar cancelación/i })
        await user.click(submitButton)

        // Wait for the error to appear
        await waitFor(() => {
            expect(screen.getByText('El pedido ya no se puede cancelar')).toBeInTheDocument()
        })

        // onSuccess should NOT have been called
        expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('clears error when typing again', async () => {
        // Mock failed API response
        ; (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Error de servidor' }),
        })

        const user = userEvent.setup()
        render(<CancelOrderModal {...defaultProps} />)

        const textarea = screen.getByLabelText(/Motivo de la cancelación/i)
        await user.type(textarea, 'Fail test')

        const submitButton = screen.getByRole('button', { name: /Confirmar cancelación/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(screen.getByText('Error de servidor')).toBeInTheDocument()
        })

        // Type again should clear the error
        await user.type(textarea, ' changes')
        expect(screen.queryByText('Error de servidor')).not.toBeInTheDocument()
    })
})
