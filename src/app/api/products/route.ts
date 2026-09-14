/**
 * GET /api/products — same-origin Next.js proxy for Strapi's products endpoint.
 *
 * When the frontend is served over an HTTPS tunnel (e.g., ngrok), the
 * visitor's browser cannot reach the developer's local Strapi
 * (`http://localhost:1337`). This proxy keeps the request same-origin
 * from the browser's point of view while letting the Next.js server
 * forward to Strapi directly.
 *
 * Contract pinned by `src/app/api/products/__tests__/route.test.ts` and
 * `openspec/changes/follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/specs/catalog-bff-proxy/spec.md`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { getStrapiServerUrl, mapApiError } from '@/lib/api'

/**
 * Allowlist of Strapi query keys forwarded verbatim to upstream.
 *
 * - `populate*` (exact + nested) — relationship expansion
 * - `pagination[*]` — page/pageSize/withCount/start/limit
 * - `filters[*]` — generic filter syntax
 * - `sort[*]` / `sort` — sort array syntax
 * - `locale` — content locale
 * - `publicationState` — draft/published control
 *
 * Anything outside this set is dropped silently (D2: no 400 on
 * unknown key — UX preference, client never sends unknowns intentionally).
 */
const ALLOWLIST_PREFIXES = [
  'populate',
  'pagination[',
  'filters[',
  'sort[',
] as const

const ALLOWLIST_EXACT = new Set(['locale', 'publicationState', 'sort'])

function isAllowlisted(key: string): boolean {
  if (ALLOWLIST_EXACT.has(key)) return true
  return ALLOWLIST_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function buildUpstreamUrl(request: NextRequest): string {
  const base = getStrapiServerUrl()
  const incoming = new URL(request.url)
  const upstream = new URL('/api/products', base)

  incoming.searchParams.forEach((value, key) => {
    if (isAllowlisted(key)) {
      upstream.searchParams.set(key, value)
    }
  })

  return upstream.toString()
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const traceId = getTraceId(request)

  try {
    const upstreamUrl = buildUpstreamUrl(request)

    const upstream = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: { 'X-Trace-Id': traceId },
    })

    if (!upstream.ok) {
      let body: unknown
      try {
        body = await upstream.json()
      } catch {
        body = undefined
      }
      const message = mapApiError(upstream.status, upstream.statusText, body)
      return NextResponse.json(
        { error: message },
        {
          status: upstream.status,
          headers: {
            'X-Trace-Id': traceId,
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const payload: unknown = await upstream.json()
    return NextResponse.json(payload, {
      headers: {
        'X-Trace-Id': traceId,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.' },
      {
        status: 500,
        headers: {
          'X-Trace-Id': traceId,
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}