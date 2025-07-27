// components/ui/QuantitySelector.tsx
'use client'
import { Minus, Plus} from 'lucide-react'

interface QuantitySelectorProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

const QuantitySelector = ({ quantity, onIncrement, onDecrement }: QuantitySelectorProps) => {
  return (
    <div className='flex items-center border border-neutral-dark rounded-md'>
      <button onClick={onDecrement} className='p-3 hover:bg-neutral-light transition-colors'>
        <Minus size={16} />
      </button>
      <span className='px-4 font-semibold font-sans text-primary'>{quantity}</span>
      <button onClick={onIncrement} className="p-3 hover:bg-neutral-light transition-colors">
        <Plus size={16} />
      </button>
    </div>
  )
}

export default QuantitySelector