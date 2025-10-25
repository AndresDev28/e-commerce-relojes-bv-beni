/**
 * Mapeador de códigos de error de Stripe a mensajes en español
 *
 * [PAY-06] Implementar manejo de errores de Stripe
 * Ticket: AND-15
 *
 * Este archivo contiene:
 * 1. Mensajes de error traducidos al español
 * 2. Sugerencias de acción para el usuario
 * 3. Mensajes por defecto para errores desconocidos
 *
 * Basado en: https://stripe.com/docs/error-codes
 * Y: https://stripe.com/docs/declines/codes
 */

/**
 * Mapa de códigos de error de Stripe a mensajes en español
 *
 * Cubre los casos más comunes:
 * - Tarjetas rechazadas
 * - Tarjetas caducadas
 * - Errores de validación (CVC, número, fecha)
 * - Fondos insuficientes
 * - Errores de red
 * - Errores del servidor
 */
export const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  // ========================================
  // ERRORES DE TARJETA DECLINADA
  // ========================================

  /**
   * Tarjeta rechazada genérica
   * El banco rechazó el pago sin dar detalles
   */
  card_declined: 'Tu tarjeta fue rechazada. Por favor, contacta con tu banco.',

  /**
   * Rechazo genérico sin más detalles
   */
  generic_decline: 'Tu tarjeta fue rechazada. Intenta con otra tarjeta.',

  // ========================================
  // ERRORES DE TARJETA CADUCADA
  // ========================================

  /**
   * La tarjeta ya expiró
   */
  expired_card: 'Tu tarjeta ha caducado. Por favor, usa otra tarjeta.',

  // ========================================
  // ERRORES DE CÓDIGO DE SEGURIDAD (CVC/CVV)
  // ========================================

  /**
   * El CVC/CVV es incorrecto
   * (Los 3 o 4 dígitos en el reverso)
   */
  incorrect_cvc: 'El código de seguridad (CVV/CVC) es incorrecto.',

  // ========================================
  // ERRORES DE NÚMERO DE TARJETA
  // ========================================

  /**
   * El número de tarjeta es incorrecto
   */
  incorrect_number: 'El número de tarjeta es incorrecto.',

  /**
   * El número de tarjeta no es válido
   * (No pasa el algoritmo de Luhn)
   */
  invalid_number: 'El número de tarjeta no es válido.',

  // ========================================
  // ERRORES DE FECHA DE EXPIRACIÓN
  // ========================================

  /**
   * Mes de expiración inválido (no es 01-12)
   */
  invalid_expiry_month: 'El mes de expiración no es válido.',

  /**
   * Año de expiración inválido
   */
  invalid_expiry_year: 'El año de expiración no es válido.',

  /**
   * La fecha de expiración está en el pasado
   */
  invalid_expiry_month_past: 'La fecha de expiración está en el pasado.',

  // ========================================
  // ERRORES DE FONDOS
  // ========================================

  /**
   * No hay fondos suficientes en la cuenta
   */
  insufficient_funds: 'Tu tarjeta no tiene fondos suficientes.',

  // ========================================
  // ERRORES DE PROCESAMIENTO
  // ========================================

  /**
   * Error al procesar el pago (temporal)
   */
  processing_error: 'Hubo un error al procesar el pago. Intenta de nuevo.',

  /**
   * El banco emisor no está disponible
   */
  issuer_not_available: 'El banco emisor no está disponible. Intenta más tarde.',

  // ========================================
  // AUTENTICACIÓN REQUERIDA (3D Secure)
  // ========================================

  /**
   * El banco requiere autenticación adicional
   * (Por ejemplo, 3D Secure)
   */
  authentication_required: 'Tu banco requiere autenticación adicional.',

  // ========================================
  // TARJETA NO SOPORTADA
  // ========================================

  /**
   * Tipo de tarjeta no compatible
   */
  card_not_supported: 'Este tipo de tarjeta no es compatible.',

  // ========================================
  // LÍMITES EXCEDIDOS
  // ========================================

  /**
   * Demasiadas transacciones en poco tiempo
   */
  card_velocity_exceeded:
    'Has realizado demasiadas transacciones. Intenta más tarde.',

  // ========================================
  // TARJETA PERDIDA/ROBADA
  // ========================================

  /**
   * La tarjeta fue reportada como perdida
   */
  lost_card: 'Esta tarjeta fue reportada como perdida.',

  /**
   * La tarjeta fue reportada como robada
   */
  stolen_card: 'Esta tarjeta fue reportada como robada.',

  // ========================================
  // ERRORES DE RED
  // ========================================

  /**
   * Sin conexión a internet
   */
  network_error: 'Sin conexión. Verifica tu internet.',

  // ========================================
  // ERRORES DEL SERVIDOR
  // ========================================

  /**
   * Error del servidor de Stripe
   */
  api_error: 'Error del servidor de pagos. Intenta de nuevo en unos minutos.',

  // ========================================
  // TIMEOUT
  // ========================================

  /**
   * La petición tardó demasiado
   */
  timeout: 'Tiempo de espera agotado. Por favor, intenta de nuevo.',
}

/**
 * Mensaje de error por defecto
 *
 * Se usa cuando:
 * - El código de error no está en el mapa
 * - El error es desconocido
 * - No se pudo procesar el error
 */
export const DEFAULT_ERROR_MESSAGE =
  'Hubo un problema al procesar tu pago. Por favor, intenta de nuevo.'

/**
 * Sugerencias de acción para cada tipo de error
 *
 * Le indica al usuario qué hacer para solucionar el problema
 *
 * Ejemplo:
 * - Error: "Tu tarjeta fue rechazada"
 * - Sugerencia: "Contacta con tu banco o intenta con otra tarjeta"
 */
export const ERROR_SUGGESTIONS: Record<string, string> = {
  /**
   * Tarjeta rechazada - Sugerir contactar banco
   */
  card_declined: 'Contacta con tu banco o intenta con otra tarjeta.',

  /**
   * Tarjeta caducada - Sugerir usar otra
   */
  expired_card: 'Por favor, usa una tarjeta válida.',

  /**
   * CVC incorrecto - Indicar dónde encontrarlo
   */
  incorrect_cvc:
    'Verifica el código de 3 o 4 dígitos en el reverso de tu tarjeta.',

  /**
   * Fondos insuficientes - Sugerir otra forma de pago
   */
  insufficient_funds: 'Intenta con otra tarjeta o forma de pago.',

  /**
   * Error de red - Revisar conexión
   */
  network_error: 'Revisa tu conexión a internet.',

  /**
   * Timeout - Esperar antes de reintentar
   */
  timeout: 'Espera unos segundos antes de intentar nuevamente.',
}
