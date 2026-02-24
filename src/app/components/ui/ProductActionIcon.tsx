import React from 'react'

interface ProductActionIconProps {
  icon: React.ElementType // Para aceptar un componente de icono (ej. Heart de lucide-react)
  label: string
  onClick?: () => void
  disabled?: boolean
}

const ProductActionIcon = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: ProductActionIconProps) => {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-y-1 transition-colors ${disabled
          ? 'opacity-30 cursor-not-allowed text-neutral-light'
          : 'text-neutral-medium hover:text-primary'
        }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-sans">{label}</span>
    </button>
  )
}

export default ProductActionIcon
