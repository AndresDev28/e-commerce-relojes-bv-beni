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
import {
  OrderStatus,
  ORDER_STATUS_CONFIG,
  isErrorStatus,
  type StatusHistoryItem,
} from '@/types'

interface OrderTimelineProps {
  currentStatus: OrderStatus
  statusHistory?: StatusHistoryItem[]
}

/**
 * Orden de los estados en el timeline
 * Solo muestra los estados del flujo normal (no errores)
 */
const TIMELINE_STATES = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
] as const

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
  const getStatusDate = (status: OrderStatus): string | null => {
    const historyItem = statusHistory.find((item) => item.status === status)
    return historyItem ? historyItem.date : null
  }

  /**
   * Determinar si un estado está completado
   * Un estado está completado si:
   * 1. Está en el historial, O
   * 2. Es anterior al estado actual en la secuencia (no incluye el estado actual)
   */
  const isCompleted = (status: OrderStatus): boolean => {
    if (statusHistory.some((item) => item.status === status)) {
      return true
    }
    const currentIndex = TIMELINE_STATES.findIndex((s) => s === currentStatus)
    const statusIndex = TIMELINE_STATES.findIndex((s) => s === status)
    return statusIndex < currentIndex && currentIndex !== -1
  }

  /**
   * Verificar si el estado es el actual
   */
  const isCurrent = (status: OrderStatus): boolean => {
    return status === currentStatus
  }

  /**
   * Verificar si el pedido está cancelado o en error
   */
  const isErrorState = isErrorStatus(currentStatus)

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
            {ORDER_STATUS_CONFIG[currentStatus].description}
          </p>
        </div>
      )}

      {/* Timeline de estados */}
      <div className="space-y-6">
        {TIMELINE_STATES.map((status, index) => {
          const completed = isCompleted(status)
          const current = isCurrent(status)
          const statusDate = getStatusDate(status)
          const isLast = index === TIMELINE_STATES.length - 1
          const config = ORDER_STATUS_CONFIG[status]

          return (
            <div key={status} className="relative">
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
                    {config.label}
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
