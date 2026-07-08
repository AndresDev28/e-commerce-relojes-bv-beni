import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { MAX_FAVORITES, type FavoritesList } from './getFavoritesService'

export interface FavoritesValidationOk {
  valid: true
  favorites: FavoritesList
}

export interface FavoritesValidationError {
  valid: false
  reason: 'invalid_shape' | 'too_many' | 'invalid_item'
}

export function validateFavoritesList(value: unknown):
  | FavoritesValidationOk
  | FavoritesValidationError {
  if (!Array.isArray(value)) {
    return { valid: false, reason: 'invalid_shape' }
  }
  if (value.length > MAX_FAVORITES) {
    return { valid: false, reason: 'too_many' }
  }
  for (const id of value) {
    if (typeof id !== 'string' || !id.trim()) {
      return { valid: false, reason: 'invalid_item' }
    }
  }
  return { valid: true, favorites: value as FavoritesList }
}

export async function updateFavoritesService(params: {
  jwtToken: string
  userId: number
  traceId: string
  favorites: FavoritesList
}): Promise<{ success: true } | { error: NextResponse }> {
  const { jwtToken, userId, traceId, favorites } = params

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
        'X-Trace-Id': traceId,
      },
      body: JSON.stringify({ favorites }),
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos guardar tus favoritos. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!response.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos guardar tus favoritos. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return { success: true }
}