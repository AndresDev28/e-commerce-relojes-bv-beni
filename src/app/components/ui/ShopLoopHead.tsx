'use client'
import { useState, useEffect, useRef } from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { categories } from '@/lib/data'
import Button from './Button';
import Breadcrumbs from './Breadcrumbs';

// Define la estructura de un solo breadcrumb, asegurando que cada uno tenga un nombre visible y una URL de destino.
interface Breadcrumb {
  name: string;
  href: string;
}

// Define las props que el componente ShopLoopHead espera recibir.
interface ShopLoopHeadProps {
  breadcrumbs: Breadcrumb[]; // Un array de objetos Breadcrumb para construir la navegación.
  totalResults: number; // El número total de productos para mostrar en el contador.
  currentSort: string; // El criterio de ordenación actualmente activo (ej: 'price-asc').
  onSortChange: (sortValue: string) => void; // Una función callback que se ejecuta cuando el usuario selecciona una nueva opción de ordenación.
  activeCategory: string;
  onCategoryChange: (category: string) => void; // Función para cambiar de categoria
}

const ShopLoopHead = ({ breadcrumbs, totalResults, currentSort, onSortChange, activeCategory, onCategoryChange }: ShopLoopHeadProps) => {
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
  const dropDownRef = useRef<HTMLDivElement>(null); // Referencia para el contenedor del menú

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Comprueba si el menú desplegable existe (dropDownRef.current) y si el clic (e.target) ocurrió fuera de él.
      // `!dropDownRef.current.contains(e.target as Node)` devuelve true si el clic fue fuera.
      if (dropDownRef.current && !dropDownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    // Agregamos el listener
    document.addEventListener('mousedown', handleClickOutside);
    // Limpiamos el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []) // // El array vacío asegura que el efecto solo se ejecute una vez
    
  return (
    // El JSX de breadcrumbs...
    <div className='mb-8 flex flex-col gap-4'>
      <Breadcrumbs breadcrumbs={breadcrumbs} />
      {/* Agregamos el filtro de categorías */}
      <div className='flex items-center gap-2 flex-wrap border-b border-neutral-light pb-4'>
          <Button
            variant={activeCategory === 'Todos' ? 'primary' : 'tertiary' }
            onClick={() => onCategoryChange('Todos')}
          >
            Todos
          </Button>
          {categories.map(category => (
          <Button
            key={category.title}
            variant={activeCategory === category.title ? 'primary' : 'tertiary'}
            onClick={() => onCategoryChange(category.title)}
          >
            {category.title}
          </Button>
        ))}
      </div>
      <div className='flex items-center justify-between'>        
        <p className='font-serif text-sm text-neutral-medium'>
          Mostrando {totalResults} resultados
        </p>
        <div className='relative' ref={dropDownRef}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className='flex items-center gap-2 rounded-md border border-l-neutral-light px-3 py-2 text-sm'
            >
              <ArrowUpDown size={16} />
              {/* Ocultamos el texto en mobile */}
              <span className='hidden md:inline-block'>
                {sortOptions.find(option => option.value === currentSort)?.label || 'Ordenar por'}
              </span>
              {/* Mostramos una flecha solo en móvil */}
              <ChevronDown size={16} className={`transition-transform md:hidden ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Menú de despliegue */}
          {isSortOpen && (
            <div className='absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10'>
              <div className='py-1'>
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsSortOpen(false); // Cierra el menú al seleccionar
                    }}
                    className='block w-full px-4 py-2 text-left text-sm text-neutral-dark hover:bg-neutral-lightest'
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
  );
};

export default ShopLoopHead;