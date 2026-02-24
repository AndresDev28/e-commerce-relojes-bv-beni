'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'
import { Product } from '@/types'
import { useFavorites } from '@/context/FavoritesContext'
import { useCart } from '@/context/CartContext'

// Permite usar el componente con un objeto `product` o con props sueltos.
type ProductCardProps =
  | {
    product: Product
  }
  | {
    href: string
    imageUrl: string | string[]
    name: string
    price: number
  }

const ProductCard = (props: ProductCardProps) => {
  // Normaliza props para soportar ambas firmas
  const href = 'product' in props ? props.product.href : props.href
  const rawImages = 'product' in props ? props.product.images : props.imageUrl
  const name = 'product' in props ? props.product.name : props.name
  const price = 'product' in props ? props.product.price : props.price

  // Usa la primera imagen disponible; admite string o array
  const mainImageUrl = Array.isArray(rawImages) ? rawImages[0] : rawImages

  const { addToCart } = useCart()
  const isOutOfStock = 'product' in props ? props.product.stock === 0 : false

  const handleAddToCart = () => {
    if ('product' in props) {
      if (props.product.stock > 0) {
        addToCart(props.product, 1)
      } else {
        console.warn(`[AND-99] No stock for ${name}`)
      }
    } else {
      console.warn('Real add to cart limited to product objects')
    }
  }

  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const productId = 'product' in props ? props.product.id : undefined
  const favorite = productId ? isFavorite(productId) : false
  const handleToggleFavorite = () => {
    if (!productId || !('product' in props)) return
    if (favorite) removeFromFavorites(productId)
    else addToFavorites(props.product)
  }

  const handleViewDetails = () => {
    window.location.href = href || '#'
  }

  return (
    <div className="group block rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-xl border border-neutral-light/50">
      {/* Enlace a la ficha del producto */}
      <Link href={href || '#'} className="block">
        <div className="relative h-64 w-full bg-neutral-light">
          <Image
            src={mainImageUrl}
            alt={name}
            fill
            style={{ objectFit: 'contain' }}
            className="group-hover:scale-105 transition-transform duration-300 p-4"
          />
        </div>

        <div className="flex flex-col flex-grow p-4">
          <h3 className="font-sans font-semibold text-base text-dark truncate mb-1">
            {name}
          </h3>
          <p className="font-serif text-lg text-primary mt-auto pt-2">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(price)}
          </p>
        </div>
      </Link>

      {/* Acciones rápidas */}
      <div className="p-4 pt-2 flex items-center justify-around border-t border-neutral-light">
        <ProductActionIcon
          icon={Heart}
          label={favorite ? 'Quitar' : 'Favoritos'}
          onClick={handleToggleFavorite}
        />
        <div className="border-r h-8 border-neutral-light"></div>
        <ProductActionIcon
          icon={ShoppingCart}
          label={isOutOfStock ? 'Agotado' : 'Carrito'}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        />
        <div className="border-r h-8 border-neutral-light"></div>
        <ProductActionIcon
          icon={Eye}
          label="Detalles"
          onClick={handleViewDetails}
        />
      </div>
    </div>
  )
}

export default ProductCard
