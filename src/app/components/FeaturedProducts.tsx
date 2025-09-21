import ProductCard from '@/app/components/ui/ProductCard'
import { Product, StrapiImage, StrapiProduct } from '@/types'

interface FeaturedProductsProps {
  products: StrapiProduct[]
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  // Evita render si no hay datos
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
            // Normaliza media (acepta `image` o `images`, objeto o array)
            const mediaData =
              strapiProduct.images ?? strapiProduct.image ?? null
            const imagesArray: StrapiImage[] = Array.isArray(mediaData)
              ? mediaData
              : mediaData
                ? [mediaData]
                : []

            // Normaliza categoría (objeto o array)
            const categoryName = Array.isArray(strapiProduct.category)
              ? strapiProduct.category[0]?.name
              : strapiProduct.category?.name

            const productForCard: Product = {
              id: strapiProduct.id.toString(),
              name: strapiProduct.name || 'Sin nombre',
              price: strapiProduct.price || 0,
              images: imagesArray.map(img => {
                if (!img || !img.url) return '/images/empty-cart.png'
                return img.url.startsWith('http')
                  ? img.url
                  : `http://127.0.0.1:1337${img.url}`
              }),
              href: `/tienda/${strapiProduct.slug || 'producto-sin-slug'}`,
              description: strapiProduct.description || '',
              category: categoryName,
              stock: strapiProduct.stock || 0,
            }

            // Placeholder si no hay imágenes
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
