/**
 * [ORD-11] OrderDetail Component EPIC-15
 *
 * Componente que muestra los detalles completos de un pedido específico.
 *
 * RESPONSABILIDADES:
 * - Mostrar información completa del pedido (número, fecha, estado, total)
 * - Listar todos los productos del pedido con sus detalles
 * - Mostrar resumen de costos (subtotal, envío, total)
 * - Badge visual del estado del pedido
 * - Diseño responsive (stack en mobile, grid en desktop)
 *
 * LEARNING: ¿Por qué crear un componente separado?
 * ================================================
 *
 * Podríamos poner todo el código en la página, pero separarlo en un componente:
 * - ✅ Facilita testing (podemos testearlo independientemente)
 * - ✅ Reutilizable (si queremos mostrar detalle en otro lugar)
 * - ✅ Separación de responsabilidades (presentación vs. lógica de página)
 * - ✅ Más fácil de mantener y modificar
 *
 * USO:
 * <OrderDetail order={orderData} />
 */

'use client'

import type { OrderData } from '@/lib/api/orders'
import StatusBadge from '@/app/components/ui/StatusBadge'
import Image from 'next/image'

interface OrderDetailProps {
  order: OrderData
}

export default function OrderDetail({ order }: OrderDetailProps) {
  /**
   * Formatear fecha a formato español completo
   *
   * @example "2025-11-20T10:00:00Z" → "20 de noviembre de 2025, 10:00"
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Formatear precio a formato de moneda español
   *
   * @example 99.99 → "99,99 €"
   */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  /**
   * RENDERIZADO
   *
   * ESTRUCTURA:
   * 1. Cabecera con número de pedido y estado
   * 2. Información general (fecha, total)
   * 3. Lista de productos del pedido
   * 4. Resumen de costos
   *
   * LEARNING: ¿Por qué usar grid en desktop?
   * ========================================
   * grid-cols-1 (mobile): Una columna, todo apilado
   * md:grid-cols-2 (desktop): Dos columnas, info general a la izquierda,
   *                           resumen de costos a la derecha
   *
   * Esto aprovecha mejor el espacio en pantallas grandes.
   */
  return (
    <div className="bg-white border border-neutral-light rounded-lg shadow-sm">
      {/* 1. CABECERA - Número de pedido y estado */}
      <div className="border-b border-neutral-light p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-sans text-neutral-dark">
              Pedido {order.orderId}
            </h2>
            <p className="text-sm text-neutral font-serif mt-1">
              Realizado el {formatDate(order.createdAt)}
            </p>
          </div>
          <div>
            <StatusBadge status={order.orderStatus} />
          </div>
        </div>
      </div>

      {/* 2. INFORMACIÓN GENERAL Y RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* Información general (izquierda en desktop) */}
        <div>
          <h3 className="text-lg font-bold font-sans text-neutral-dark mb-4">
            Información del Pedido
          </h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-neutral font-serif">
                Número de pedido:
              </dt>
              <dd className="text-sm font-medium text-neutral-dark">
                {order.orderId}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-neutral font-serif">Fecha:</dt>
              <dd className="text-sm font-medium text-neutral-dark">
                {formatDate(order.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-neutral font-serif">Estado:</dt>
              <dd className="text-sm font-medium text-neutral-dark">
                <StatusBadge status={order.orderStatus} />
              </dd>
            </div>
            {order.paymentIntentId && (
              <div className="flex justify-between">
                <dt className="text-sm text-neutral font-serif">
                  ID de Pago:
                </dt>
                <dd className="text-sm font-medium text-neutral-dark font-mono">
                  {order.paymentIntentId}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Resumen de costos (derecha en desktop) */}
        <div className="bg-neutral-lightest p-4 rounded-lg">
          <h3 className="text-lg font-bold font-sans text-neutral-dark mb-4">
            Resumen
          </h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-neutral font-serif">Subtotal:</dt>
              <dd className="text-sm font-medium text-neutral-dark">
                {formatPrice(order.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-neutral font-serif">Envío:</dt>
              <dd className="text-sm font-medium text-neutral-dark">
                {order.shipping === 0 ? 'Gratis' : formatPrice(order.shipping)}
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-light">
              <dt className="text-base font-bold font-sans text-neutral-dark">
                Total:
              </dt>
              <dd className="text-base font-bold font-sans text-primary">
                {formatPrice(order.total)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 3. PRODUCTOS DEL PEDIDO */}
      <div className="border-t border-neutral-light p-6">
        <h3 className="text-lg font-bold font-sans text-neutral-dark mb-4">
          Productos ({order.items.length})
        </h3>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex gap-4 p-4 bg-neutral-lightest rounded-lg"
            >
              {/* Imagen del producto */}
              <div className="flex-shrink-0 w-20 h-20 relative bg-white rounded-md overflow-hidden">
                <Image
                  src={item.images[0] || '/placeholder-watch.jpg'}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>

              {/* Información del producto */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold font-sans text-neutral-dark truncate">
                  {item.name}
                </h4>
                {item.description && (
                  <p className="text-sm text-neutral font-serif mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-neutral font-serif">
                    Cantidad: {item.quantity}
                  </span>
                  <span className="text-sm font-medium text-neutral-dark">
                    {formatPrice(item.price)} c/u
                  </span>
                </div>
              </div>

              {/* Subtotal del producto */}
              <div className="flex-shrink-0 text-right">
                <p className="text-base font-bold font-sans text-primary">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
