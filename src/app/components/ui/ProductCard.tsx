'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import ProductActionIcon from './ProductActionIcon'
import { useCart } from '@/context/CartContext'
import { Product } from '@/types' // El tipo maestro

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();

  const mainImageUrl = product.images[0];

  const handleAddToCart = () => {
    addToCart(product, 1);
    console.log(`Producto ${product.name} agregado al carrito!`)
  }

  const handleAddToFavorites = () => {
    console.log(`Producto ${product.name} agregado a favoritos!`)
  }

  // const handleViewDetails = () => {
  //   window.location.href = href
  // }

  return (
    <div className="group block rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-xl border border-neutral-light/50">
      {/* Link solo para la imagen e información */}
      <Link href={product.href} className="block">
        <div className="relative h-64 w-full bg-neutral-light">
          <Image
            src={mainImageUrl}
            alt={product.name}
            fill
            style={{ objectFit: 'contain' }}
            className="group-hover:scale-105 transition-transform duration-300 p-4"
          />
        </div>

        <div className="flex flex-col flex-grow p-4">
          <h3 className="font-sans font-semibold text-base text-dark truncate mb-1">
            {product.name}
          </h3>
          <p className="font-serif text-lg text-primary mt-auto pt-2">
            {new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
            }).format(product.price)}
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
        <Link href={product.href} className='flex-1 text-center'>
          <ProductActionIcon
            icon={Eye}
            label="Detalles"
          />
        </Link>
      </div>
    </div>
  )
}

export default ProductCard
