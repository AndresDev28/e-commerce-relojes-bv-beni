'use client'

import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  variant?: 'error' | 'warning' | 'info'
  suggestion?: string
  onDismiss?: () => void
  className?: string
}

export default function ErrorMessage({
  message,
  variant = 'error',
  suggestion,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-secondary text-red-900',
      icon: 'text-secondary',
      button: 'text-secondary hover:text-red-700',
      ring: 'focus:ring-secondary',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-400 text-yellow-900',
      icon: 'text-yellow-600',
      button: 'text-yellow-600 hover:text-yellow-700',
      ring: 'focus:ring-yellow-500',
    },
    info: {
      container: 'bg-blue-50 border-primary text-blue-900',
      icon: 'text-primary',
      button: 'text-primary hover:text-blue-700',
      ring: 'focus:ring-primary',
    },
  }[variant]

  const Icon = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[variant]

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

  return (
    <div
      className={`
        p-4 rounded-md border
        ${variantStyles.container}
        ${className}
        transition-all duration-300 ease-in-out
        animate-in fade-in slide-in-from-top-2
      `}
      {...ariaProps}
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${variantStyles.icon}`}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-sans font-semibold leading-relaxed">
            {message}
          </p>

          {suggestion && (
            <p className="mt-1.5 text-xs font-sans opacity-90 leading-relaxed">
              {suggestion}
            </p>
          )}
        </div>

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
