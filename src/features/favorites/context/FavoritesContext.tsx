'use client'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
} from 'react'
import { useAuth } from '@/context/AuthContext'
import { Product } from '@/types'
import { useFavoritesApi } from '@/features/favorites/hooks/useFavorites'

interface FavoritesContextType {
  favorites: Product[]
  addToFavorites: (product: Product) => Promise<void>
  removeFromFavorites: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
  isLoading: boolean
  error: string | null
  clearFavorites: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
)

interface FavoritesProviderProps {
  children: ReactNode
}

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const { user } = useAuth()
  const { favorites, loading, error, fetchFavorites, updateFavorites } = useFavoritesApi()

  useEffect(() => {
    if (user) {
      fetchFavorites()
    }
  }, [user, fetchFavorites])

  const addToFavorites = async (product: Product) => {
    if (!user) return
    if (favorites.some(p => p.id === product.id)) return

    const updated = [product, ...favorites]
    await updateFavorites(updated)
  }

  const removeFromFavorites = async (productId: string) => {
    if (!user) return
    if (!favorites.some(p => p.id === productId)) return

    const updated = favorites.filter(p => p.id !== productId)
    await updateFavorites(updated)
  }

  const isFavorite = (productId: string) =>
    favorites.some(p => p.id === productId)

  const clearFavorites = async () => {
    if (!user) return
    await updateFavorites([])
  }

  const value: FavoritesContextType = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    isLoading: loading,
    error,
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
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
