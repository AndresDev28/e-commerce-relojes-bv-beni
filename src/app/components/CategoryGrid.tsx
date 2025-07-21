import Link from 'next/link';
import Image from 'next/image';
import CategoryCard from './ui/CategoryCard';
import categories  from '@/lib/data'

const CategoryGrid = () => {
  return (
    <section className='bg-light py-16 md:py-24'>
      <div className='container mx-auto px-4'>
        <h2 className='text-3xl font-bold font-sans text-center text-dark mb-12'>
          Explora Nuestras Colecciones
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
          {categories.map((category) => (
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