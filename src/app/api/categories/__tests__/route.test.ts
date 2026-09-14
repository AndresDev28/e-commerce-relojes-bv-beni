/**
 * Unit tests for the GET /api/categories same-origin proxy route handler.
 *
 * Mirrors the products contract (`src/app/api/products/__tests__/route.test.ts`)
 * but exercises the simpler category allowlist (`locale`, `populate`, `filters[`)
 * and the mock fixture omits `meta` because category listing does not paginate
 * by default (per `design.md` PR1 test approach).
 *
 * Handler-direct: PR1 stays standalone-green, no `fetchApiFull` origin-awareness
 * dependency (which arrives in PR2).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mockFetch = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')
})

const strapiCategoriesEnvelope = {
  data: [
    { id: 1, name: 'Deportivos', slug: 'deportivos' },
    { id: 2, name: 'Casual', slug: 'casual' },
  ],
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('GET /api/categories — proxy contract', () => {
  it('returns 200 and passes Strapi envelope through (mock fixture omits meta)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiCategoriesEnvelope))

    const request = new NextRequest('http://localhost:3000/api/categories')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual(strapiCategoriesEnvelope.data)
  })

  it('forwards allowlisted category query keys verbatim to upstream', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiCategoriesEnvelope))

    const params = new URLSearchParams({
      populate: '*',
      locale: 'es',
      'filters[active][$eq]': 'true',
    })
    const request = new NextRequest(
      `http://localhost:3000/api/categories?${params.toString()}`
    )
    await GET(request)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const upstreamUrl = mockFetch.mock.calls[0][0] as string

    expect(upstreamUrl).toContain('http://localhost:1337/api/categories')
    expect(upstreamUrl).toContain('populate=*')
    expect(upstreamUrl).toContain('locale=es')
    expect(upstreamUrl).toContain(
      encodeURIComponent('filters[active][$eq]') + '=true'
    )
  })

  it('drops unknown query keys silently without returning 400', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiCategoriesEnvelope))

    const request = new NextRequest(
      'http://localhost:3000/api/categories?populate=*&evil=<script>&token=abc'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    const upstreamUrl = mockFetch.mock.calls[0][0] as string
    expect(upstreamUrl).toContain('populate=*')
    expect(upstreamUrl).not.toContain('evil=')
    expect(upstreamUrl).not.toContain('token=')
  })

  it('maps an upstream 500 to a friendly Spanish message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Database down' } }, 500)
    )

    const request = new NextRequest('http://localhost:3000/api/categories')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe(
      'Error temporal del servidor. Intenta de nuevo más tarde.'
    )
    expect(JSON.stringify(body)).not.toContain('Internal Server Error')
  })

  it('mirrors upstream 404 status code exactly (does not mask as 500)', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Not found' } }, 404)
    )

    const request = new NextRequest(
      'http://localhost:3000/api/categories?filters[slug][$eq]=missing'
    )
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('No se encontraron los datos solicitados.')
  })

  it('preserves incoming X-Trace-Id and sets Cache-Control: no-store', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiCategoriesEnvelope))

    const request = new NextRequest('http://localhost:3000/api/categories', {
      headers: { 'X-Trace-Id': 'trace-cat-xyz-789' },
    })
    const response = await GET(request)

    expect(response.headers.get('X-Trace-Id')).toBe('trace-cat-xyz-789')
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const upstreamHeaders = (mockFetch.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>
    expect(upstreamHeaders['X-Trace-Id']).toBe('trace-cat-xyz-789')
  })
})