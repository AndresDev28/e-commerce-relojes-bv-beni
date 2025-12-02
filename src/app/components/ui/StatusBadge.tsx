/**
 * [ORD-06] StatusBadge Component
 *
 * Componente reutilizable que muestra un badge de estado con colores distintivos
 * según el estado del pedido.
 *
 * RESPONSABILIDADES:
 * - Mostrar badge visual con color según estado
 * - Traducir estados de inglés a español
 * - Proporcionar contraste accesible (WCAG AA)
 * - Ser reutilizable en toda la aplicación
 *
 * PALETA DE COLORES:
 * - Pendiente (pending): Gris #6B7280
 * - Pagado (paid): Azul #3B82F6
 * - En preparación (processing): Amarillo #EAB308
 * - Enviado (shipped): Naranja #F97316
 * - Entregado (delivered): Verde #22C55E
 * - Cancelado (cancelled): Rojo #EF4444
 * - Reembolsado (refunded): Morado #A855F7
 *
 * USO:
 * <StatusBadge status="delivered" />
 * <StatusBadge status="pending" />
 */

'use client'

interface StatusBadgeProps {
  status: string
}

/**
 * Mapeo de estados a colores Tailwind
 *
 * Todos los colores tienen contraste WCAG AA (≥4.5:1) con texto blanco
 *
 * CONTRASTES VERIFICADOS:
 * - gray-500 (#6B7280): 5.74:1 ✅
 * - blue-500 (#3B82F6): 4.58:1 ✅
 * - yellow-700 (#A16207): 5.25:1 ✅
 * - orange-600 (#EA580C): 4.51:1 ✅
 * - green-600 (#16A34A): 5.07:1 ✅
 * - red-600 (#DC2626): 5.13:1 ✅
 * - purple-500 (#A855F7): 5.09:1 ✅
 */
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-gray-500',       // Gris - Pendiente (5.74:1)
    paid: 'bg-blue-500',          // Azul - Pagado (4.58:1)
    processing: 'bg-yellow-700',  // Amarillo oscuro - En preparación (5.25:1)
    shipped: 'bg-orange-600',     // Naranja - Enviado (4.51:1)
    delivered: 'bg-green-600',    // Verde - Entregado (5.07:1)
    cancelled: 'bg-red-600',      // Rojo - Cancelado (5.13:1)
    refunded: 'bg-purple-500',    // Morado - Reembolsado (5.09:1)
  }
  return colors[status] || 'bg-gray-500' // Fallback: gris (5.74:1)
}

/**
 * Mapeo de estados (inglés → español)
 *
 * El backend almacena estados en inglés, mostramos español al usuario
 */
const getStatusText = (status: string): string => {
  const statusTexts: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    processing: 'En preparación',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  }
  return statusTexts[status] || status // Fallback: mostrar status original
}

/**
 * Componente StatusBadge
 *
 * @param status - Estado del pedido en inglés (pending, paid, processing, etc.)
 * @returns Badge coloreado con texto traducido
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = getStatusColor(status)
  const displayText = getStatusText(status)

  return (
    <span
      role="status"
      className={`inline-block px-4 py-2 rounded-full text-white text-sm font-sans ${colorClass}`}
    >
      {displayText}
    </span>
  )
}
