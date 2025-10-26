/**
 * Componente ErrorMessage - Reutilizable para mostrar mensajes de error/warning/info
 *
 * [PAY-07] Crear componente ErrorMessage reutilizable
 * Ticket: AND-16
 *
 * Características:
 * - 3 variantes: error (rojo), warning (amarillo), info (azul)
 * - Iconos de lucide-react
 * - Animaciones suaves con Tailwind
 * - Accesible (ARIA)
 * - Responsive
 * - Botón de cierre opcional
 *
 * @example
 * ```tsx
 * <ErrorMessage
 *   message="Tu tarjeta fue rechazada"
 *   variant="error"
 *   suggestion="Contacta con tu banco"
 *   onDismiss={() => setError(null)}
 * />
 * ```
 */

'use client'

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Props del componente ErrorMessage
 */
interface ErrorMessageProps {
  /** Mensaje principal a mostrar */
  message: string
  /** Tipo de mensaje - afecta colores e icono */
  variant?: 'error' | 'warning' | 'info'
  /** Sugerencia adicional (opcional) */
  suggestion?: string
  /** Callback cuando se cierra el mensaje */
  onDismiss?: () => void
  /** Clases CSS adicionales */
  className?: string
}

export default function ErrorMessage({
  message,
  variant = 'error',
  suggestion,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  // ============================================
  // ESTILOS POR VARIANTE
  // ============================================

  /**
   * Obtiene las clases CSS según la variante
   * Usa la paleta de colores del tailwind.config.ts
   */
  const variantStyles = {
    error: {
      // Rojo corporativo (secondary: #DC2626)
      container: 'bg-red-50 border-secondary text-red-900',
      icon: 'text-secondary',
      button: 'text-secondary hover:text-red-700',
      ring: 'focus:ring-secondary',
    },
    warning: {
      // Amarillo/Naranja
      container: 'bg-yellow-50 border-yellow-400 text-yellow-900',
      icon: 'text-yellow-600',
      button: 'text-yellow-600 hover:text-yellow-700',
      ring: 'focus:ring-yellow-500',
    },
    info: {
      // Azul corporativo (primary: #2563EB)
      container: 'bg-blue-50 border-primary text-blue-900',
      icon: 'text-primary',
      button: 'text-primary hover:text-blue-700',
      ring: 'focus:ring-primary',
    },
  }[variant]

  // ============================================
  // ICONOS DE LUCIDE-REACT
  // ============================================

  /**
   * Renderiza el icono apropiado según la variante
   */
  const Icon = {
    error: AlertCircle, // Círculo con X
    warning: AlertTriangle, // Triángulo con !
    info: Info, // Círculo con i
  }[variant]

  // ============================================
  // ACCESIBILIDAD (ARIA)
  // ============================================

  /**
   * role y aria-live según la variante
   * - error: "alert" + "assertive" (interrumpe al lector)
   * - warning/info: "status" + "polite" (espera a que termine de leer)
   */
  const ariaProps = {
    error: {
      role: 'alert' as const,
      'aria-live': 'assertive' as const,
    },
    warning: {
      role: 'status' as const,
      'aria-live': 'polite' as const,
    },
    info: {
      role: 'status' as const,
      'aria-live': 'polite' as const,
    },
  }[variant]

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      // Clases base + variante + animación + responsive
      className={`
        p-4 rounded-md border
        ${variantStyles.container}
        ${className}
        transition-all duration-300 ease-in-out
        animate-in fade-in slide-in-from-top-2
      `}
      // Accesibilidad
      {...ariaProps}
      aria-atomic="true" // Lee todo el contenido
    >
      <div className="flex items-start gap-3">
        {/* Icono - flex-shrink-0 para que no se comprima en mobile */}
        <Icon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${variantStyles.icon}`}
          aria-hidden="true" // Oculto para lectores (decorativo)
        />

        {/* Contenido del mensaje - flex-1 para ocupar espacio disponible */}
        <div className="flex-1 min-w-0">
          {/* Mensaje principal */}
          <p className="text-sm font-sans font-semibold leading-relaxed">
            {message}
          </p>

          {/* Sugerencia (opcional) */}
          {suggestion && (
            <p className="mt-1.5 text-xs font-sans opacity-90 leading-relaxed">
              {suggestion}
            </p>
          )}
        </div>

        {/* Botón de cierre (opcional) */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`
              flex-shrink-0
              ${variantStyles.button}
              transition-colors
              rounded
              p-0.5
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${variantStyles.ring}
            `}
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
