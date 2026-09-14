/**
 * Unit tests for the GET /api/products same-origin proxy route handler.
 *
 * These tests pin the contract documented in
 * `openspec/changes/follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/specs/catalog-bff-proxy/spec.md`
 * and `design.md` (D2 drop-unknown, D3 mirror upstream status, D4 single env
 * resolution point, R5 trace propagation, R6 `no-store` cache header).
 *
 * The handler is exercised directly (no Next.js server boot) so PR1 stays
 * standalone-green: these tests do not depend on `fetchApiFull` origin-awareness
 * (which arrives in PR2).
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

const strapiEnvelope = {
  data: [
    { id: 1, name: 'Reloj A', price: 100 },
    { id: 2, name: 'Reloj B', price: 200 },
  ],
  meta: {
    pagination: { page: 1, pageSize: 12, pageCount: 3, total: 30 },
  },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('GET /api/products — proxy contract', () => {
  it('returns 200 and passes Strapi envelope through unchanged', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const request = new NextRequest('http://localhost:3000/api/products')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual(strapiEnvelope.data)
    expect(body.meta).toEqual(strapiEnvelope.meta)
  })

  it('forwards allowlisted Strapi query keys verbatim to upstream', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const params = new URLSearchParams({
      populate: '*',
      'pagination[page]': '2',
      'pagination[pageSize]': '12',
      'filters[category][slug][$eq]': 'deportivo',
      'sort[0]': 'price:asc',
      locale: 'es',
    })
    const request = new NextRequest(
      `http://localhost:3000/api/products?${params.toString()}`
    )
    await GET(request)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const upstreamUrl = mockFetch.mock.calls[0][0] as string

    expect(upstreamUrl).toContain('http://localhost:1337/api/products')
    expect(upstreamUrl).toContain('populate=*')
    expect(upstreamUrl).toContain('pagination%5Bpage%5D=2')
    expect(upstreamUrl).toContain('pagination%5BpageSize%5D=12')
    expect(upstreamUrl).toContain(
      encodeURIComponent('filters[category][slug][$eq]') + '=deportivo'
    )
    expect(upstreamUrl).toContain('sort%5B0%5D=price%3Aasc')
    expect(upstreamUrl).toContain('locale=es')
  })

  it('drops unknown query keys silently without returning 400', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const request = new NextRequest(
      'http://localhost:3000/api/products?populate=*&evil=<script>&__proto__=1&publicationState=live'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    const upstreamUrl = mockFetch.mock.calls[0][0] as string
    // Allowlisted keys flow through, unknown keys silently dropped
    expect(upstreamUrl).toContain('populate=*')
    expect(upstreamUrl).toContain('publicationState=live')
    expect(upstreamUrl).not.toContain('evil=')
    expect(upstreamUrl).not.toContain('__proto__=')
  })

  it('maps an upstream 500 to a friendly Spanish message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Database connection failed' } }, 500)
    )

    const request = new NextRequest('http://localhost:3000/api/products')
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
      'http://localhost:3000/api/products?filters[slug][$eq]=missing-slug'
    )
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('No se encontraron los datos solicitados.')
  })

  it('returns generic Spanish error when fetch itself rejects (catch-all)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const request = new NextRequest('http://localhost:3000/api/products')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Ocurrió un error inesperado. Intenta de nuevo más tarde.')
  })

  it('preserves an incoming X-Trace-Id end-to-end', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const request = new NextRequest('http://localhost:3000/api/products', {
      headers: { 'X-Trace-Id': 'trace-from-browser-abc-123' },
    })
    const response = await GET(request)

    expect(response.headers.get('X-Trace-Id')).toBe('trace-from-browser-abc-123')

    const upstreamHeaders = (mockFetch.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>
    expect(upstreamHeaders['X-Trace-Id']).toBe('trace-from-browser-abc-123')
  })

  it('generates a UUIDv4 X-Trace-Id when the incoming request omits one', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const request = new NextRequest('http://localhost:3000/api/products')
    const response = await GET(request)
    const echoedTrace = response.headers.get('X-Trace-Id')
    const upstreamHeaders = (mockFetch.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>

    expect(echoedTrace).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(upstreamHeaders['X-Trace-Id']).toBe(echoedTrace)
  })

  it('sets Cache-Control: no-store on successful responses', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(strapiEnvelope))

    const request = new NextRequest('http://localhost:3000/api/products')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})