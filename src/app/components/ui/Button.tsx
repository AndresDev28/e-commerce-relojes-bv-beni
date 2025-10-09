import React from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'tertiary' | 'outline'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export default function Button({
  children,
  variant = 'primary',
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  const baseStyles =
    'px-4 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer'
  const variants = {
    primary:
      'bg-primary text-white border border-primary hover:bg-primary-dark hover:border-primary-dark',
    secondary:
      'bg-secondary text-white hover:bg-secondary-dark focus:ring-red-600',
    tertiary:
      'bg-transparent text-light border border-neutral-dark hover:bg-neutral-dark hover:text-light',
    tertiaryDark:
      'bg-transparent text-dark border border-neutral-dark hover:bg-neutral-dark hover:text-light',
    ghost: 'bg-transparent text-light hover:text-primary',
    outline:
      'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white transition-all duration-300',
  }

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
