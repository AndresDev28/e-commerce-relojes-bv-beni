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
  status: 'pending' | 'paid' | 'shipped' | 'delivered'
  createdAt: Date // Corregido el nombre a createdAt
}

// ... tus tipos existentes ...

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
