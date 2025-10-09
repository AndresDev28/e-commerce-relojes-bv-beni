'use client'
import { useFavorites } from '@/context/FavoritesContext'
import Breadcrumbs from '@/app/components/ui/Breadcrumbs'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/app/components/ui/Button'
import FavoriteItemRow from '@/app/components/ui/FavoriteItemRow'

export default function FavoritesPage() {
  // Extraemos del contexto lo que necesitamos
  const { favorites, isLoading, clearFavorites } = useFavorites()

  const breadcrumbs = [
    { name: 'Inicio', href: '/' },
    { name: 'Favoritos', href: '/favoritos' },
  ]

  console.log('Productos favoritos:', favorites)

  // --- Estado de Carga ---
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-medium">Cargando tus favoritos...</p>
        </div>
      </div>
    )
  }

  // --- Vista de Favoritos Vacíos ---
  if (favorites.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />

        <div className="text-center py-20">
          <Image
            src="/images/empty-favorites.png"
            alt="Lista de favoritos vacía"
            width={300}
            height={300}
            className="mx-auto mb-8"
          />
          <h1 className="text-3xl font-sans font-bold text-dark mb-2">
            Aún no tienes favoritos
          </h1>
          <p className="text-neutral-medium mb-8">
            Guarda los relojes que más te gusten para verlos más tarde. <br />
            Explora nuestra colección y marca tus piezas favoritas.
          </p>
          <Link href="/tienda">
            <Button variant="primary">Explorar Relojes</Button>
          </Link>
        </div>
      </div>
    )
  }

  // --- Vista con Productos Favoritos ---
  return (
    <div className="bg-neutral-light min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs breadcrumbs={breadcrumbs} />

        <div className="flex justify-between items-center my-8">
          <h1 className="text-4xl font-sans font-bold text-dark">
            Mis Favoritos
          </h1>
          <span className="text-neutral-medium">
            {favorites.length}{' '}
            {favorites.length === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-xl font-semibold">Tus Relojes Favoritos</h2>
            {favorites.length > 0 && (
              <button
                onClick={clearFavorites}
                className="text-sm text-neutral-medium hover:text-secondary transition-colors"
              >
                Limpiar Lista
              </button>
            )}
          </div>

          <div className="space-y-4">
            {favorites.map(product => (
              <FavoriteItemRow key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Sección adicional: Continuar comprando */}
        <div className="mt-8 text-center">
          <Link href="/tienda">
            <Button variant="outline">Seguir Explorando</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
