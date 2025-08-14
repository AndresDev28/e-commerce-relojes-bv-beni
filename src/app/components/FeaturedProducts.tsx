// src/app/components/FeaturedProducts.tsx

import ProductCard from '@/app/components/ui/ProductCard'
import { Product } from '@/types'

// --- TIPOS DE STRAPI: La versión final y correcta ---

// Tipo para una sola imagen
interface StrapiImage {
  id: number
  attributes: {
    url: string
  }
}

// Tipo para una sola categoría dentro del 'data'
interface StrapiCategory {
  id: number
  attributes: {
    name: string
    slug: string
  }
}

// Relación de media en Strapi puede ser una sola imagen o array
interface StrapiMediaRelation {
  data: StrapiImage | StrapiImage[] | null
}

// Tipo para los atributos de un producto
interface StrapiProductAttributes {
  name: string
  price: number
  slug: string
  description: string | null
  stock: number
  image: StrapiMediaRelation // Puede ser único o arreglo
  images?: StrapiMediaRelation // Alternativa si el campo es múltiple y se llama 'images'
  category: {
    data: StrapiCategory // <-- 'category' contiene un objeto 'data' que es una sola StrapiCategory
  }
}

// El tipo final para un producto completo que viene de la API
interface StrapiProduct {
  id: number
  attributes: StrapiProductAttributes
}

// --- FIN DE LOS TIPOS DE STRAPI ---

interface FeaturedProductsProps {
  products: StrapiProduct[]
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  // Añadimos una guarda por si los productos no llegan
  if (!products) {
    return null
  }

  return (
    <section className="bg-neutral-light py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold font-sans text-center text-dark mb-12">
          Los más deseados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(strapiProduct => {
            const attributes = strapiProduct?.attributes
            if (!attributes) return null
            // Transformamos los datos
            const mediaData =
              (attributes.images ?? attributes.image)?.data ?? null
            const imagesArray: StrapiImage[] = Array.isArray(mediaData)
              ? mediaData
              : mediaData
                ? [mediaData]
                : []

            const productForCard: Product = {
              id: strapiProduct.id.toString(),
              name: attributes.name,
              price: attributes.price,
              // Normalizamos para soportar imagen única o múltiple
              images: imagesArray.map(
                img =>
                  `${process.env.NEXT_PUBLIC_STRAPI_API_URL}${img.attributes.url}`
              ),
              href: `/tienda/${attributes.slug}`,
              description: attributes.description || '',
              // Y esta también
              category: attributes.category?.data?.attributes?.name,
              stock: attributes.stock,
            }

            // Si no hay imágenes, añadimos un placeholder para evitar errores en <Image />
            if (!productForCard.images || productForCard.images.length === 0) {
              productForCard.images = ['/images/empty-cart.png']
            }

            return (
              <ProductCard key={productForCard.id} product={productForCard} />
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FeaturedProducts
