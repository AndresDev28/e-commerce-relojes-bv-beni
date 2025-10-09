'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useFavorites } from '@/context/FavoritesContext'
import { useCart } from '@/context/CartContext'
import { Product } from '@/types'
import { Heart, ShoppingCart } from 'lucide-react'
import Button from './Button'

interface FavoriteItemProps {
  product: Product
}

const FavoriteItemRow = ({ product }: FavoriteItemProps) => {
  const { removeFromFavorites } = useFavorites()
  const { addToCart } = useCart()

  const handleRemoveFromFavorites = () => {
    removeFromFavorites(product.id)
  }

  const handleAddToCart = () => {
    addToCart(product, 1)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-4 border-b border-neutral-light last:border-b-0">
      {/* Sección Imagen y Título */}
      <div className="flex items-center gap-4 w-full sm:flex-grow">
        {/* Imagen del Producto */}
        <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-neutral-light">
          <Image
            src={product.images[0] || '/images/placeholder.png'}
            alt={product.name}
            fill
            style={{ objectFit: 'contain' }}
            className="p-1"
          />
        </div>

        {/* Info del Producto */}
        <div className="flex-grow">
          <Link
            href={product.href || `/tienda/${product.id}`}
            className="font-sans font-semibold text-dark hover:text-primary transition-colors"
          >
            {product.name}
          </Link>
          <p className="font-serif text-neutral-medium text-sm mt-1">
            {product.category || 'Sin categoría'}
          </p>
          <p className="font-sans font-bold text-primary mt-2">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(product.price)}
          </p>
        </div>
      </div>

      {/* Sección Acciones */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Botón Añadir al Carrito */}
        <Button
          variant="primary"
          onClick={handleAddToCart}
          className="flex items-center gap-2"
        >
          <ShoppingCart size={18} />
          <span className="hidden sm:inline">Añadir</span>
        </Button>

        {/* Botón Eliminar de Favoritos */}
        <button
          onClick={handleRemoveFromFavorites}
          className="p-2 text-red-500 hover:text-red-700 transition-colors"
          title="Eliminar de favoritos"
        >
          <Heart size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}

export default FavoriteItemRow

/**
 * Comentarios Explicativos:
 * - Props: Recibe un `product: Product` desde FavoritesPage
 * - Imagen: Usamos el mismo patrón que CartItemRow con `relative h-24 w-24`
 * - Acciones: Dos botones principales:
 *   1. Añadir al carrito (usa el CartContext)
 *   2. Eliminar de favoritos (usa el FavoritesContext)
 * - Responsive: En móvil los botones se apilan, en desktop quedan en línea
 * - Visual: El corazón está relleno (fill) para indicar que es favorito
 */
