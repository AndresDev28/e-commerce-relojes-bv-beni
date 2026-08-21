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
import type { FavoriteMutationResult } from '@/features/favorites/types'

interface FavoritesContextType {
  favorites: Product[]
  addToFavorites: (product: Product) => Promise<FavoriteMutationResult>
  removeFromFavorites: (productId: string) => Promise<FavoriteMutationResult>
  isFavorite: (productId: string) => boolean
  isLoading: boolean
  error: string | null
  clearError: () => void
  clearFavorites: () => Promise<FavoriteMutationResult>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
)

interface FavoritesProviderProps {
  children: ReactNode
}

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const { user } = useAuth()
  const { favorites, loading, error, fetchFavorites, updateFavorites, clearError } = useFavoritesApi()

  useEffect(() => {
    if (user) {
      fetchFavorites()
    }
  }, [user, fetchFavorites])

  const addToFavorites = async (product: Product): Promise<FavoriteMutationResult> => {
    if (!user) return { ok: false, reason: 'unauthenticated' }
    if (favorites.some(p => String(p.id) === String(product.id))) return { ok: true }

    const updated = [product, ...favorites]
    await updateFavorites(updated)
    return { ok: true }
  }

  const removeFromFavorites = async (productId: string): Promise<FavoriteMutationResult> => {
    if (!user) return { ok: false, reason: 'unauthenticated' }
    if (!favorites.some(p => String(p.id) === String(productId))) return { ok: true }

    const updated = favorites.filter(p => String(p.id) !== String(productId))
    await updateFavorites(updated)
    return { ok: true }
  }

  const isFavorite = (productId: string) =>
    favorites.some(p => String(p.id) === String(productId))

  const clearFavorites = async (): Promise<FavoriteMutationResult> => {
    if (!user) return { ok: false, reason: 'unauthenticated' }
    await updateFavorites([])
    return { ok: true }
  }

  const value: FavoritesContextType = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    isLoading: loading,
    error,
    clearError,
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
