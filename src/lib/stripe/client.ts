/**
 * Cliente de Stripe (Frontend)
 *
 * [PAY-01] Instalar y configurar Stripe SDK
 * Ticket: AND-10
 *
 * Este archivo:
 * 1. Inicializa Stripe.js de forma lazy (solo cuando se necesita)
 * 2. Implementa patrón Singleton (una sola instancia)
 * 3. Maneja errores de carga
 */

import { loadStripe } from '@stripe/stripe-js'
import { getStripePublishableKey } from './config'
import type { Stripe } from '@/types'

/**
 * Instancia singleton de Stripe
 *
 * ¿Por qué Singleton?
 * - Evita crear múltiples conexiones innecesarias
 * - Mejor performance (no re-inicializar)
 * - loadStripe ya hace caching internamente
 *
 * ¿Por qué Promise<Stripe | null>?
 * - loadStripe es asíncrono (carga script desde Stripe.com)
 * - Puede fallar si no hay conexión
 * - null indica fallo de carga
 */
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Obtiene la instancia de Stripe (lazy loading + singleton)
 *
 * Flujo:
 * 1. Primera llamada: Carga Stripe.js y crea instancia
 * 2. Siguientes llamadas: Retorna la misma instancia
 *
 * Ejemplo de uso:
 * ```typescript
 * const stripe = await getStripe()
 * if (stripe) {
 *   // Usar stripe para crear tokens, etc.
 * }
 * ```
 *
 * @returns Promise que resuelve a instancia de Stripe o null si falla
 */
export function getStripe(): Promise<Stripe | null> {
  // Si ya existe una promesa, retornarla (Singleton)
  if (stripePromise !== null) {
    return stripePromise
  }

  // Primera vez: crear la promesa de carga
  try {
    const publishableKey = getStripePublishableKey()

    // loadStripe descarga el script de Stripe.js
    // Es asíncrono pero seguro (HTTPS, CDN de Stripe)
    stripePromise = loadStripe(publishableKey)

    return stripePromise
  } catch (error) {
    // Si falla obtener la clave, retornar null
    console.error('Failed to initialize Stripe:', error)
    return Promise.resolve(null)
  }
}

/**
 * Resetea la instancia de Stripe
 *
 * Útil para:
 * - Tests (limpiar estado entre tests)
 * - Cambio de claves (ej: dev → prod)
 * - Troubleshooting
 *
 * ⚠️ Normalmente NO necesitas llamar esto en producción
 */
export function resetStripeInstance(): void {
  stripePromise = null
}

/**
 * Verifica si Stripe está cargado
 *
 * Útil para:
 * - Mostrar loading states en UI
 * - Validar antes de procesar pagos
 * - Debugging
 *
 * @returns true si Stripe está inicializado
 */
export async function isStripeLoaded(): Promise<boolean> {
  if (stripePromise === null) {
    return false
  }

  const stripe = await stripePromise
  return stripe !== null
}

/**
 * IMPORTANTE: Uso correcto de este módulo
 *
 * ✅ Correcto:
 * ```typescript
 * const stripe = await getStripe()
 * if (stripe) {
 *   const { error, paymentMethod } = await stripe.createPaymentMethod(...)
 * }
 * ```
 *
 * ❌ Incorrecto:
 * ```typescript
 * const stripe = getStripe() // Falta await
 * stripe.createPaymentMethod(...) // Error: stripe es una Promise
 * ```
 *
 * ❌ Incorrecto:
 * ```typescript
 * import Stripe from 'stripe' // Esto es el SDK de SERVIDOR
 * // Nunca uses el SDK de servidor en el cliente
 * ```
 */

export type { Stripe } from '@stripe/stripe-js'
