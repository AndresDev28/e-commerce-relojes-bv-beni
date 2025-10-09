'use client'
import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from 'react'
import { useAuth } from './AuthContext'
import { Product, StrapiProduct, StrapiImage } from '@/types'
import { API_URL } from '@/lib/constants'

interface FavoritesContextType {
  favorites: Product[]
  addToFavorites: (product: Product) => Promise<void>
  removeFromFavorites: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
  isLoading: boolean
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
)

function getImageUrls(images?: StrapiImage | StrapiImage[]): string[] {
  const base = API_URL || ''
  if (!images) return []
  const arr = Array.isArray(images) ? images : [images]
  return arr.map(img =>
    img.url?.startsWith('http') ? img.url : `${base}${img.url}`
  )
}

function transformStrapiProductToProduct(sp: StrapiProduct): Product {
  const imageUrls = getImageUrls(sp.images ?? sp.image)
  return {
    id: String(sp.id),
    name: sp.name,
    price: sp.price,
    images: imageUrls,
    href: imageUrls[0] || '',
    description: sp.description ?? '',
    category: Array.isArray(sp.category)
      ? sp.category[0]?.name
      : sp.category?.name,
    stock: sp.stock,
  }
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user, jwt } = useAuth()
  const [favorites, setFavorites] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setFavorites([])
        setIsLoading(false)
        return
      }

      const token =
        jwt ||
        (typeof window !== 'undefined' ? localStorage.getItem('jwt') : null)
      if (!token) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/api/users/me?populate=favorites`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (response.ok) {
          const userData = await response.json()
          const userFavorites: StrapiProduct[] = userData.favorites || []
          const mapped = userFavorites.map(transformStrapiProductToProduct)
          setFavorites(mapped)
        }
      } catch (error) {
        console.error('Error fetching favorites:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [user, jwt])

  const addToFavorites = async (product: Product) => {
    if (!user) return
    // Optimista: si ya está, salimos
    if (favorites.some(p => p.id === product.id)) return

    // Actualización optimista local con el producto completo
    setFavorites(prev => [product, ...prev])

    try {
      const token =
        jwt ||
        (typeof window !== 'undefined' ? localStorage.getItem('jwt') : null)
      if (!token) return
      // Nota: Dependiendo de tu modelo en Strapi, puede requerir connect/disconnect.
      // Aquí enviamos la lista de IDs actualizada como ejemplo genérico.
      const updatedIds = favorites.map(f => f.id).concat(product.id)
      await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ favorites: updatedIds }),
      })
    } catch (error) {
      console.error('Error adding favorite:', error)
      // Revertir en caso de error
      setFavorites(prev => prev.filter(p => p.id !== product.id))
    }
  }

  const removeFromFavorites = async (productId: string) => {
    if (!user) return
    if (!favorites.some(p => p.id === productId)) return

    const prev = favorites
    // Optimista local
    setFavorites(prev.filter(p => p.id !== productId))

    try {
      const token =
        jwt ||
        (typeof window !== 'undefined' ? localStorage.getItem('jwt') : null)
      if (!token) return
      const updatedIds = prev.map(f => f.id).filter(id => id !== productId)
      await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ favorites: updatedIds }),
      })
    } catch (error) {
      console.error('Error removing favorite:', error)
      // Revertir en caso de error
      setFavorites(prev)
    }
  }

  const isFavorite = (productId: string) =>
    favorites.some(p => p.id === productId)

  const clearFavorites = () => setFavorites([])

  const value: FavoritesContextType = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    isLoading,
    clearFavorites,
  }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites debe usarse dentro de FavoritesProvider')
  }
  return context
}
