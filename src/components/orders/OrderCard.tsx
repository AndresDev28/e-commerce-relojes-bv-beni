/**
 * [ORD-04] OrderCard Component
 * [ORD-06] Refactored to use StatusBadge component
 *
 * Componente reutilizable que representa una tarjeta individual de pedido
 * en el listado del historial.
 *
 * RESPONSABILIDADES:
 * - Mostrar información resumida del pedido (número, fecha, total, estado)
 * - Formatear datos correctamente (fecha DD/MM/YYYY, precio XXX,XX €)
 * - Badge visual con color según estado del pedido (usando StatusBadge)
 * - Enlazar a página de detalle del pedido
 * - Diseño responsive (stack en mobile, flex-row en desktop)
 *
 * USO:
 * <OrderCard order={orderData} />
 */

'use client'

import Link from 'next/link'
import type { OrderData } from '@/lib/api/orders'
import StatusBadge from '@/app/components/ui/StatusBadge'

interface OrderCardProps {
  order: OrderData
}

export default function OrderCard({ order }: OrderCardProps) {
  /**
   * Formatear fecha a formato español DD/MM/YYYY
   *
   * @example "2025-11-20T10:00:00Z" → "20/11/2025"
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Formatear precio a formato de moneda español
   *
   * @example 99.99 → "99,99 €"
   * @example 1234.5 → "1.234,50 €"
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
   * Tarjeta clickeable que enlaza al detalle del pedido.
   *
   * LAYOUT:
   * - Mobile: Stack vertical (flex-col)
   * - Desktop: Fila horizontal (md:flex-row)
   *
   * SECCIONES:
   * 1. Número de pedido + fecha (izquierda, flex-1 para ocupar espacio)
   * 2. Total (centro, flex-shrink-0 para mantener tamaño)
   * 3. Badge de estado (derecha, flex-shrink-0)
   *
   * INTERACTIVIDAD:
   * - Hover: Sombra más pronunciada (hover:shadow-lg)
   * - Click: Navega a /mi-cuenta/pedidos/[orderId]
   */
  return (
    <Link
      href={`/mi-cuenta/pedidos/${order.orderId}`}
      className="block p-6 bg-white border border-neutral-light rounded-lg hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Sección 1: Número de pedido y fecha */}
        <div className="flex-1">
          <h3 className="text-lg font-bold font-sans text-neutral-dark mb-1">
            {order.orderId}
          </h3>
          <p className="text-sm text-neutral font-serif">
            {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Sección 2: Total del pedido */}
        <div className="flex-shrink-0">
          <p className="text-2xl font-bold font-sans text-primary">
            {formatPrice(order.total)}
          </p>
        </div>

        {/* Sección 3: Badge de estado con color */}
        <div className="flex-shrink-0">
          <StatusBadge status={order.orderStatus} />
        </div>
      </div>
    </Link>
  )
}
