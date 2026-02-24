'use client'

import { useState } from 'react'
import Image from 'next/image'
import QuantitySelector from '@/app/components/ui/QuantitySelector'
import Button from '@/app/components/ui/Button'
import { CheckSquare, XCircle } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'
import { Heart } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Product } from '@/types'

// interface Product {
//   id: string
//   name: string
//   price: number
//   imageUrl: string[]
//   href: string
//   description?: string
// }

interface ProductDetailClientProps {
  product: Product
}

export default function ProductDetailClient({
  product,
}: ProductDetailClientProps) {
  // Validar que el producto tenga al menos una imagen
  const validImages =
    product.images && product.images.length > 0
      ? product.images
      : ['/images/empty-cart.png']
  const [activeImage, setActiveImage] = useState(validImages[0])
  const [quantity, setQuantity] = useState(1)
  const isOutOfStock = product.stock === 0
  const { addToCart } = useCart()
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const favorite = isFavorite(product.id)

  const handleIncrement = () => {
    setQuantity(prev => {
      if (prev < product.stock) {
        return prev + 1
      }
      return prev
    })
  }

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1))
  }

  const handleAddToCart = () => {
    addToCart(product, quantity)
  }

  const toggleFavorite = () => {
    if (favorite) {
      removeFromFavorites(product.id)
    } else {
      addToFavorites(product)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* === COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES === */}
        <div className="flex flex-col gap-4">
          {/* Imagen principal */}
          <div className="relative w-full aspect-square rounded-r-lg overflow-hidden shadow-lg">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
              style={{ objectFit: 'contain' }}
              className="bg-neutral-light p-4 transition-opacity duration-300"
              key={activeImage} // <-- 'key' fuerza a React a recargar la imagen en el cambio
            />
          </div>
          {/* Miniaturas (Thumbnails) */}
          <div className="grid grid-cols-5 gap-2">
            {validImages.map((image, index) => (
              <div
                key={index}
                className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${activeImage === image ? 'border-primary' : 'border-transparent'}`}
                onClick={() => setActiveImage(image)}
              >
                <Image
                  src={image}
                  alt={`${product.name} - vista ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 20vw, (max-width: 1024px) 12vw, 10vw"
                  style={{ objectFit: 'contain' }}
                  className="bg-neutral-light p-1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* === COLUMNA DERECHA: INFORMACIÓN Y ACCIONES === */}
        <div>
          {/* Título del producto */}
          <h1 className="text-3xl lg-text-4xl font-sans font-bold text-dark">
            {product.name}
          </h1>
          {/* Precio y aclaración de impuestos */}
          <div className="flex items-baseline mt-4">
            <p className="text-3xl font-serif text-primary">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
              }).format(product.price)}
            </p>
            <span className="text-lg font-serif text-neutral-medium ml-2">
              IVA incluido
            </span>
          </div>
          {/* Descripción del Producto */}
          <div className="prose prose-lg max-w-none text-neutral-medium mt-6 leading-relaxed font-serif">
            {product.description ? (
              <ReactMarkdown
                components={{
                  // Personalizar componentes para mejor integración con Tailwind
                  p: ({ children }) => <p className="mb-4">{children}</p>,
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold mb-2">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {product.description}
              </ReactMarkdown>
            ) : (
              <p className="text-neutral-medium italic">
                No hay descripción disponible para este producto.
              </p>
            )}
          </div>

          {/* Panel de acciones */}
          <div className="mt-8">
            {/* Disponibilidad */}
            <div className="flex items-center gap-2 mb-4">
              {isOutOfStock ? (
                <>
                  <XCircle size={20} className="text-secondary" />
                  <span className="font-semibold text-secondary">
                    Sin existencias (Agotado)
                  </span>
                </>
              ) : (
                <>
                  <CheckSquare size={20} className="text-green-600" />
                  <span className="font-semibold text-neutral-medium">
                    Hay existencias ({product.stock} disponibles)
                  </span>
                </>
              )}
            </div>

            {/* Selector y Botón Principal */}
            <div className="flex items-center gap-4">
              <QuantitySelector
                quantity={quantity}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                disabled={isOutOfStock}
              />
              <Button
                variant="secondary" // Tu botón rojo
                className="flex-grow py-3 text-lg" // Hacemos el botón más grande
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
              </Button>
              <button
                onClick={toggleFavorite}
                aria-label={
                  favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
                }
                className={`p-3 rounded-md border transition-colors ${favorite
                  ? 'border-primary text-primary'
                  : 'border-neutral-light text-neutral-medium hover:text-primary hover:border-primary'
                  }`}
                title={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart className={favorite ? 'fill-current' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
