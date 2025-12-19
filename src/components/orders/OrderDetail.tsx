/**
 * [ORD-12] OrderDetail Component EPIC-15
 *
 * Component that displays complete order details.
 *
 * RESPONSIBILITIES:
 * - Display complete order information (number, date, status, total)
 * - List all order products with details (linked to product pages)
 * - Show cost summary (subtotal, shipping, total)
 * - Display payment information (method, last 4 digits)
 * - Integrate order timeline component
 * - Visual status badge
 * - "Back to orders" navigation button
 * - Responsive design (stack on mobile, grid on desktop)
 *
 * LEARNING: Why create a separate component?
 * ===========================================
 *
 * We could put all code in the page, but separating it into a component:
 * - ✅ Easier testing (can test independently)
 * - ✅ Reusable (if we want to show detail elsewhere)
 * - ✅ Separation of concerns (presentation vs. page logic)
 * - ✅ Easier to maintain and modify
 *
 * USAGE:
 * <OrderDetail order={orderData} />
 */

'use client'

import type { OrderData } from '@/lib/api/orders'
import StatusBadge from '@/app/components/ui/StatusBadge'
import OrderTimeline from './OrderTimeline'
import { formatPaymentMethod } from '@/utils'
import { shouldShowStatusIcon } from '@/types'
import { getDeliveryEstimate } from '@/lib/utils/delivery'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BsArrowLeft, BsCreditCard, BsClock } from 'react-icons/bs'

interface OrderDetailProps {
  order: OrderData
}

export default function OrderDetail({ order }: OrderDetailProps) {
  const router = useRouter()

  /**
   * Format date to Spanish format
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
   * Format price to Spanish currency format
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
   * Get delivery estimate for this order
   * [ORD-19] Calculate estimated or actual delivery date
   */
  const deliveryEstimate = getDeliveryEstimate(
    order.shippedAt,
    order.deliveredAt
  )

  /**
   * Navigate back to orders list
   */
  const handleBackClick = () => {
    router.push('/mi-cuenta/pedidos')
  }

  /**
   * RENDERING
   *
   * STRUCTURE:
   * 0. Back button
   * 1. Header with order number and status
   * 2. General information and cost summary (2 columns on desktop)
   * 3. Delivery estimate (estimated or actual delivery date) - [ORD-19]
   * 4. Payment information
   * 5. Order products list (linked to product pages)
   * 6. Order timeline
   *
   * LEARNING: Why use grid on desktop?
   * ===================================
   * grid-cols-1 (mobile): Single column, everything stacked
   * md:grid-cols-2 (desktop): Two columns, general info on left,
   *                           cost summary on right
   *
   * This better utilizes space on large screens.
   */
  return (
    <div className="space-y-6">
      {/* 0. BACK BUTTON */}
      <button
        onClick={handleBackClick}
        className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-medium"
      >
        <BsArrowLeft className="w-5 h-5" />
        Volver a mis pedidos
      </button>

      {/* Main order detail card */}
      <div className="bg-white border border-neutral-light rounded-lg shadow-sm">
        {/* 1. HEADER - Order number and status */}
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
              <StatusBadge
                status={order.orderStatus}
                showIcon={shouldShowStatusIcon(
                  order.orderStatus,
                  order.orderStatus,
                  order.statusHistory
                )}
              />
            </div>
          </div>
        </div>

        {/* 2. GENERAL INFORMATION AND SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* General information (left on desktop) */}
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
                  <StatusBadge
                    status={order.orderStatus}
                    showIcon={shouldShowStatusIcon(
                      order.orderStatus,
                      order.orderStatus,
                      order.statusHistory
                    )}
                  />
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

          {/* Cost summary (right on desktop) */}
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
                  {order.shipping === 0
                    ? 'Gratis'
                    : formatPrice(order.shipping)}
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

        {/* 3. DELIVERY ESTIMATE - [ORD-19] Estimated or actual delivery date */}
        {deliveryEstimate && (
          <div className="border-t border-neutral-light p-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <BsClock className="mt-1 text-xl text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold font-sans text-neutral-dark mb-1">
                    {deliveryEstimate.status === 'delivered'
                      ? 'Fecha de entrega'
                      : 'Entrega estimada'}
                  </h3>
                  <p className="text-lg font-bold text-blue-700">
                    {deliveryEstimate.status === 'delivered'
                      ? `Entregado el: ${deliveryEstimate.formattedText}`
                      : deliveryEstimate.formattedText}
                  </p>
                  {deliveryEstimate.status === 'estimated' && (
                    <p className="mt-1 text-sm text-neutral font-serif">
                      Recibirás tu pedido entre estas fechas
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PAYMENT INFORMATION - [ORD-14] Using formatPaymentMethod */}
        {order.paymentInfo && (
          <div className="border-t border-neutral-light p-6">
            <h3 className="text-lg font-bold font-sans text-neutral-dark mb-4">
              Información de Pago
            </h3>
            <div className="bg-neutral-lightest p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <BsCreditCard className="w-6 h-6 text-neutral" />
                <p className="text-sm font-medium text-neutral-dark">
                  {formatPaymentMethod(order.paymentInfo)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. ORDER PRODUCTS */}
        <div className="border-t border-neutral-light p-6">
          <h3 className="text-lg font-bold font-sans text-neutral-dark mb-4">
            Productos ({order.items.length})
          </h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <Link
                key={`${item.id}-${index}`}
                href={`/productos/${item.id}`}
                className="flex gap-4 p-4 bg-neutral-lightest rounded-lg hover:bg-neutral-light/50 transition-colors group"
              >
                {/* Product image */}
                <div className="flex-shrink-0 w-20 h-20 relative bg-white rounded-md overflow-hidden">
                  <Image
                    src={item.images[0] || '/placeholder-watch.jpg'}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="80px"
                  />
                </div>

                {/* Product information */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold font-sans text-neutral-dark truncate group-hover:text-primary transition-colors">
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

                {/* Product subtotal */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-base font-bold font-sans text-primary">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 6. ORDER TIMELINE */}
      <OrderTimeline
        currentStatus={order.orderStatus}
        statusHistory={order.statusHistory}
      />
    </div>
  )
}
