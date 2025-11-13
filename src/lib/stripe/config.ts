/**
 * Configuración de Stripe
 *
 * [PAY-01] Instalar y configurar Stripe SDK
 * [PAY-21] Verificar tokenización y seguridad
 * Ticket: AND-10, AND-30
 *
 * Este archivo gestiona:
 * 1. Validación de claves de API
 * 2. Separación de ambientes (dev/prod)
 * 3. Seguridad (no exponer claves secretas)
 *
 * ================================================================
 * 🔒 SECURITY - API KEY MANAGEMENT
 * ================================================================
 * Stripe uses two types of API keys:
 *
 * 1. PUBLISHABLE KEYS (pk_test_* / pk_live_*):
 *    - ✅ Safe to expose in browser/frontend code
 *    - ✅ Can only create tokens and tokenize card data
 *    - ✅ Cannot process payments or access sensitive data
 *    - ✅ Exposed via NEXT_PUBLIC_ prefix
 *
 * 2. SECRET KEYS (sk_test_* / sk_live_*):
 *    - ❌ NEVER expose in browser/frontend code
 *    - ❌ Can process payments and access all data
 *    - ❌ NEVER use NEXT_PUBLIC_ prefix
 *    - ✅ Only used in server-side code (API routes)
 *
 * This separation ensures that even if frontend code is compromised,
 * attackers cannot process payments or access sensitive data.
 * ================================================================
 */

/**
 * Obtiene la clave pública de Stripe desde variables de entorno
 *
 * ¿Por qué NEXT_PUBLIC_?
 * - Next.js solo expone al navegador variables que empiezan con NEXT_PUBLIC_
 * - Las claves públicas (pk_) son SEGURAS de exponer
 * - Las claves secretas (sk_) NUNCA deben tener NEXT_PUBLIC_
 *
 * @returns Clave pública de Stripe
 * @throws Error si la clave no está configurada o es inválida
 */

import type { StripeEnvironment } from '@/types'
export function getStripePublishableKey(): string {
  // Obtener la clave desde variables de entorno
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  // Validación 1: La clave debe existir
  if (!key) {
    throw new Error(
      'Stripe publishable key is not configured. ' +
        'Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file.'
    )
  }

  // Validación 2: La clave debe tener formato correcto
  // Formato válido: pk_test_... o pk_live_...
  const isValidFormat = /^pk_(test|live)_/.test(key)

  if (!isValidFormat) {
    throw new Error(
      'Invalid Stripe publishable key format. ' +
        'Key must start with "pk_test_" or "pk_live_".'
    )
  }

  // Validación 3: En desarrollo, solo permitir claves de test
  if (process.env.NODE_ENV === 'development' && !key.startsWith('pk_test_')) {
    throw new Error(
      'Development environment must use test keys (pk_test_). ' +
        'Production keys (pk_live_) are not allowed in development.'
    )
  }

  return key
}

/**
 * Verifica si estamos en modo test
 *
 * Útil para:
 * - Mostrar banners en la UI ("Modo de prueba")
 * - Deshabilitar ciertas funcionalidades en test
 * - Logging adicional en desarrollo
 *
 * @returns true si la clave es de test (pk_test_)
 */
export function isTestMode(): boolean {
  try {
    const key = getStripePublishableKey()
    return key.startsWith('pk_test_')
  } catch {
    // Si no hay clave configurada, asumimos test mode
    return true
  }
}

/**
 * Obtiene el ambiente actual
 *
 * @returns 'test' | 'live'
 */
export function getStripeEnvironment(): StripeEnvironment {
  return isTestMode() ? 'test' : 'live'
}

/**
 * IMPORTANTE: Seguridad
 *
 * ❌ NO exponemos funciones para obtener claves secretas
 * ❌ Las claves secretas (sk_) SOLO deben usarse en el servidor
 * ❌ Nunca uses NEXT_PUBLIC_ para claves secretas
 *
 * ✅ Las claves públicas (pk_) son seguras de exponer
 * ✅ Solo pueden crear tokens, no procesar pagos
 * ✅ El procesamiento real ocurre en el servidor
 */

// NO implementar:
// export function getStripeSecretKey() { ... } ❌

/**
 * Configuración exportada
 *
 * Ejemplo de uso:
 * ```typescript
 * import { getStripePublishableKey, isTestMode } from '@/lib/stripe/config'
 *
 * const publishableKey = getStripePublishableKey()
 * if (isTestMode()) {
 *   console.log('Running in test mode')
 * }
 * ```
 */
export const stripeConfig = {
  getPublishableKey: getStripePublishableKey,
  isTestMode,
  getEnvironment: getStripeEnvironment,
} as const
