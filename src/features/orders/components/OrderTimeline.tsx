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

import type { OrderData } from '@/lib/api/orders'

interface OrderTimelineProps {
  currentStatus: OrderStatus
  statusHistory?: StatusHistoryItem[]
  shipment?: OrderData['shipment']
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
  shipment,
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
   * Obtener URL de tracking dependiendo del transportista [SHIP-07]
   */
  const getTrackingUrl = (carrier?: string | null, trackingNumber?: string | null): string | null => {
    if (!carrier || !trackingNumber) return null;

    // Normalizar el nombre del transportista para comparación
    const normalizedCarrier = carrier.trim().toLowerCase();

    // Diccionario de URLs de tracking conocidas por MVP
    const carrierUrls: Record<string, string> = {
      'seur': `https://www.seur.com/livetracking/?segOnlineIdentificationNumber=${trackingNumber}`,
      'correos': `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${trackingNumber}`,
      'gls': `https://www.gls-spain.es/es/ayuda/seguimiento-envio/?match=${trackingNumber}`,
      'mrw': `https://www.mrw.es/seguimiento_envios/MRW_seguimiento_envios.asp?num=${trackingNumber}`,
      'dhl': `https://www.dhl.com/es-es/home/rastreo.html?tracking-id=${trackingNumber}`
    };

    // Buscar coincidencia parcial (ej: "Correos Express" mapeará a "correos")
    for (const key of Object.keys(carrierUrls)) {
      if (normalizedCarrier.includes(key)) {
        return carrierUrls[key];
      }
    }

    return null;
  }

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

                  {/* Tracking Info si es enviado y tenemos datos */}
                  {status === OrderStatus.SHIPPED && shipment?.tracking_number && (
                    <div className="mt-3 p-4 bg-neutral-lightest rounded-lg border border-neutral-light shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-neutral-dark font-sans font-bold">
                          Información de Seguimiento
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral font-serif bg-white p-3 rounded-md border border-neutral-100">
                        <div>
                          <span className="text-neutral-light text-xs uppercase tracking-wider font-sans font-semibold mb-1 block">Agencia</span>
                          <span className="font-medium text-neutral-dark">{shipment.carrier || 'No especificado'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-light text-xs uppercase tracking-wider font-sans font-semibold mb-1 block">N° de Rastreo</span>
                          <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-dark font-medium">{shipment.tracking_number}</span>
                        </div>
                        {shipment.estimated_delivery_date && (
                          <div className="sm:col-span-2 mt-1">
                            <span className="text-neutral-light text-xs uppercase tracking-wider font-sans font-semibold mb-1 block">Entrega Estimada</span>
                            <span className="font-medium text-primary">
                              {new Date(shipment.estimated_delivery_date).toLocaleDateString('es-ES', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Enlace al Transportista [SHIP-07] */}
                      {getTrackingUrl(shipment.carrier, shipment.tracking_number) && (
                        <div className="mt-4">
                          <a
                            href={getTrackingUrl(shipment.carrier, shipment.tracking_number)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-neutral-dark hover:bg-black text-white text-sm font-bold font-sans rounded-md transition-colors"
                          >
                            Rastrear tu paquete
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
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
