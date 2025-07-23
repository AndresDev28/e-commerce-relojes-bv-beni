import ProductCard from './ui/ProductCard'
import { featuredProducts } from '@/lib/data'

const FeatureProducts = () => {
  return (
    <section className="bg-neutral-light py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold font-sans text-center text-dark mb-12">
          Los Más Deseados
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <ProductCard
              key={product.id}
              href={product.href}
              imageUrl={product.imageUrl}
              name={product.name}
              price={product.price}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureProducts
