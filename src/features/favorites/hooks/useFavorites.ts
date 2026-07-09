'use client'

import { useState, useCallback } from 'react'
import { newTraceId } from '@/lib/trace'
import type { Product } from '@/types'

interface UseFavoritesApiResult {
  favorites: Product[]
  loading: boolean
  error: string | null
  fetchFavorites: () => Promise<void>
  updateFavorites: (favorites: Product[]) => Promise<void>
}

export function useFavoritesApi(): UseFavoritesApiResult {
  const [favorites, setFavorites] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/favorites', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': newTraceId(),
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('No se pudo obtener tus favoritos.')
      }

      const data = await response.json()
      setFavorites(data.favorites ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo obtener tus favoritos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateFavorites = useCallback(async (newFavorites: Product[]) => {
    setLoading(true)
    setError(null)

    try {
      const favoriteIds = newFavorites.map(f => f.id)

      const response = await fetch('/api/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': newTraceId(),
        },
        credentials: 'same-origin',
        body: JSON.stringify(favoriteIds),
      })

      if (!response.ok) {
        throw new Error('No se pudieron actualizar tus favoritos.')
      }

      const data = await response.json()
      setFavorites(newFavorites)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron actualizar tus favoritos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { favorites, loading, error, fetchFavorites, updateFavorites }
}
