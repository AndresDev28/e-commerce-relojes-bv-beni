'use client'
import React from 'react'
import { useState } from 'react'
import ProductCard from '../components/ui/ProductCard'
import { featuredProducts } from '@/lib/data'
import ShopLoopHead from '@/app/components/ui/ShopLoopHead'

export default function ProductsPage() {

  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda'}
  ]
  // Estado de ordenación
  const [sortOrder, setSortOrder] = useState('default')

  // Función para manejar el cambio de orden
  const handleSortChange = (newSortValue: string) => {
    setSortOrder(newSortValue);
  }

  const sortedProducts = [...featuredProducts]; // Creamos una copia y así no mutamos el original

  switch (sortOrder) {
  case 'price-asc':
    sortedProducts.sort((a, b) => a.price - b.price);
    break;
  case 'price-desc':
    sortedProducts.sort((a, b) => b.price - a.price);
    break;
  case 'name-asc':
    sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
    break;
  case 'name-desc':
    sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
    break;
  default:
    // Para 'default' o cualquier otro caso, no hacemos nada.
    break;
  }

  return (
    <section className="bg-light py-16 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-12">
          Todos los Relojes
        </h2>
        <ShopLoopHead 
          breadcrumbs={breadcrumbs}
          totalResults={featuredProducts.length}
          currentSort={sortOrder}
          onSortChange={handleSortChange}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedProducts.map(product => (
            // Comprobación de seguridad
            (product.imageUrl && product.imageUrl.length > 0) && (
              <ProductCard
              key={product.id}
              href={product.href}
              imageUrl={product.imageUrl[0]} // pasamos solo la primera imagen del array
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
