/**
 * Service para obtener las órdenes del usuario desde Strapi.
 *
 * Encapsula: validación IDOR, construcción de query Strapi,
 * fetch con headers de autenticación/trazabilidad, y unwrapping
 * de atributos Strapi v4.
 */

import { NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'
import { AuthUser } from '@/lib/auth/validate-request'
import type { Order, PaginationMeta, StrapiOrderResponse } from '../types'

/**
 * Obtiene las órdenes del usuario autenticado desde Strapi.
 *
 * @returns Objeto con { data, meta } en caso de éxito,
 *          o { error: NextResponse } en caso de fallo.
 */
export async function getOrdersService(params: {
  user: AuthUser
  jwtToken: string
  traceId: string
  page: string
  userIdParam: string | null
}): Promise<
  { data: Order[]; meta: PaginationMeta } | { error: NextResponse }
> {
  const { user, jwtToken, traceId, page, userIdParam } = params

  // IDOR: si se pasa un user param, debe coincidir con el JWT user
  if (userIdParam && Number(userIdParam) !== user.id) {
    return {
      error: NextResponse.json(
        { error: 'No tenés permiso para acceder a este recurso.' },
        { status: 403, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  // Construir query params de Strapi
  const strapiParams = new URLSearchParams({
    'sort[0]': 'createdAt:desc',
    'pagination[page]': page,
    'pagination[pageSize]': '10',
  })

  if (userIdParam) {
    strapiParams.set('filters[user][id][$eq]', userIdParam)
  }

  // Fetch a Strapi con headers de autenticación y trazabilidad
  const strapiUrl = `${API_URL}/api/orders?${strapiParams}`

  const response = await fetch(strapiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
      'X-Trace-Id': traceId,
    },
  })

  // Normalizar errores de Strapi a status estables de frontend
  if (!response.ok) {
    // 404 → recurso no encontrado, 5xx → gateway error
    const stableStatus = response.status === 404 ? 404 : 502
    return {
      error: NextResponse.json(
        { error: 'No pudimos cargar tus pedidos. Intentá de nuevo.' },
        { status: stableStatus, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const data = await response.json()

  // Unwrap de atributos Strapi v4 si están presentes
  const unwrappedData = (data.data as StrapiOrderResponse[]).map((item) =>
    item.attributes ? item.attributes : (item as unknown as Order)
  )

  return {
    data: unwrappedData,
    meta: data.meta as PaginationMeta,
  }
}
