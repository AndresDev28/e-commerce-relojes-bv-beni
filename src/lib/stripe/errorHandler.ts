/**
 * Manejador central de errores de Stripe
 *
 * [PAY-06] Implementar manejo de errores de Stripe
 * Ticket: AND-15
 *
 * Este archivo contiene:
 * 1. Función principal handleStripeError() - Procesa errores de Stripe
 * 2. Type guards - Detecta si un error es de Stripe
 * 3. Utilidades - Funciones auxiliares para trabajar con errores
 * 4. Logger - Para debugging (solo en desarrollo)
 *
 * Flujo de uso:
 * 1. Stripe devuelve un error
 * 2. handleStripeError() lo procesa
 * 3. Devuelve un objeto StripeError con mensaje en español
 * 4. El componente muestra el mensaje al usuario
 */

import { StripeError as StripeJsError } from '@stripe/stripe-js'
import type { StripeError, StripeErrorType } from '@/types'
import {
  STRIPE_ERROR_MESSAGES,
  DEFAULT_ERROR_MESSAGE,
  ERROR_SUGGESTIONS,
} from './errorMessages'

/**
 * Valida si un string es un tipo de error válido de Stripe
 */
function isValidStripeErrorType(type: string): type is StripeErrorType {
  const validTypes: StripeErrorType[] = [
    'card_error',
    'validation_error',
    'api_error',
    'rate_limit_error',
    'authentication_error',
    'invalid_request_error',
    'network_error',
    'unknown_error',
  ]
  return validTypes.includes(type as StripeErrorType)
}

/**
 * Función principal: Procesa un error de Stripe
 *
 * Esta función:
 * 1. Detecta el tipo de error
 * 2. Busca el mensaje en español correspondiente
 * 3. Registra el error para debugging
 * 4. Devuelve un objeto estructurado
 *
 * @param error - Puede ser:
 *   - Error de Stripe (tiene .type, .code)
 *   - Error genérico de JavaScript
 *   - Cualquier otro valor
 *
 * @returns Objeto StripeError con:
 *   - type: Tipo de error
 *   - code: Código específico (opcional)
 *   - message: Mensaje original (inglés)
 *   - localizedMessage: Mensaje en español para el usuario
 *
 * @example
 * ```typescript
 * // En CheckoutForm.tsx
 * try {
 *   const result = await stripe.confirmCardPayment(...)
 *   if (result.error) {
 *     const processedError = handleStripeError(result.error)
 *     setErrorMessage(processedError.localizedMessage)
 *   }
 * } catch (error) {
 *   const processedError = handleStripeError(error)
 *   console.error(processedError)
 * }
 * ```
 */
export function handleStripeError(error: unknown): StripeError {
  // =============================================
  // CASO 1: Es un error de Stripe
  // =============================================
  if (isStripeError(error)) {
    const code = error.code || 'unknown'
    const type = error.type || 'unknown_error'

    // Buscar mensaje localizado en el mapa
    const localizedMessage =
      STRIPE_ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE

    // Log del error para debugging (NO exponer al usuario)
    logStripeError(error)

    // Devolver error procesado
    return {
      type: isValidStripeErrorType(type) ? type : 'unknown_error',
      code,
      message: error.message || 'Unknown error',
      localizedMessage,
      declineCode: error.decline_code,
      param: error.param,
    }
  }

  // =============================================
  // CASO 2: Error de red o timeout
  // =============================================
  if (error instanceof Error) {
    // Error de red
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return {
        type: 'network_error',
        code: 'network_error',
        message: error.message,
        localizedMessage: STRIPE_ERROR_MESSAGES.network_error,
      }
    }

    // Error de timeout
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        type: 'api_error',
        code: 'timeout',
        message: error.message,
        localizedMessage: STRIPE_ERROR_MESSAGES.timeout,
      }
    }
  }

  // =============================================
  // CASO 3: Error desconocido (fallback)
  // =============================================
  return {
    type: 'unknown_error',
    message: error instanceof Error ? error.message : String(error),
    localizedMessage: DEFAULT_ERROR_MESSAGE,
  }
}

/**
 * Type guard: Detecta si un error es de Stripe
 *
 * Un error de Stripe tiene:
 * - Una propiedad 'type' (ej: 'card_error')
 * - Opcionalmente 'code', 'message', 'decline_code', etc.
 *
 * @param error - Cualquier valor
 * @returns true si es un error de Stripe
 *
 * @example
 * ```typescript
 * if (isStripeError(error)) {
 *   console.log(error.code) // TypeScript sabe que tiene .code
 * }
 * ```
 */
function isStripeError(error: unknown): error is StripeJsError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof (error as { type?: string }).type !== 'undefined'
  )
}

/**
 * Obtiene sugerencia de acción para un error
 *
 * Devuelve un texto que le indica al usuario qué hacer
 *
 * @param code - Código del error (ej: 'card_declined')
 * @returns Sugerencia en español o undefined
 *
 * @example
 * ```typescript
 * const suggestion = getErrorSuggestion('card_declined')
 * // "Contacta con tu banco o intenta con otra tarjeta."
 * ```
 */
export function getErrorSuggestion(code?: string): string | undefined {
  if (!code) return undefined
  return ERROR_SUGGESTIONS[code]
}

/**
 * Logger de errores para debugging
 *
 * En desarrollo:
 * - Muestra el error en consola con formato bonito
 *
 * En producción:
 * - NO muestra nada en consola (por seguridad)
 * - TODO: Enviar a servicio de monitoreo (Sentry, LogRocket, etc)
 *
 * @param error - Error de Stripe a registrar
 */
function logStripeError(error: StripeJsError): void {
  // Solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.group('🔴 Stripe Error')
    console.log('Type:', error.type)
    console.log('Code:', error.code)
    console.log('Message:', error.message)
    console.log('Decline Code:', error.decline_code)
    console.log('Param:', error.param)
    console.groupEnd()
  }

  // TODO [PAY-06]: En producción, enviar a servicio de monitoreo
  // Ejemplos:
  // - Sentry.captureException(error)
  // - LogRocket.captureException(error)
  // - Datadog.logger.error(error)
}

/**
 * Verifica si un error es recuperable
 *
 * Un error recuperable significa que el usuario puede:
 * - Corregir los datos (ej: CVC incorrecto)
 * - Intentar de nuevo (ej: timeout)
 *
 * Un error NO recuperable requiere:
 * - Cambiar de tarjeta (ej: tarjeta caducada)
 * - Contactar al banco (ej: fondos insuficientes)
 *
 * @param error - Error procesado
 * @returns true si el usuario puede reintentar con los mismos datos
 *
 * @example
 * ```typescript
 * if (isRecoverableError(error)) {
 *   // Mostrar botón "Reintentar"
 * } else {
 *   // Mostrar botón "Usar otra tarjeta"
 * }
 * ```
 */
export function isRecoverableError(error: StripeError): boolean {
  // Lista de códigos recuperables
  const recoverableCodes = [
    'incorrect_cvc', // Usuario puede corregir el CVC
    'incorrect_number', // Usuario puede corregir el número
    'invalid_expiry_month', // Usuario puede corregir la fecha
    'invalid_expiry_year', // Usuario puede corregir la fecha
    'network_error', // Puede volver a intentar con internet
    'timeout', // Puede volver a intentar
    'processing_error', // Error temporal, puede reintentar
  ]

  return error.code ? recoverableCodes.includes(error.code) : false
}

/**
 * Verifica si el error requiere cambiar de tarjeta
 *
 * Algunos errores NO se pueden solucionar sin cambiar de tarjeta:
 * - Tarjeta caducada
 * - Tarjeta rechazada
 * - Fondos insuficientes
 * - Tarjeta perdida/robada
 *
 * @param error - Error procesado
 * @returns true si debe usar otra tarjeta
 *
 * @example
 * ```typescript
 * if (requiresDifferentCard(error)) {
 *   // Mostrar mensaje "Por favor, usa otra tarjeta"
 *   // Limpiar el formulario
 * }
 * ```
 */
export function requiresDifferentCard(error: StripeError): boolean {
  // Lista de códigos que requieren cambiar tarjeta
  const cardChangeCodes = [
    'card_declined', // Banco rechazó la tarjeta
    'expired_card', // Tarjeta caducada
    'insufficient_funds', // Sin fondos
    'lost_card', // Reportada como perdida
    'stolen_card', // Reportada como robada
    'card_not_supported', // Tipo no compatible
  ]

  return error.code ? cardChangeCodes.includes(error.code) : false
}
