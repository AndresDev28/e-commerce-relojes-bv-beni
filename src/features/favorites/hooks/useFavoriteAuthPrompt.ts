'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useFavorites } from '@/features/favorites'
import type { Product } from '@/types'

export function useFavoriteAuthPrompt() {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const { user } = useAuth()
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const router = useRouter()
  const pathname = usePathname()

  // D4: Clear the prompt when the user signs in
  useEffect(() => {
    if (user) {
      setShowAuthPrompt(false)
    }
  }, [user])

  const handleToggleFavorite = async (product: Product) => {
    if (user) {
      // Authenticated: toggle normally
      if (isFavorite(product.id)) {
        await removeFromFavorites(product.id)
      } else {
        await addToFavorites(product)
      }
      return
    }

    // Anonymous: attempt to add; surface the auth prompt
    const result = await addToFavorites(product)
    if (!result.ok) {
      setShowAuthPrompt(true)
    }
  }

  const goToLogin = () => {
    router.push('/login?redirect=' + encodeURIComponent(pathname))
  }

  return {
    showAuthPrompt,
    handleToggleFavorite,
    goToLogin,
  }
}
