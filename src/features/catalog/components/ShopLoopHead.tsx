'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ArrowUpDown, ChevronDown } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import type { StrapiCategory } from '@/types'

// Define la estructura de un solo breadcrumb, asegurando que cada uno tenga un nombre visible y una URL de destino.
interface Breadcrumb {
  name: string
  href: string
}

// Define las props que el componente ShopLoopHead espera recibir.
interface ShopLoopHeadProps {
  breadcrumbs: Breadcrumb[] // Un array de objetos Breadcrumb para construir la navegación.
  totalResults: number // El número total de productos para mostrar en el contador.
  categories: { name: string; slug: string }[] // Categorías dinámicas provenientes de Strapi
}

const ShopLoopHead = ({
  breadcrumbs,
  totalResults,
  categories,
}: ShopLoopHeadProps) => {
  // Hooks de Next.js para manejo de URL y navegación
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Leer estado actual de la URL
  const activeCategory = searchParams.get('category') || 'Todos'
  const currentSort = searchParams.get('sort') || 'default'

  // visibilidad del menú dentro del componente
  const [isSortOpen, setIsSortOpen] = useState(false)
  // Definimos las opciones
  const sortOptions = [
    { value: 'default', label: 'Ordenar por' },
    { value: 'price-asc', label: 'Precio: Ascendente' },
    { value: 'price-desc', label: 'Precio: Descendente' },
    { value: 'name-asc', label: 'Nombre: A-Z' },
    { value: 'name-desc', label: 'Nombre: Z-A' },
  ]

  // Cerrar el menú desplegable si el usuario hace clic en cualquier otro lugar de la página
  const dropDownRef = useRef<HTMLDivElement>(null) // Referencia para el contenedor del menú

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropDownRef.current &&
        !dropDownRef.current.contains(e.target as Node)
      ) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  /**
   * Handler para cambiar categoría.
   * Usa router.replace para evitar cluttering history con cambios de filtro.
   * Resetea page a 1 (spec: Category change resets pagination).
   */
  const handleCategoryChange = (categorySlug: string) => {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (categorySlug !== 'Todos') {
      params.set('category', categorySlug)
    }
    if (currentSort && currentSort !== 'default') {
      params.set('sort', currentSort)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  /**
   * Handler para cambiar ordenamiento.
   * Usa router.replace, resetea page a 1.
   */
  const handleSortChange = (sortValue: string) => {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (activeCategory && activeCategory !== 'Todos') {
      params.set('category', activeCategory)
    }
    if (sortValue && sortValue !== 'default') {
      params.set('sort', sortValue)
    }
    router.replace(`${pathname}?${params.toString()}`)
    setIsSortOpen(false)
  }

  return (
    <div className="mb-8 flex flex-col gap-4">
      <Breadcrumbs breadcrumbs={breadcrumbs} />
      {/* Filtro de categorías */}
      <div className="flex items-center gap-2 flex-wrap border-b border-neutral-light pb-4">
        <Button
          variant={activeCategory === 'Todos' ? 'primary' : 'primary'}
          onClick={() => handleCategoryChange('Todos')}
        >
          Todos
        </Button>
        {categories.map(cat => (
          <Button
            key={cat.slug}
            variant={activeCategory === cat.slug ? 'primary' : 'primary'}
            onClick={() => handleCategoryChange(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="font-serif text-sm text-neutral-medium">
          Mostrando {totalResults} resultados
        </p>
        <div className="relative" ref={dropDownRef}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-2 rounded-md border border-l-neutral-light px-3 py-2 text-sm"
          >
            <ArrowUpDown size={16} />
            <span className="hidden md:inline-block">
              {sortOptions.find(option => option.value === currentSort)
                ?.label || 'Ordenar por'}
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform md:hidden ${isSortOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isSortOpen && (
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className="block w-full px-4 py-2 text-left text-sm text-neutral-dark hover:bg-neutral-lightest"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopLoopHead
