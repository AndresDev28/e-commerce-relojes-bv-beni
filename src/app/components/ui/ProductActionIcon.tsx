import React from 'react'

interface ProductActionIconProps {
  icon: React.ElementType // Para aceptar un componente de icono (ej. Heart de lucide-react)
  label: string
  onClick?: () => void
}

const ProductActionIcon = ({
  icon: Icon,
  label,
  onClick,
}: ProductActionIconProps) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-y-1 text-neutral-medium hover:text-primary transition-colors"
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-sans">{label}</span>
    </button>
  )
}

export default ProductActionIcon
