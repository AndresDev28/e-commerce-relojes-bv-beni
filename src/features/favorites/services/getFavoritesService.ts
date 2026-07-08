import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

export const MAX_FAVORITES = 200

export type FavoritesList = string[]

export async function getFavoritesService(params: {
  jwtToken: string
  traceId: string
}): Promise<{ favorites: unknown[] } | { error: NextResponse }> {
  const { jwtToken, traceId } = params

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/users/me?populate=favorites`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
        'X-Trace-Id': traceId,
      },
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tus favoritos. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!response.ok) {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tus favoritos. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  let payload: { favorites?: unknown[] }
  try {
    payload = await response.json()
  } catch {
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tus favoritos. Inténtalo de nuevo.' },
        { status: 502, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return { favorites: payload.favorites ?? [] }
}