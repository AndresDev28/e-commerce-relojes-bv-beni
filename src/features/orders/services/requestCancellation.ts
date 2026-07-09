import { newTraceId } from '@/lib/trace'

interface CancelOrderInput {
  orderId: string
  reason: string
}

export async function requestOrderCancellation(
  input: CancelOrderInput
): Promise<void> {
  const { orderId, reason } = input

  const response = await fetch(`/api/orders/${orderId}/request-cancellation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': newTraceId(),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ reason }),
  })

  if (!response.ok) {
    let errorMessage = 'Error al enviar la solicitud de cancelación.'
    try {
      const errorData = await response.json()
      if (errorData.message) errorMessage = errorData.message
      if (errorData.error) errorMessage = errorData.error
    } catch {
      // Ignorar si no es JSON válido
    }
    throw new Error(errorMessage)
  }
}
