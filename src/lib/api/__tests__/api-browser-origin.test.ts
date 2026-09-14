/**
 * Unit tests for origin-aware URL resolution in fetchApiFull.
 *
 * Goal (PR2 / F3-cors-over-ngrok): the browser-side catalog fetches must
 * be same-origin (`/api/products` relative) so visitors over an ngrok
 * HTTPS tunnel can reach the developer's local Strapi via the Next.js
 * BFF instead of failing CORS in the browser. Server-side callers
 * (RSC, route handlers, services) MUST keep using the absolute
 * `STRAPI_API_URL` chain — only the browser context switches.
 *
 * Coverage matrix:
 *   1. Browser context (jsdom)            → relative URL `/api/products?…`
 *   2. Server context (window stubbed)    → absolute URL `http://localhost:1337/api/products?…`
 *   3. Query encoding parity             → same substring in both contexts
 *   4. Existing call sites work in browser context (no code change)
 *   5. Existing call sites work in server context (no code change)
 *
 * Vitest is jsdom-only per design D6; server-context tests use
 * `vi.stubGlobal('window', undefined)` per call. `typeof window` returns
 * `'undefined'` (the string) once window is stubbed, so the helper's
 * `typeof window !== 'undefined'` check flips to the server branch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProducts, getProductBySlug, getCategories } from '@/lib/api'

const mockFetch = vi.fn()

function mockFetchOk<T>(payload: T) {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  })
}

function getFetchUrl(): string {
  return mockFetch.mock.calls[0][0] as string
}

function getFetchInitHeaders(): Record<string, string> {
  const init = mockFetch.mock.calls[0][1] as RequestInit | undefined
  return (init?.headers as Record<string, string>) ?? {}
}

describe('fetchApiFull — origin-aware base URL resolution', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    // Real fetchApiFull always sends X-Trace-Id; use an explicit env so
    // server-context assertions have a known absolute origin.
    vi.stubEnv('NEXT_PUBLIC_STRAPI_API_URL', 'http://localhost:1337')
    // Default success payload — individual tests override as needed.
    mockFetchOk({
      data: [],
      meta: { pagination: { page: 1, pageSize: 8, pageCount: 1, total: 0 } },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('browser context (jsdom default)', () => {
    it('resolves getProducts to a same-origin relative URL (no localhost:1337)', async () => {
      await getProducts()

      const url = getFetchUrl()
      // Relative URL: starts with the path, NOT an absolute origin.
      expect(url.startsWith('http://')).toBe(false)
      expect(url.startsWith('https://')).toBe(false)
      // Path contract preserved: leading slash + /api/products.
      expect(url.startsWith('/api/products')).toBe(true)
      // Anti-regression: must NOT leak the Strapi host into the browser bundle.
      expect(url).not.toContain('localhost:1337')
      // X-Trace-Id header still present (AGENT.md contract).
      expect(getFetchInitHeaders()['X-Trace-Id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('resolves getProductBySlug and getCategories to relative URLs in browser context', async () => {
      await getProductBySlug('classic-chronograph')
      const slugUrl = getFetchUrl()
      expect(slugUrl.startsWith('/api/products')).toBe(true)
      expect(slugUrl).not.toContain('localhost:1337')

      await getCategories()
      const categoriesUrl = getFetchUrl()
      expect(categoriesUrl.startsWith('/api/categories')).toBe(true)
      expect(categoriesUrl).not.toContain('localhost:1337')
    })

    it('preserves query-string encoding parity in browser context', async () => {
      await getProducts({ page: 2, pageSize: 8, category: 'deportivo', sort: 'price-asc' })

      const url = getFetchUrl()
      // Same encoding as the server branch (URLSearchParams encoding).
      expect(url).toContain('populate=*')
      expect(url).toContain('pagination%5Bpage%5D=2')
      expect(url).toContain('pagination%5BpageSize%5D=8')
      expect(url).toContain(
        encodeURIComponent('filters[category][slug][$eq]') + '=deportivo'
      )
      expect(url).toContain('sort%5B0%5D=price%3Aasc')
      expect(url).toContain('sort%5B1%5D=id%3Aasc')
    })
  })

  describe('server context (window stubbed undefined)', () => {
    /**
     * Per design D6: vitest is jsdom-only, so to simulate the server
     * context we stub `window` to undefined. `typeof window` then returns
     * the string `'undefined'`, flipping the helper to the server branch.
     */
    function withServerContext<T>(fn: () => Promise<T>): Promise<T> {
      const previous = (globalThis as { window?: unknown }).window
      vi.stubGlobal('window', undefined)
      return fn().finally(() => {
        if (previous === undefined) {
          vi.stubGlobal('window', undefined)
        } else {
          vi.stubGlobal('window', previous)
        }
      })
    }

    it('resolves getProducts to an absolute URL on the server', async () => {
      await withServerContext(async () => {
        await getProducts()
      })

      const url = getFetchUrl()
      expect(url.startsWith('http://localhost:1337/api/products')).toBe(true)
      expect(url).toContain('populate=*')
    })

    it('resolves getCategories to an absolute URL on the server', async () => {
      await withServerContext(async () => {
        await getCategories()
      })

      const url = getFetchUrl()
      expect(url.startsWith('http://localhost:1337/api/categories')).toBe(true)
    })

    it('preserves query-string encoding parity in server context', async () => {
      await withServerContext(async () => {
        await getProducts({ page: 2, pageSize: 8, category: 'deportivo' })
      })

      const url = getFetchUrl()
      expect(url).toContain('http://localhost:1337/api/products')
      expect(url).toContain('populate=*')
      expect(url).toContain('pagination%5Bpage%5D=2')
      expect(url).toContain('pagination%5BpageSize%5D=8')
      expect(url).toContain(
        encodeURIComponent('filters[category][slug][$eq]') + '=deportivo'
      )
    })
  })
})
