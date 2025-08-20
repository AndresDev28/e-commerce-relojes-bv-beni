import CategoryCard from './ui/CategoryCard'
import { CategoryItem, StrapiCategory, StrapiImage } from '@/types'

interface CategoryGridProps {
  categories: StrapiCategory[]
}

const CategoryGrid = ({ categories }: CategoryGridProps) => {
  // Transformamos categorías de Strapi a CategoryItem
  const items: CategoryItem[] = categories.map(cat => {
    // Si Strapi trae imagen, la usamos; si no, fallback local por slug
    const media = (cat.image ?? null) as StrapiImage | StrapiImage[] | null
    const image = Array.isArray(media) ? media[0] : media
    const imageUrl = image
      ? `${process.env.NEXT_PUBLIC_STRAPI_API_URL}${image.url}`
      : `/images/categories/${cat.slug}.avif`

    return {
      title: cat.name,
      href: `/tienda?categoria=${cat.slug}`,
      imageUrl,
    }
  })
  return (
    <section className="bg-light py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold font-sans text-center text-dark mb-12">
          Explora nuestras colecciones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(category => (
            <CategoryCard
              key={category.title}
              href={category.href}
              imageUrl={category.imageUrl}
              title={category.title}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategoryGrid
