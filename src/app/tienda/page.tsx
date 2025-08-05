'use client'
import React from 'react'
import { useState, useMemo } from 'react'
import ProductCard from '@/app/components/ui/ProductCard'
import { featuredProducts } from '@/lib/data'
import ShopLoopHead from '@/app/components/ui/ShopLoopHead'

export default function ProductsPage() {
  // --- SECCIÓN 1: DATOS Y ESTADO ---

  // Datos estáticos para los breadcrumbs.
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda'}
  ]

  // Estado para controlar qué categoría está activa. Es el "cerebro" del filtro.
  const [activeCategory, setActiveCategory] = useState('Todos')
  
  // Estado para controlar el criterio de ordenación.
  const [sortOrder, setSortOrder] = useState('default')

  // --- SECCIÓN 2: LÓGICA DE DATOS OPTIMIZADA ---

  // Usamos useMemo para evitar recalcular la lista de productos en cada renderizado.
  // Esta lógica solo se volverá a ejecutar si 'activeCategory' o 'sortOrder' cambian.
  const displayProducts = useMemo(() => {
    // Primero, filtramos los productos basados en la categoría activa.
    const filtered = featuredProducts.filter(product => 
      activeCategory === 'Todos' ? true : product.category === activeCategory
    );

    // Segundo, ordenamos la lista filtrada. Creamos una copia para no mutar el original.
    const sorted = [...filtered];
    switch (sortOrder) {
      case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
      case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
      case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      default: break;
    }
    
    return sorted;
  }, [activeCategory, sortOrder]); // Dependencias: el array que activa el recálculo.

  // --- SECCIÓN 3: RENDERIZADO (LA VISTA) ---
  
  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-8">
          Todos los Relojes
        </h2>
        
        {/* Renderizamos el componente "cabecera" y le pasamos todo lo que necesita. */}
        <ShopLoopHead 
          breadcrumbs={breadcrumbs}
          totalResults={displayProducts.length}
          activeCategory={activeCategory}        // Le pasamos el estado actual
          onCategoryChange={setActiveCategory}  // Le pasamos la función para que el hijo pueda cambiar el estado del padre
          currentSort={sortOrder}               // Le pasamos el estado actual
          onSortChange={setSortOrder}           // Le pasamos la función para cambiar el estado
        />
        
        {/* Cuadrícula de Productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product} // Le pasamos el objeto de producto completo
            />
          ))}
        </div>
      </div>
    </section>
  )
}
