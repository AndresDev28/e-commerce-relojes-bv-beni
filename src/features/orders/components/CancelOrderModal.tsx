'use client'

import { useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { requestOrderCancellation } from '@/features/orders'

interface CancelOrderModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onSuccess: () => void
}

export default function CancelOrderModal({
  isOpen,
  onClose,
  orderId,
  onSuccess,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      setError('Por favor, proporciona un motivo para la cancelación.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await requestOrderCancellation({ orderId, reason: reason.trim() })

      setReason('')
      onSuccess()
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Error al conectar con el servidor.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setReason('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Solicitar cancelación del pedido ${orderId}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-neutral font-serif mb-4">
            Lamentamos saber que deseas cancelar tu pedido. Por favor,
            indícanos el motivo para ayudarnos a mejorar.
          </p>

          <label
            htmlFor="cancellationReason"
            className="block text-sm font-semibold font-sans text-neutral-dark mb-1"
          >
            Motivo de la cancelación <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cancellationReason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Ej: He cambiado de opinión, me he equivocado de producto..."
            className={`w-full p-3 border rounded-md font-serif text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
              error
                ? 'border-red-500 focus:ring-red-500/50'
                : 'border-neutral-light'
            }`}
            disabled={isSubmitting}
            required
          />
          {error && (
            <p className="text-red-600 text-sm mt-1 font-serif">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-light mt-6">
          <Button
            type="button"
            variant="tertiary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Volver
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar cancelación'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
