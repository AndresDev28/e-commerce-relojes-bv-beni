'use client'
import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import ProductCard from '@/app/components/ui/ProductCard'
import ShopLoopHead from '@/app/components/ui/ShopLoopHead'
import { Product, StrapiProduct, StrapiImage } from '@/types'
import { getProducts, getCategories } from '@/lib/api'

export default function ProductsPage() {
  // --- SECCIÓN 1: DATOS Y ESTADO ---

  // Datos estáticos para los breadcrumbs.
  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda' },
  ]

  // Estado para controlar qué categoría está activa. Es el "cerebro" del filtro.
  const [activeCategory, setActiveCategory] = useState('Todos')

  // Estado para controlar el criterio de ordenación.
  const [sortOrder, setSortOrder] = useState('default')

  // Estado para guardar los productos que vienen de la API
  const [products, setProducts] = useState<StrapiProduct[]>([]) // Tipamos useState con el tipo de Strapi de FeaturedProducts

  // Agregamos el estado de carga al llamar a la API
  const [loading, setIsLoading] = useState(true)

  // Hook para hacer la llamada de la API despues de que el componente se haya renderizado
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true) // Empieza la carga (con un spinner o algo parecido)
      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
        setProducts(fetchedProducts)
        setCategoryOptions(
          Array.from(
            new Set(
              fetchedCategories
                .map(c => c.name)
                .filter((n): n is string => Boolean(n))
            )
          )
        )
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setIsLoading(false) // Terminamos de cargar tanto si hay éxito como si hay error
      }
    }

    fetchProducts()
  }, []) // Se ejecuta solo al montar el componente

  // Opciones de categorías para el filtro
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])

  // --- SECCIÓN 2: LÓGICA DE DATOS OPTIMIZADA ---

  // Usamos useMemo para evitar recalcular la lista de productos en cada renderizado.
  // Esta lógica solo se volverá a ejecutar si 'activeCategory' o 'sortOrder' cambian.
  const displayProducts = useMemo(() => {
    // --- PASO 1: TRANSFORMAR LOS DATOS "CRUDOS" DE STRAPI ---
    // Mapeamos el array 'products' que viene de la API a nuestra estructura 'Product' limpia.
    const strapiApiUrl = 'http://127.0.0.1:1337'
    const formattedProducts: Product[] = products
      .filter(strapiProduct => strapiProduct) // Filtramos productos válidos
      .map(strapiProduct => {
        // Según la respuesta JSON, las propiedades están directamente en el objeto del producto
        // No hay un objeto 'attributes' anidado

        // Normalizamos la relación de media para soportar 'image' o 'images', y objeto o array
        const mediaData = strapiProduct.images ?? strapiProduct.image ?? null
        const imagesArray: StrapiImage[] = Array.isArray(mediaData)
          ? mediaData
          : mediaData
            ? [mediaData]
            : []

        const images = imagesArray.map(img => {
          if (!img || !img.url) return '/images/empty-cart.png' // Fallback por si no hay imagen
          // Si la URL es absoluta (Cloudinary) se usa, si es relativa, se le añade el prefijo
          return img.url.startsWith('http')
            ? img.url
            : `${strapiApiUrl}${img.url}`
        })

        // Normalizamos categoría (puede venir como objeto o array)
        const categoryName = Array.isArray(strapiProduct.category)
          ? strapiProduct.category[0]?.name
          : strapiProduct.category?.name

        return {
          id: strapiProduct.id.toString(),
          name: strapiProduct.name || 'Sin nombre',
          price: strapiProduct.price || 0,
          images: images.length > 0 ? images : ['/images/empty-cart.png'],
          href: `/tienda/${strapiProduct.slug || 'producto-sin-slug'}`,
          description: strapiProduct.description || '',
          category: categoryName,
          stock: strapiProduct.stock || 0,
        }
      })
      .filter(product => product !== null) as Product[] // Filtramos productos nulos

    // --- PASO 2: FILTRAR SOBRE LOS DATOS YA TRANSFORMADOS ---
    // Ahora 'product.category' existe y la lógica funciona.
    const filtered = formattedProducts.filter(product =>
      activeCategory === 'Todos' ? true : product.category === activeCategory
    )

    // --- PASO 3: ORDENAR LA LISTA FILTRADA ---
    // Ahora 'a.price' y 'a.name' existen y la lógica funciona.
    const sorted = [...filtered]
    switch (sortOrder) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      default:
        break
    }

    return sorted
  }, [products, activeCategory, sortOrder]) // Las dependencias son correctas.

  // --- SECCIÓN 3: RENDERIZADO (LA VISTA) ---

  return (
    <section className="bg-white py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-sans font-bold text-center text-dark mb-8">
          Todos los relojes
        </h2>

        {/* Renderizamos el componente "cabecera" y le pasamos todo lo que necesita. */}
        <ShopLoopHead
          breadcrumbs={breadcrumbs}
          totalResults={displayProducts.length}
          activeCategory={activeCategory} // Le pasamos el estado actual
          onCategoryChange={setActiveCategory} // Le pasamos la función para que el hijo pueda cambiar el estado del padre
          currentSort={sortOrder} // Le pasamos el estado actual
          onSortChange={setSortOrder} // Le pasamos la función para cambiar el estado
          categories={categoryOptions}
        />

        {/* Indicador de carga */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-lg">Cargando productos...</p>
          </div>
        )}

        {/* Cuadrícula de Productos */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product} // Le pasamos el objeto de producto completo
              />
            ))}
          </div>
        )}

        {/* Mensaje si no hay productos */}
        {!loading && displayProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg">No se encontraron productos.</p>
          </div>
        )}
      </div>
    </section>
  )
}
