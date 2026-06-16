/**
 * Fuente única de la verdad: Si alguna vez hay que cambiar la estructura de un producto (agregar un campo brand),
 * solo hay que cambiarlo en este archivo, y TypeScript avisará en todos los demás sitios donde se use para que se hagan los cambios necesarios.
 *
 * Autocompletado y Seguridad: cada vez que trabajes con una variable de tipo Product, el editor de código sabrá exactamente qué propiedades tiene (product.name, product.price, etc).
 */

// --- TIPOS DE APLICACIÓN (Los que usan los componentes) ---
// La estructura base para un solo producto de la tienda
export interface Product {
  id: string // O number, pero string (UUID) es más robusto
  name: string
  price: number // Corregido el typo
  images: string[]
  href: string // La URL de la imagen principal
  description: string
  category?: string
  stock: number
}

// Representa un producto dentro del carrito de compras
// Para usarlo en CartContext
export interface CartItem extends Product {
  quantity: number // Agregamos la cantidad que el usuario ha seleccionado
}

// --- TIPOS DE API DE STRAPI (Describen los datos "crudos") ---

// Tipo para una sola imagen
export interface StrapiImage {
  id: number
  url: string
}

// Tipo para una sola categoría
export interface StrapiCategory {
  id: number
  name: string
  slug: string
  image?: StrapiImage | StrapiImage[]
}

// Metadata de paginación retornada por Strapi
export interface PaginationMeta {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

// Parámetros opcionales para consultar productos con paginación/filtros
export interface GetProductsParams {
  page?: number
  pageSize?: number
  category?: string   // Strapi slug
  sort?: string        // 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
}

// Respuesta paginada de productos
export interface ProductsResponse {
  products: StrapiProduct[]
  pagination: PaginationMeta
}

// El tipo final para un producto completo que viene de la API
export interface StrapiProduct {
  id: number
  name: string
  price: number
  slug: string
  description: string | null
  stock: number
  image?: StrapiImage | StrapiImage[] // Puede ser único o arreglo
  images?: StrapiImage | StrapiImage[] // Alternativa si el campo es múltiple y se llama 'images'
  category?: StrapiCategory | StrapiCategory[]
}

// Categorías de la cuadrícula de la home
export interface CategoryItem {
  title: string
  imageUrl: string
  href: string
}

// La estructura para un usuario registrado
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  // Omitimos la contraseña ya que nunca se debe exponer en el frontend!
}

// La estructura para un pedido completo
export interface Order {
  id: string
  user: User
  items: CartItem[]
  total: number
  status: OrderStatus  // ✅ Usa el enum
  createdAt: Date
}

// ============================================
// TIPOS DE STRIPE ([PAY-01])
// ============================================

/**
 * Ambiente de Stripe
 * - test: Claves de prueba (pk_test_, sk_test_)
 * - live: Claves de producción (pk_live_, sk_live_)
 */
export type StripeEnvironment = 'test' | 'live'

/**
 * Configuración de Stripe
 * Centraliza la configuración para fácil acceso
 */
export interface StripeConfig {
  publishableKey: string
  environment: StripeEnvironment
  isTestMode: boolean
}

/**
 * Re-exportar tipo de Stripe para conveniencia
 * Esto permite importar { Stripe } desde '@/types'
 * en lugar de '@stripe/stripe-js'
 */
export type { Stripe } from '@stripe/stripe-js'

// ============================================
// TIPOS DE ERRORES DE STRIPE ([PAY-06])
// ============================================

/**
 * Tipos de error de Stripe
 * Basados en https://stripe.com/docs/error-codes
 *
 * card_error: Problema con la tarjeta del usuario
 * validation_error: Los datos enviados no son válidos
 * api_error: Error del servidor de Stripe
 * network_error: Error de conexión a internet
 * rate_limit_error: Muchas peticiones en poco tiempo
 * authentication_error: Clave API incorrecta
 * invalid_request_error: Petición mal formada
 * unknown_error: Error desconocido
 */
export type StripeErrorType =
  | 'card_error'
  | 'validation_error'
  | 'api_error'
  | 'network_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'invalid_request_error'
  | 'unknown_error'

/**
 * Códigos de error específicos de tarjetas
 * Los más comunes según la documentación de Stripe
 *
 * Ejemplos:
 * - card_declined: La tarjeta fue rechazada
 * - expired_card: La tarjeta está caducada
 * - incorrect_cvc: El CVV/CVC es incorrecto
 * - insufficient_funds: No hay fondos suficientes
 */
export type StripeCardErrorCode =
  | 'card_declined'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'incorrect_number'
  | 'invalid_expiry_month'
  | 'invalid_expiry_year'
  | 'insufficient_funds'
  | 'processing_error'
  | 'authentication_required'

/**
 * Estructura de un error de Stripe procesado
 *
 * Esta interfaz representa un error de Stripe después de ser
 * procesado por nuestro errorHandler.
 *
 * @property type - Tipo general del error
 * @property code - Código específico del error (opcional)
 * @property message - Mensaje original de Stripe en inglés
 * @property localizedMessage - Mensaje traducido al español para el usuario
 * @property declineCode - Código adicional de rechazo (opcional)
 * @property param - Campo que causó el error (opcional)
 *
 * @example
 * ```typescript
 * const error: StripeError = {
 *   type: 'card_error',
 *   code: 'expired_card',
 *   message: 'Your card has expired.',
 *   localizedMessage: 'Tu tarjeta ha caducado. Por favor, usa otra tarjeta.'
 * }
 * ```
 */
export interface StripeError {
  type: StripeErrorType
  code?: StripeCardErrorCode | string
  message: string
  localizedMessage: string
  declineCode?: string
  param?: string
}

/**
 * Severidad del error (para UI)
 *
 * - error: Error crítico (rojo)
 * - warning: Advertencia (amarillo/naranja)
 * - info: Información (azul)
 */
export type ErrorSeverity = 'error' | 'warning' | 'info'

/**
 * Variantes del componente ErrorMessage
 * Se usará en [PAY-07] para el componente reutilizable
 */
export type ErrorMessageVariant = 'error' | 'warning' | 'info'

// ============================================
// TIPOS DE ESTADOS DE PEDIDOS ([ORD-17])
// ============================================
/**
 * Estados de un pedido siguiendo el estándar de Stripe y e-commerce
 * 
 * FLUJO NORMAL:
 * pending → paid → processing → shipped → delivered
 * 
 * FLUJO CANCELACIÓN:
 * pending/paid/processing → cancelled
 * 
 * FLUJO REEMBOLSO:
 * cualquier estado → refunded
 * 
 * LEARNING: ¿Por qué usar enum en vez de union types?
 * ================================================
 * - Autocompletado robusto en el IDE
 * - Validación en tiempo de compilación
 * - Fuente única de verdad
 * - Fácil de refactorizar (cambiar un valor actualiza todo)
 * - Mejor para iterar (Object.values(OrderStatus))
 */
export enum OrderStatus {
  PENDING = 'pending',      // Orden creada, esperando confirmación de Stripe
  PAID = 'paid',           // Pago confirmado exitosamente
  PROCESSING = 'processing', // Preparando el pedido para envío
  SHIPPED = 'shipped',      // En camino al cliente
  DELIVERED = 'delivered',  // Entregado exitosamente
  CANCELLED = 'cancelled',  // Cancelado por cliente o admin
  REFUNDED = 'refunded',   // Reembolso procesado
  CANCELLATION_REQUESTED = 'cancellation_requested', // Cliente solicitó cancelación
}

/**
 * Historial de cambios de estado de un pedido
 * Usado para tracking de transiciones de estado
 */
export interface StatusHistoryItem {
  status: OrderStatus
  date: string
  description?: string
}

/**
 * Tipo de color para badges de estado
 */
export type OrderStatusColor =
  | 'gray'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'red'
  | 'purple'
/**
 * Configuración de un estado individual
 */
export interface OrderStatusConfig {
  label: string
  color: OrderStatusColor
  description: string
  icon: string
}
/**
 * Configuración completa de todos los estados
 * Útil para renderizar badges, tooltips, etc.
 * 
 * @example
 * const config = ORDER_STATUS_CONFIG[OrderStatus.PAID]
 * console.log(config.label) // "Pago Confirmado"
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  [OrderStatus.PENDING]: {
    label: 'Pago Pendiente',
    color: 'gray',
    description: 'Esperando confirmación de pago',
    icon: '⏳',
  },
  [OrderStatus.PAID]: {
    label: 'Pago Confirmado',
    color: 'blue',
    description: 'Pago procesado correctamente',
    icon: '✓',
  },
  [OrderStatus.PROCESSING]: {
    label: 'En Preparación',
    color: 'yellow',
    description: 'Preparando tu pedido para envío',
    icon: '📦',
  },
  [OrderStatus.SHIPPED]: {
    label: 'Enviado',
    color: 'orange',
    description: 'Tu pedido está en camino',
    icon: '🚚',
  },
  [OrderStatus.DELIVERED]: {
    label: 'Entregado',
    color: 'green',
    description: 'Pedido recibido exitosamente',
    icon: '✓',
  },
  [OrderStatus.CANCELLED]: {
    label: 'Cancelado',
    color: 'red',
    description: 'Pedido cancelado',
    icon: '✕',
  },
  [OrderStatus.REFUNDED]: {
    label: 'Reembolsado',
    color: 'purple',
    description: 'Dinero devuelto',
    icon: '↩',
  },
  [OrderStatus.CANCELLATION_REQUESTED]: {
    label: 'Cancelación Solicitada',
    color: 'orange',
    description: 'Solicitud de cancelación en revisión',
    icon: '⏳',
  },
} as const
/**
 * Transiciones válidas de estado
 * Previene cambios de estado inválidos (ORD-32)
 * 
 * @example
 * isValidStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING) // true
 * isValidStatusTransition(OrderStatus.DELIVERED, OrderStatus.PENDING) // false
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.CANCELLATION_REQUESTED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.CANCELLATION_REQUESTED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.CANCELLATION_REQUESTED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [], // Estado final
  [OrderStatus.REFUNDED]: [],  // Estado final
  [OrderStatus.CANCELLATION_REQUESTED]: [OrderStatus.CANCELLED, OrderStatus.PROCESSING], // En espera de resolución por parte del administrador
}
/**
 * Estados que indican que el pedido está activo (no terminado)
 */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.CANCELLATION_REQUESTED,
] as const
/**
 * Estados que indican error o finalización negativa
 */
