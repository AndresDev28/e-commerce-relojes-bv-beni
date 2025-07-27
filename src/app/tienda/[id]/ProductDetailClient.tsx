'use client'

import { useState } from 'react'
import Image from 'next/image'
import QuantitySelector from '@/app/components/ui/QuantitySelector'
import Button from '@/app/components/ui/Button'
import { CheckSquare } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  href: string
  description?: string
}

interface ProductDetailClientProps {
  product: Product
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [activeImage, setActiveImage] = useState(product.images[0])
  const [quantity, setQuantity] = useState(1)

  const handleIncrement = () => {
    setQuantity(prev => prev + 1)
  }

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1))
  }

  const handleAddToCart = () => {
    console.log(`Añadiendo ${quantity} x ${product.name} al carrito`)
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12'>
        {/* === COLUMNA IZQUIERDA: GALERÍA DE IMÁGENES === */}
        <div className='flex flex-col gap-4'>
          {/* Imagen principal */}
          <div className='relative w-full aspect-square rounded-r-lg overflow-hidden shadow-lg'>
            <Image
              src={activeImage}
              alt={product.name}
              fill
              style={{ objectFit: 'contain' }}
              className='bg-neutral-light p-4 transition-opacity duration-300'
              key={activeImage} // <-- 'key' fuerza a React a recargar la imagen en el cambio
            />
          </div>
          {/* Miniaturas (Thumbnails) */}
          <div className='grid grid-cols-5 gap-2'>
            {product.images.map((image, index) => (
              <div
                key={index}
                className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${activeImage === image ? 'border-primary' : 'border-transparent'}`}
                onClick={() => setActiveImage(image)}
              >
                <Image 
                  src={image}
                  alt={`${product.name} - vista ${index + 1}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  className='bg-neutral-light p-1'
                />
              </div>
            ))}
          </div>
        </div>

        {/* === COLUMNA DERECHA: INFORMACIÓN Y ACCIONES === */}
        <div>
          {/* Título del producto */}
          <h1 className='text-3xl lg-text-4xl font-sans font-bold text-dark'>
            {product.name}
          </h1>
          {/* Precio y aclaración de impuestos */}
          <div className='flex items-baseline mt-4'>
            <p className='text-3xl font-serif text-primary'>
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR'}).format(product.price)}
            </p>
            <span className='text-lg font-serif text-neutral-medium ml-2'>IVA incluido</span>
          </div>
          {/* Descripción del Producto */}
          <p className='text-lg font-serif text-neutral-medium mt-6 leading-relaxed'>
            {product.description}
          </p>

          {/* Panel de acciones */}
          <div className="mt-8">
            {/* Disponibilidad */}
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare size={20} className="text-green-600" />
              <span className="font-semibold text-neutral-medium">Hay existencias</span>
            </div>

            {/* Selector y Botón Principal */}
            <div className="flex items-center gap-4">
              <QuantitySelector
                quantity={quantity}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
              />
              <Button 
                variant="secondary" // Tu botón rojo
                className="flex-grow py-3 text-lg" // Hacemos el botón más grande
                onClick={handleAddToCart}
              >
                Añadir al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 