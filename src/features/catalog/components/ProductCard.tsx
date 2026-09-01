'use client'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'
import { Product } from '@/types'
import { useFavorites } from '@/features/favorites'
import { useFavoriteAuthPrompt } from '@/features/favorites/hooks/useFavoriteAuthPrompt'
import { FavoriteAuthPrompt } from '@/features/favorites/components/FavoriteAuthPrompt'
import { useCart } from '@/features/cart'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { SafeImage } from '@/components/ui/SafeImage'
import { PLACEHOLDER_SRC } from '@/lib/images/url.constants'

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

  // Usa la primera imagen disponible; admite string, array, o undefined (Strapi a veces omite el campo).
  // SafeImage se encarga del fallback a PLACEHOLDER_SRC cuando el src falla
  // (incluyendo el caso undefined/null), así que aquí solo necesitamos
  // garantizar un string que no rompa el render inicial.
  const mainImageUrl = (Array.isArray(rawImages) ? rawImages[0] : rawImages) ?? PLACEHOLDER_SRC

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

  const { isFavorite, error: favoritesError, clearError } = useFavorites()
  const { showAuthPrompt, handleToggleFavorite, goToLogin } = useFavoriteAuthPrompt()
  const productId = 'product' in props ? props.product.id : undefined
  const favorite = productId ? isFavorite(productId) : false
  const onToggleFavorite = () => {
    if (!productId || !('product' in props)) return
    handleToggleFavorite(props.product)
  }

  const handleViewDetails = () => {
    window.location.href = href || '#'
  }

  return (
    <div className="group block rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-xl border border-neutral-light/50">
      {/* Enlace a la ficha del producto */}
      <Link href={href || '#'} className="block">
        <div className="relative h-64 w-full bg-neutral-light">
          <SafeImage
            src={mainImageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
          onClick={onToggleFavorite}
          filled={favorite}
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

      {/* Auth prompt for anonymous favorites.
          The aria-live region stays mounted even when the prompt is hidden
          so screen readers can detect the content change when it appears.
          aria-label ensures the empty region appears in Chrome's accessibility
          tree (Chrome filters empty role="status" elements without a name). */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notificaciones de favoritos"
        className="px-4 pb-3 pt-1"
      >
        {showAuthPrompt && <FavoriteAuthPrompt onLogin={goToLogin} />}
      </div>

      {/* Error feedback when the favorites API fails (e.g., Strapi down).
          ErrorMessage uses role="alert" + aria-live="assertive" which is the
          correct semantic for an error (not a status update). The next
          successful mutation OR the dismiss button clears the error. */}
      {favoritesError && (
        <div className="px-4 pb-3">
          <ErrorMessage
            message={favoritesError}
            variant="error"
            onDismiss={clearError}
          />
        </div>
      )}
    </div>
  )
}

export default ProductCard
