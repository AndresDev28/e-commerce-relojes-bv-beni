/**
 * [ORD-12] OrderTimeline Component EPIC-15
 *
 * Componente que muestra el timeline/historial de estados de un pedido.
 *
 * RESPONSABILIDADES:
 * - Mostrar visualmente el progreso del pedido
 * - Indicar estados completados, activo y pendientes
 * - Mostrar fechas de cada transición de estado
 * - Diseño responsive con línea vertical conectando estados
 *
 * LEARNING: ¿Qué es un timeline de pedido?
 * ==========================================
 * Un timeline muestra la secuencia de estados por los que pasa un pedido:
 * 1. Pedido realizado → Cuando el usuario confirma la compra
 * 2. Pago confirmado → Cuando se procesa el pago exitosamente
 * 3. En preparación → Cuando se está preparando el envío
 * 4. Enviado → Cuando el paquete sale del almacén
 * 5. Entregado → Cuando llega al cliente
 *
 * USO:
 * <OrderTimeline currentStatus="shipped" statusHistory={historyArray} />
 */

'use client'

import { BsCheckCircleFill, BsClock } from 'react-icons/bs'

/**
 * Historial de cambios de estado
 */
export interface StatusHistoryItem {
  status: string
  date: string
  description?: string
}

interface OrderTimelineProps {
  currentStatus: string
  statusHistory?: StatusHistoryItem[]
}

/**
 * Configuración de estados del pedido
 * Define el orden y labels de los estados
 */
const ORDER_STATES = [
  { key: 'pending', label: 'Pedido realizado' },
  { key: 'paid', label: 'Pago confirmado' },
  { key: 'processing', label: 'En preparación' },
  { key: 'shipped', label: 'Enviado' },
  { key: 'delivered', label: 'Entregado' },
] as const

/**
 * Estados cancelados o con error
 */
const ERROR_STATES = ['cancelled', 'refunded', 'failed']

export default function OrderTimeline({
  currentStatus,
  statusHistory = [],
}: OrderTimelineProps) {
  /**
   * Formatear fecha a formato español corto
   *
   * @example "2025-11-20T10:00:00Z" → "20 nov. 2025, 10:00"
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Obtener fecha de un estado específico del historial
   */
  const getStatusDate = (statusKey: string): string | null => {
    const historyItem = statusHistory.find((item) => item.status === statusKey)
    return historyItem ? historyItem.date : null
  }

  /**
   * Determinar si un estado está completado
   * Un estado está completado si:
   * 1. Está en el historial, O
   * 2. Es anterior al estado actual en la secuencia (no incluye el estado actual)
   */
  const isCompleted = (statusKey: string): boolean => {
    // Buscar en el historial
    if (statusHistory.some((item) => item.status === statusKey)) {
      return true
    }

    // Si no hay historial, usar la posición en la secuencia
    // Solo marca como completado los estados ANTERIORES al actual
    const currentIndex = ORDER_STATES.findIndex((s) => s.key === currentStatus)
    const statusIndex = ORDER_STATES.findIndex((s) => s.key === statusKey)

    return statusIndex < currentIndex && currentIndex !== -1
  }

  /**
   * Verificar si el estado es el actual
   */
  const isCurrent = (statusKey: string): boolean => {
    return statusKey === currentStatus
  }

  /**
   * Verificar si el pedido está cancelado o en error
   */
  const isErrorState = ERROR_STATES.includes(currentStatus)

  /**
   * RENDERIZADO
   *
   * ESTRUCTURA:
   * 1. Título del timeline
   * 2. Lista de estados con:
   *    - Icono (check si completado, reloj si pendiente)
   *    - Label del estado
   *    - Fecha (si existe en el historial)
   *    - Línea vertical conectando estados
   *
   * LEARNING: ¿Por qué usar relative/absolute para la línea?
   * ========================================================
   * - relative en el contenedor: Crea contexto de posicionamiento
   * - absolute en la línea: Se posiciona relativa al contenedor
   * - La línea conecta visualmente los estados entre sí
   */
  return (
    <div className="bg-white border border-neutral-light rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-bold font-sans text-neutral-dark mb-6">
        Estado del Pedido
      </h3>

      {/* Mensaje especial si está cancelado */}
      {isErrorState && (
        <div className="mb-4 p-3 bg-error-light border border-error rounded-md">
          <p className="text-sm text-error font-medium">
            {currentStatus === 'cancelled' && 'Este pedido ha sido cancelado'}
            {currentStatus === 'refunded' && 'Este pedido ha sido reembolsado'}
            {currentStatus === 'failed' && 'Este pedido ha fallado'}
          </p>
        </div>
      )}

      {/* Timeline de estados */}
      <div className="space-y-6">
        {ORDER_STATES.map((state, index) => {
          const completed = isCompleted(state.key)
          const current = isCurrent(state.key)
          const statusDate = getStatusDate(state.key)
          const isLast = index === ORDER_STATES.length - 1

          return (
            <div key={state.key} className="relative">
              {/* Línea vertical conectando estados (excepto el último) */}
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full -ml-px ${completed ? 'bg-success' : 'bg-neutral-light'
                    }`}
                  aria-hidden="true"
                />
              )}

              {/* Contenido del estado */}
              <div className="flex items-start gap-4">
                {/* Icono del estado */}
                <div className="flex-shrink-0 relative z-10">
                  {completed ? (
                    <BsCheckCircleFill
                      className="w-8 h-8 text-success"
                      aria-label="Completado"
                    />
                  ) : (
                    <BsClock
                      className={`w-8 h-8 ${current ? 'text-primary' : 'text-neutral-light'
                        }`}
                      aria-label="Pendiente"
                    />
                  )}
                </div>

                {/* Información del estado */}
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={`text-base font-medium ${completed || current
                        ? 'text-neutral-dark font-bold'
                        : 'text-neutral'
                      }`}
                  >
                    {state.label}
                  </p>

                  {/* Fecha si el estado está completado */}
                  {statusDate && (
                    <p className="text-sm text-neutral font-serif mt-1">
                      {formatDate(statusDate)}
                    </p>
                  )}

                  {/* Indicador de estado actual */}
                  {current && !completed && (
                    <p className="text-xs text-primary font-medium mt-1">
                      Estado actual
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
