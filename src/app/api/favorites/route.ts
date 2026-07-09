import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { requireUser } from '@/lib/auth/validate-request'
import { getFavoritesService, MAX_FAVORITES, type FavoritesList } from '@/features/favorites'
import { updateFavoritesService, validateFavoritesList } from '@/features/favorites'

export async function GET(request: NextRequest) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { jwtToken } = authResult

    const result = await getFavoritesService({ jwtToken, traceId })

    if ('error' in result) return result.error

    return NextResponse.json(
      { favorites: result.favorites },
      { headers: { 'X-Trace-Id': traceId } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudo obtener tus favoritos.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}

export async function PUT(request: NextRequest) {
  const traceId = getTraceId(request)

  try {
    const authResult = await requireUser(request)
    if ('error' in authResult) return authResult.error

    const { user, jwtToken } = authResult

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Solicitud inválida.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const validation = validateFavoritesList(body)
    if (!validation.valid) {
      let message = 'La lista de favoritos no es válida.'
      if (validation.reason === 'too_many') {
        message = `La lista de favoritos no puede tener más de ${MAX_FAVORITES} elementos.`
      }
      return NextResponse.json(
        { error: message },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      )
    }

    const result = await updateFavoritesService({
      jwtToken,
      userId: user.id,
      traceId,
      favorites: validation.favorites,
    })

    if ('error' in result) return result.error

    return NextResponse.json(
      { favorites: validation.favorites },
      { headers: { 'X-Trace-Id': traceId } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudieron actualizar tus favoritos.' },
      { status: 500, headers: { 'X-Trace-Id': traceId } }
    )
  }
}