export const ERROR_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
] as const
/**
 * Estados completados exitosamente
 */
export const SUCCESS_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.DELIVERED,
] as const
/**
 * Valida si una transición de estado es válida
 * 
 * @param from - Estado actual
 * @param to - Estado destino
 * @returns true si la transición es permitida
 * 
 * @example
 * isValidStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING) // true
 * isValidStatusTransition(OrderStatus.DELIVERED, OrderStatus.PENDING) // false
 */
export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to)
}
/**
 * Obtiene la configuración de un estado
 * 
 * @param status - Estado del pedido
 * @returns Configuración del estado (label, color, etc.)
 */
export function getStatusConfig(status: OrderStatus): OrderStatusConfig {
  return ORDER_STATUS_CONFIG[status]
}
/**
 * Verifica si un estado es de error
 */
export function isErrorStatus(status: OrderStatus): boolean {
  return ERROR_ORDER_STATUSES.includes(status)
}
/**
 * Verifica si un estado es activo
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

/**
 * Determina si un estado debe mostrar ícono en StatusBadge
 * 
 * REGLAS:
 * - Muestra ícono SI el estado está en statusHistory (completado)
 * - Muestra ícono SI el estado está ANTES del actual en la secuencia
 * - Muestra ícono SI es estado de error y es el estado actual
 * - Muestra ícono SI es DELIVERED y es el estado actual (estado final exitoso)
 * - NO muestra ícono para estados futuros o estado actual en progreso
 * 
 * @param status - Estado a verificar
 * @param currentStatus - Estado actual del pedido
 * @param statusHistory - Historial de estados (opcional)
 * @returns true si el estado debe mostrar ícono
 * 
 * @example
 * // Pedido en estado SHIPPED
 * shouldShowStatusIcon(OrderStatus.PAID, OrderStatus.SHIPPED, history) // true (completado)
 * shouldShowStatusIcon(OrderStatus.SHIPPED, OrderStatus.SHIPPED, history) // false (actual, en progreso)
 * shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.SHIPPED, history) // false (futuro)
 * 
 * // Pedido en estado DELIVERED (estado final exitoso)
 * shouldShowStatusIcon(OrderStatus.DELIVERED, OrderStatus.DELIVERED) // true (completado exitosamente)
 * 
 * // Pedido en estado CANCELLED (estado de error)
 * shouldShowStatusIcon(OrderStatus.CANCELLED, OrderStatus.CANCELLED) // true (estado final)
 */
export function shouldShowStatusIcon(
  status: OrderStatus,
  currentStatus: OrderStatus,
  statusHistory?: StatusHistoryItem[]
): boolean {
  // 1. Si está en el historial, definitivamente está completado
  if (statusHistory?.some((item) => item.status === status)) {
    return true
  }

  // 2. Estados de error siempre muestran ícono si son el estado actual
  if (isErrorStatus(status) && status === currentStatus) {
    return true
  }

  // 3. DELIVERED muestra ícono si es el estado actual (completado exitosamente)
  if (status === OrderStatus.DELIVERED && status === currentStatus) {
    return true
  }

  // 4. Si está ANTES del estado actual en la secuencia normal, está completado
  const TIMELINE_STATES = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ]

  const currentIndex = TIMELINE_STATES.findIndex((s) => s === currentStatus)
  const statusIndex = TIMELINE_STATES.findIndex((s) => s === status)

  // Solo si ambos están en la secuencia Y status está antes que current
  return statusIndex !== -1 && currentIndex !== -1 && statusIndex < currentIndex
}

// ============================================
// FECHA ESTIMADA DE ENTREGA ([ORD-19])
// ============================================
/**
 * Configuración de tiempos de entrega
 * 
 * MVP: Fijo 3-4 días para España peninsular
 * FUTURO: Extender con múltiples zonas y tipos de envío
 * 
 * @example
 * // Post-MVP:
 * const DELIVERY_CONFIG = {
 *   standard: { min: 3, max: 4, label: 'España peninsular' },
 *   islands: { min: 5, max: 7, label: 'Islas Baleares/Canarias' },
 *   express: { min: 1, max: 2, label: 'Envío express' },
 * }
 */
export const DELIVERY_DAYS_CONFIG = {
  min: 3,  // Días mínimos para entrega
  max: 4,  // Días máximos para entrega
} as const
/**
 * Rango de fechas estimadas de entrega
 */
export interface DeliveryDateRange {
  minDate: Date
  maxDate: Date
}
/**
 * Resultado del cálculo de fecha de entrega
 * Incluye tanto las fechas como el texto formateado listo para mostrar
 */
export interface DeliveryEstimate {
  range: DeliveryDateRange
  formattedText: string  // "24-25 Nov 2025"
  status: 'estimated' | 'delivered' | 'not_shipped'
}