import ProductCard from '../components/ui/ProductCard'
import { featuredProducts } from '@/lib/data'

export default function ProductsPage() {
  return (
    <section className="bg-light py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-12">
          Todos los Relojes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            // Comprobación de seguridad
            (product.images && product.images.length > 0) && (
              <ProductCard
              key={product.id}
              href={product.href}
              imageUrl={product.images[0]} // pasamos solo la primera imagen del array
              name={product.name}
              price={product.price}
            />
            )  
          ))}
        </div>
      </div>
    </section>
  )
}
