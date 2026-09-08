/**
 * Pure friendly-error mapper for the checkout UPSERT path
 * (design A-3/A-9, spec checkout-error-display S-MOD.1–S-MOD.5).
 *
 * Single translation point for backend 400/403/409 envelopes produced by
 * `upsertOrderService` (obs #1793 shapes). Output is a plain Spanish string
 * consumed verbatim by `useCreateOrder` into the existing `orderError`
 * banner — no second banner, no DOM/role changes (S-MOD.6/7, PR2 scope).
 *
 * Constraints (A-9): never expose raw codes/English, never echo another
 * user's identifier, and never suggest retry-by-replay on 409.
 */

interface MapperContext {
  paymentIntentId?: string
}

const COPY = {
  default400:
    'No pudimos validar los datos de tu pedido. Recarga la página e inténtalo de nuevo.',
  items400:
    'Tu pedido no incluye productos válidos. Revisa tu carrito e inténtalo de nuevo.',
  amounts400:
    'Los importes del pedido no son válidos. Recarga la página e inténtalo de nuevo.',
  userId400:
    'No pudimos confirmar tu sesión. Inicia sesión de nuevo para registrar tu pedido.',
  forbidden403:
    'Este pedido pertenece a otra cuenta o sesión. Inicia sesión con la cuenta correcta; si el problema persiste, contacta a soporte.',
  conflictPiMismatch: (pi?: string) =>
    pi
      ? `Tu pedido ya está registrado con un pago distinto. No vuelvas a pagar: contacta a soporte con tu ID de pago ${pi} para conciliarlo.`
      : 'Tu pedido ya está registrado con un pago distinto. No vuelvas a pagar: contacta a soporte para conciliarlo.',
  conflictTerminal:
    'Tu pedido ya fue cancelado o reembolsado y no puede modificarse. Contacta a soporte si crees que es un error.',
  conflictGeneric: (pi?: string) =>
    pi
      ? `Tu pedido ya está registrado o en proceso. Para tu seguridad no lo duplicamos: revisa Mis Pedidos y, si no aparece, contacta a soporte con tu ID de pago ${pi}.`
      : 'Tu pedido ya está registrado o en proceso. Para tu seguridad no lo duplicamos: revisa Mis Pedidos y, si no aparece, contacta a soporte.',
  // Unknown-failure fallback: preserves the existing hook support copy (S3.6).
  fallback: (pi?: string) =>
    pi
      ? `Tu pago fue procesado, pero hubo un problema al registrar tu pedido. Por favor, contacta con soporte indicando tu ID de pago: ${pi}`
      : 'Tu pago fue procesado, pero hubo un problema al registrar tu pedido. Por favor, contacta con soporte.',
}

/**
 * Extract the backend message defensively: real nested envelope
 * `body.error.message` (obs #1793) with flat `{ error: string }` fallback
 * (spec S-MOD.1 illustrative shape). Returns '' when neither matches.
 */
function extractBackendMessage(body: unknown): string {
  if (typeof body !== 'object' || body === null) return ''
  const error = (body as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

function map400(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('userid')) return COPY.userId400
  if (lower.includes('items')) return COPY.items400
  if (lower.includes('subtotal') || lower.includes('shipping')) return COPY.amounts400
  return COPY.default400
}

function map409(message: string, paymentIntentId?: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('paymentintentid')) return COPY.conflictPiMismatch(paymentIntentId)
  if (lower.includes('terminal') || lower.includes('cannot be modified')) {
    return COPY.conflictTerminal
  }
  return COPY.conflictGeneric(paymentIntentId)
}

/**
 * Map a bounded UPSERT failure to friendly Spanish UI copy.
 * Pure: no I/O, no mutation of inputs, identical output for identical input.
 */
export function checkoutOrderErrors(
  status: number,
  body: unknown,
  context?: MapperContext
): string {
  const message = extractBackendMessage(body)

  switch (status) {
    case 400:
      return map400(message)
    case 403:
      // Single ownership string — never echoes identifiers from the envelope.
      return COPY.forbidden403
    case 409:
      return map409(message, context?.paymentIntentId)
    default:
      return COPY.fallback(context?.paymentIntentId)
  }
}
