'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { CartItem } from '@/types'
import QuantitySelector from './QuantitySelector'
import { Trash2 } from 'lucide-react'

interface CartItemProps {
  item: CartItem
}

const CartItemRow = ({ item }: CartItemProps) => {
  const { updateQuantity, removeFromCart } = useCart()

  const itemTotalPrice = item.price * item.quantity

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b border-neutral-light">
      {/* Sección Superior (Móvil) / Izquierda (Escritorio) */}
      <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-grow">
        {/* Contenedor de la Imagen */}
        <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-neutral-light">
          <Image
            src={item.images[0]}
            alt={item.name}
            fill
            style={{ objectFit: 'contain' }}
            className="p-1"
          />
        </div>
        <div>
          <Link
            href={item.href}
            className="font-sans font-semibold text-dark hover:text-primary transition-colors"
          >
            {item.name}
          </Link>
          <p className="font-serif text-neutral-medium text-sm mt-1 sm:hidden">
            Precio unitario:{' '}
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(item.price)}
          </p>
        </div>
      </div>

      {/* Sección inferior (Móvil) / Derecha (Escritorio) */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:gap-4">
        {/* Columna  Selector de Cantidad */}
        <div className="flex-shrink-0">
          <QuantitySelector
            quantity={item.quantity}
            onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
            onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
          />
        </div>

        {/* Columna  Precio Total del Item */}
        <div className="flex-shrink-0 w-24 text-right">
          <p className="font-sans font-semibold text-dark">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(itemTotalPrice)}
          </p>
        </div>

        {/* Columna  Botón de eliminar Item */}
        <div className="flex-shrink-0">
          <button
            onClick={() => removeFromCart(item.id)}
            className="p-2 text-neutral-medium hover:text-secondary transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartItemRow

/** Comentarios Explicativos
 * Props: El componente espera un item: CartItem que le pasamos desde CartPage
 * Contenedor de la Imagen: Creamos un div con relative h-24 w-24 para que el fill de Image sepa que espacio ocupar
 * Estructuras de Columnas: Flexbox (grow y shrink) para un layout robusto que sea responsive. La info del producto crece mientras que el selector de cantidad y el botón de eliminar mantienen su tamano fijo
 * Lógica conectada: QuantitySelector conectada a la función updateQuantity y el botón de Trash2 para eliminar el item con removeFromCart
 */
