/**
 * GET /api/categories — same-origin Next.js proxy for Strapi's categories endpoint.
 *
 * Mirror of `src/app/api/products/route.ts` with the simpler category
 * allowlist. Category listing does not paginate by default, so the
 * allowlist is intentionally narrower.
 *
 * Contract pinned by `src/app/api/categories/__tests__/route.test.ts` and
 * `openspec/changes/follow-ups-sprint-5-stripe-upsert-f3-cors-over-ngrok/specs/catalog-bff-proxy/spec.md`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTraceId } from '@/lib/trace'
import { getStrapiServerUrl, mapApiError } from '@/lib/api'

/**
 * Simpler allowlist than the products route — categories don't paginate
 * by default and don't sort/paginate through the UI.
 *
 * - `populate*` — relationship expansion
 * - `filters[*]` — generic filter syntax
 * - `locale` — content locale
 *
 * Anything outside this set is dropped silently (D2).
 */
const ALLOWLIST_PREFIXES = ['populate', 'filters['] as const
const ALLOWLIST_EXACT = new Set(['locale'])

function isAllowlisted(key: string): boolean {
  if (ALLOWLIST_EXACT.has(key)) return true
  return ALLOWLIST_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function buildUpstreamUrl(request: NextRequest): string {
  const base = getStrapiServerUrl()
  const incoming = new URL(request.url)
  const upstream = new URL('/api/categories', base)

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