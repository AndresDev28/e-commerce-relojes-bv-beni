'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'
import { Product } from '@/types'

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
  const handleAddToCart = () => {
    console.log(`Producto ${name} agregado al carrito!`)
  }

  const handleAddToFavorites = () => {
    console.log(`Producto ${name} agregado a favoritos!`)
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
          label="Favoritos"
          onClick={handleAddToFavorites}
        />
        <div className="border-r h-8 border-neutral-light"></div>
        <ProductActionIcon
          icon={ShoppingCart}
          label="Carrito"
          onClick={handleAddToCart}
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
