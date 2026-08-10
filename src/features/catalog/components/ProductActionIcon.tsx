import React from 'react'

interface ProductActionIconProps {
  icon: React.ElementType // Para aceptar un componente de icono (ej. Heart de lucide-react)
  label: string
  onClick?: () => void
  disabled?: boolean
  /**
   * When true, the icon is rendered with `fill-current` and the label color
   * switches to the primary color. Used for active/toggled states (e.g. a
   * heart that is already in the user's favorites). Defaults to false.
   */
  filled?: boolean
}

const ProductActionIcon = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  filled = false,
}: ProductActionIconProps) => {
  // Color logic: disabled wins, then active (filled), then default.
  const colorClass = disabled
    ? 'opacity-30 cursor-not-allowed text-neutral-light'
    : filled
      ? 'text-primary hover:text-primary'
      : 'text-neutral-medium hover:text-primary'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-y-1 transition-colors ${colorClass}`}
    >
      <Icon className={`h-6 w-6 ${filled ? 'fill-current' : ''}`} />
      <span className="text-xs font-sans">{label}</span>
    </button>
  )
}

export default ProductActionIcon
