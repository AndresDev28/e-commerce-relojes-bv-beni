// components/ui/QuantitySelector.tsx
'use client'
import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  disabled?: boolean
}

const QuantitySelector = ({ quantity, onIncrement, onDecrement, disabled = false }: QuantitySelectorProps) => {
  return (
    <div className={`flex items-center border border-neutral-dark rounded-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button onClick={onDecrement} className='p-3 hover:bg-neutral-light transition-colors' disabled={disabled}>
        <Minus size={16} />
      </button>
      <span className='px-4 font-semibold font-sans text-primary'>{quantity}</span>
      <button onClick={onIncrement} className="p-3 hover:bg-neutral-light transition-colors" disabled={disabled}>
        <Plus size={16} />
      </button>
    </div>
  )
}

export default QuantitySelector