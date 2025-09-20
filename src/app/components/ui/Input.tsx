// src/app/components/ui/Input.tsx
'use client'
import React from 'react'
import clsx from 'clsx'

type InputVariant = 'default' | 'search' | 'error'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  variant?: InputVariant
  error?: string
  helperText?: string
  icon?: React.ReactNode // <-- AÑADIMOS LA PROP PARA EL ICONO
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      icon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'w-full px-4 py-3 rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-[#3A3A3C] text-light border-neutral-dark focus:ring-primary'

    // El div contenedor ahora es 'relative' para posicionar el icono
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-light mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Si pasamos un icono, lo renderizamos aquí con posicionamiento absoluto */}
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              baseStyles,
              // Añadimos padding izquierdo extra si hay un icono
              icon ? 'pl-10' : '',
              className
            )}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <p
            className={clsx(
              'mt-1 text-sm',
              error ? 'text-red-500' : 'text-gray-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
