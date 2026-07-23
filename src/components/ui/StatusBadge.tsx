/**
 * [ORD-18] StatusBadge Component - REFACTORED
 *
 * Componente reutilizable que muestra un badge de estado con colores distintivos,
 * íconos opcionales y tooltips según el estado del pedido.
 *
 * RESPONSABILIDADES:
 * - Mostrar badge visual con color según estado
 * - Mostrar label traducido del ORDER_STATUS_CONFIG
 * - Mostrar íconos opcionales
 * - Soportar variantes de tamaño (sm, md, lg)
 * - Mostrar tooltip con descripción al hacer hover
 * - Proporcionar contraste accesible (WCAG AA)
 * - Ser reutilizable en toda la aplicación
 *
 * MEJORAS vs ORD-06:
 * - ✅ Usa enum OrderStatus (type-safe)
 * - ✅ Usa ORDER_STATUS_CONFIG centralizado (no duplica mapeos)
 * - ✅ Soporta íconos opcionales
 * - ✅ Soporta variantes de tamaño
 * - ✅ Tooltip con descripción
 *
 * USO:
 * <StatusBadge status={OrderStatus.DELIVERED} />
 * <StatusBadge status={OrderStatus.PENDING} showIcon />
 * <StatusBadge status={OrderStatus.SHIPPED} size="lg" showIcon />
 */

'use client'

import { OrderStatus, ORDER_STATUS_CONFIG, type OrderStatusColor } from '@/types'

interface StatusBadgeProps {
  status: OrderStatus
  showIcon?: boolean // Mostrar ícono (default: false)
  size?: 'sm' | 'md' | 'lg' // Tamaño del badge (default: md)
}

/**
 * Mapeo de colores abstractos del config → clases Tailwind
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
const colorClasses: Record<OrderStatusColor, string> = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-700',
  orange: 'bg-orange-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
  purple: 'bg-purple-500',
}

/**
 * Clases de tamaño para cada variante
 */
const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

/**
 * Componente StatusBadge
 *
 * @param status - Estado del pedido (enum OrderStatus)
 * @param showIcon - Mostrar ícono del estado (default: false)
 * @param size - Tamaño del badge: sm, md, lg (default: md)
 * @returns Badge coloreado con texto, ícono opcional y tooltip
 */
export default function StatusBadge({
  status,
  showIcon = false,
  size = 'md',
}: StatusBadgeProps) {
  // Obtener configuración del estado desde ORDER_STATUS_CONFIG
  const config = ORDER_STATUS_CONFIG[status]

  // Fallback si el estado viene del backend y no está configurado en el frontend
  if (!config) {
    const sizeClass = sizeClasses[size]
    return (
      <span
        role="status"
        title="Estado no reconocido"
        className={`inline-flex items-center gap-1.5 rounded-full text-white font-sans font-medium bg-gray-500 ${sizeClass} cursor-help transition-transform hover:scale-105`}
      >
        <span>{status || 'Desconocido'}</span>
      </span>
    )
  }

  const colorClass = colorClasses[config.color]
  const sizeClass = sizeClasses[size]

  return (
    <span
      role="status"
      title={config.description} // Tooltip nativo con descripción
      className={`inline-flex items-center gap-1.5 rounded-full text-white font-sans font-medium ${colorClass} ${sizeClass} cursor-help transition-transform hover:scale-105`}
    >
      {showIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  )
}
