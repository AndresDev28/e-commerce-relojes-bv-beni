'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'

interface ProductCardProps {
  href: string
  imageUrl: string | string[]
  name: string
  price: number
}

const ProductCard = ({ href, imageUrl, name, price }: ProductCardProps) => {
  // Si imageUrl es un array, usar la primera imagen, si no, usar la string directamente
  const mainImageUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl
  const handleAddToCart = () => {
    console.log(`Producto ${name} agregado al carrito!`)
  }

  const handleAddToFavorites = () => {
    console.log(`Producto ${name} agregado a favoritos!`)
  }

  const handleViewDetails = () => {
    window.location.href = href
  }

  return (
    <div className="group block rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-xl border border-neutral-light/50">
      {/* Link solo para la imagen y información */}
      <Link href={href} className="block">
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

      {/* Acciones fuera del Link */}
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
