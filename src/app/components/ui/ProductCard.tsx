'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'

interface ProductCardProps {
  href: string
  imageUrl: string 
  name: string
  price: number
  
}

const ProductCard = ({ href, imageUrl, name, price }: ProductCardProps) => {
  
  const handleAddToCart = () => {
    console.log(`Producto ${name} agregado al carrito!`)
  }

  const handleAddToFavorites = () => {
    console.log(`Producto ${name} agregado a favoritos!`)
  }

  const handleViewDetails = () => {
    window.location.href = href
  }
  // Validación para evitar src vacío
  if (!imageUrl || !name || !href) {
    return null // No renderiza si faltan datos críticos
  }

  return (
    <div className="group block rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-xl border border-neutral-light/50">
      {/* Link solo para la imagen y información */}
      <Link href={href} className="block">
        <div className="relative h-64 w-full bg-neutral-light">
          <Image
            src={imageUrl}
            alt={name}
            fill
            style={{ objectFit: 'contain' }}
            className="group-hover:scale-105 transition-transform duration-300 p-4"
            onError={() => {
              console.log('Error cargando imagen:', imageUrl)
            }}
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
