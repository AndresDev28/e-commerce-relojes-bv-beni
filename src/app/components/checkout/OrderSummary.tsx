/**
 * Componente OrderSummary - Resumen del pedido en el checkout
 *
 * [PAY-11] Crear componente OrderSummary
 *
 * Características:
 * - Lista de productos con imagen, nombre, cantidad y precio
 * - Cálculo de subtotal, envío y total
 * - Formato de moneda en español (XXX,XX €)
 * - Responsive (mobile + desktop)
 * - Link para editar carrito
 *
 * @example
 * ```tsx
 * <OrderSummary />
 * ```
 */

'use client'

import { useCart } from '@/context/CartContext'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Edit } from 'lucide-react'

/**
 * Constantes para cálculos
 */
const SHIPPING_COST = 5.95 // Costo de envío fijo
const FREE_SHIPPING_THRESHOLD = 50 // Envío gratis a partir de 50€

/**
 * Formatea un número como moneda española
 * @param amount - Cantidad a formatear
 * @returns String formateado (ej: "259,89 €")
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function OrderSummary() {
  // ============================================
  // HOOKS
  // ============================================
  const { cartItems } = useCart()

  // ============================================
  // CÁLCULOS
  // ============================================

  /**
   * Subtotal: suma de (precio × cantidad) de todos los productos
   */
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity
  }, 0)

  /**
   * Envío: gratis si subtotal >= 50€, sino 5.95€
   */
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST

  /**
   * Total: subtotal + envío
   */
  const total = subtotal + shippingCost

  // ============================================
  // ESTADOS ESPECIALES
  // ============================================

  /**
   * Si el carrito está vacío, mostrar mensaje
   */
  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShoppingCart className="w-16 h-16 text-neutral-medium mb-4" />
          <h3 className="font-sans font-semibold text-dark text-lg mb-2">
            Tu carrito está vacío
          </h3>
          <p className="text-neutral-medium text-sm mb-6">
            Añade productos para continuar con tu compra
          </p>
          <Link
            href="/tienda"
            className="px-6 py-3 bg-primary text-white font-sans font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Ver productos
          </Link>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-light">
        <h2 className="font-sans font-bold text-dark text-xl sm:text-2xl">
          Resumen del pedido
        </h2>
        <Link
          href="/carrito"
          className="flex items-center gap-2 text-primary hover:text-blue-700 transition-colors text-sm font-sans font-semibold"
          aria-label="Editar carrito"
        >
          <Edit className="w-4 h-4" />
          <span className="hidden sm:inline">Editar</span>
        </Link>
      </div>

      {/* Lista de productos */}
      <div className="space-y-4 mb-6">
        {cartItems.map(item => (
          <div
            key={item.id}
            className="flex gap-4 pb-4 border-b border-neutral-light last:border-b-0"
          >
            {/* Imagen del producto */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-md overflow-hidden bg-neutral-light">
              {item.images && item.images.length > 0 ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 64px, 80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-neutral-medium" />
                </div>
              )}
            </div>

            {/* Info del producto */}
            <div className="flex-1 min-w-0">
              <h3 className="font-sans font-semibold text-dark text-sm sm:text-base truncate">
                {item.name}
              </h3>
              <p className="text-neutral-medium text-xs sm:text-sm mt-1">
                Cantidad: {item.quantity}
              </p>
            </div>

            {/* Precio */}
            <div className="flex flex-col items-end justify-between">
              <p className="font-sans font-bold text-dark text-sm sm:text-base">
                {formatCurrency(item.price * item.quantity)}
              </p>
              {item.quantity > 1 && (
                <p className="text-neutral-medium text-xs">
                  {formatCurrency(item.price)} c/u
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="space-y-3 pt-4 border-t border-neutral-light">
        {/* Subtotal */}
        <div className="flex justify-between text-sm sm:text-base">
          <span className="font-sans text-neutral-dark">Subtotal</span>
          <span className="font-sans font-semibold text-dark">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Envío */}
        <div className="flex justify-between text-sm sm:text-base">
          <span className="font-sans text-neutral-dark">Envío</span>
          <span className="font-sans font-semibold text-dark">
            {shippingCost === 0 ? (
              <span className="text-green-600">Gratis</span>
            ) : (
              formatCurrency(shippingCost)
            )}
          </span>
        </div>

        {/* Mensaje de envío gratis */}
        {subtotal < FREE_SHIPPING_THRESHOLD && (
          <p className="text-xs text-neutral-medium italic">
            Añade {formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)} más para
            envío gratis
          </p>
        )}

        {/* Total */}
        <div className="flex justify-between pt-3 border-t border-neutral-light">
          <span className="font-sans font-bold text-dark text-lg sm:text-xl">
            Total
          </span>
          <span className="font-sans font-bold text-primary text-lg sm:text-xl">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

// Exportación de constantes para test
export const CONSTATS = {
  SHIPPING_COST,
  FREE_SHIPPING_THRESHOLD,
} as const
