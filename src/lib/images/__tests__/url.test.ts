/**
 * Unit tests for `normalizeImageUrl` — capability C1 (spec #1688).
 *
 * Covers all 13 scenarios from spec C1.S1..S13, plus the
 * base-resolution chain. Locks the API_URL-first contract
 * established by #1677 so `vi.mock('@/lib/constants')` wins
 * in CI even when the .env.local is unset.
 *
 * Strict TDD: this file is the RED step (T1.1). It references
 * `@/lib/images/url` and `@/lib/images/url.constants`, both of
 * which DO NOT exist yet — verification at T1.1 expects the
 * suite to fail with `Cannot find module`. The GREEN step (T1.2)
 * lands the production code.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PLACEHOLDER_SRC } from '../url.constants'
import { normalizeImageUrl } from '../url'

// vi.mock is hoisted to the top of the file before any imports run, so the
// shared mock value must be declared with vi.hoisted — otherwise the factory
// captures a `const` that does not exist yet at hoist time (#1677 pattern).
const { MOCK_API_URL } = vi.hoisted(() => ({
  MOCK_API_URL: 'http://mocked-host:1337',
}))

// The helper reads `API_URL` from `@/lib/constants` at call time.
// Mocking the module before import guarantees the chain sees the
// mocked value first and survives isolation across tests.
vi.mock('@/lib/constants', () => ({ API_URL: MOCK_API_URL }))

describe('normalizeImageUrl — C1 scenarios', () => {
  describe('nullish / empty input → PLACEHOLDER_SRC', () => {
    it('C1.S1: null → placeholder', () => {
      expect(normalizeImageUrl(null)).toBe(PLACEHOLDER_SRC)
    })

    it('C1.S2: undefined → placeholder', () => {
      expect(normalizeImageUrl(undefined)).toBe(PLACEHOLDER_SRC)
    })

    it('C1.S3: empty string → placeholder', () => {
      expect(normalizeImageUrl('')).toBe(PLACEHOLDER_SRC)
    })

    it('C1.S4: whitespace-only string → placeholder', () => {
      expect(normalizeImageUrl('   ')).toBe(PLACEHOLDER_SRC)
      expect(normalizeImageUrl('\t\n')).toBe(PLACEHOLDER_SRC)
    })
  })

  describe('absolute / data URIs → pass-through (idempotent)', () => {
    it('C1.S5: http://… passes through unchanged', () => {
      const url = 'http://example.com/foo.jpg'
      expect(normalizeImageUrl(url)).toBe(url)
    })

    it('C1.S6: https://… passes through unchanged', () => {
      const url = 'https://res.cloudinary.com/relojes/x.jpg'
      expect(normalizeImageUrl(url)).toBe(url)
    })

    it('C1.S7: data: URI passes through unchanged', () => {
      const url = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
      expect(normalizeImageUrl(url)).toBe(url)
    })

    it('idempotency: passing an already-prefixed /uploads URL does not double-prefix', () => {
      const alreadyPrefixed = `${MOCK_API_URL}/uploads/foo.jpg`
      expect(normalizeImageUrl(alreadyPrefixed)).toBe(alreadyPrefixed)
    })
  })

  describe('dangerous schemes → PLACEHOLDER_SRC (security)', () => {
    it('C1.S8: javascript: scheme is dropped', () => {
      expect(normalizeImageUrl('javascript:alert(1)')).toBe(PLACEHOLDER_SRC)
    })

    it('C1.S9: file: scheme is dropped', () => {
      expect(normalizeImageUrl('file:///etc/passwd')).toBe(PLACEHOLDER_SRC)
    })
  })

  describe('relative /uploads/* paths → API_URL prefix', () => {
    it('C1.S10: leading slash /uploads/... is prefixed', () => {
      expect(normalizeImageUrl('/uploads/casio.jpg')).toBe(
        `${MOCK_API_URL}/uploads/casio.jpg`,
      )
    })

    it('C1.S11: missing leading slash uploads/... is prefixed with leading /', () => {
      expect(normalizeImageUrl('uploads/casio.jpg')).toBe(
        `${MOCK_API_URL}/uploads/casio.jpg`,
      )
    })

    it('nested /uploads/path/to/file.jpg is prefixed', () => {
      expect(normalizeImageUrl('/uploads/sub/2026/01/foo.png')).toBe(
        `${MOCK_API_URL}/uploads/sub/2026/01/foo.png`,
      )
    })
  })

  describe('other root-relative paths → pass-through (same-origin)', () => {
    it('C1.S12: /images/categories/<slug>.avif passes through unchanged', () => {
      const url = '/images/categories/g-shock.avif'
      expect(normalizeImageUrl(url)).toBe(url)
    })

    it('/images/placeholder.png (catalog fallback) passes through unchanged', () => {
      const url = '/images/placeholder.png'
      expect(normalizeImageUrl(url)).toBe(url)
    })

    it('does NOT prefix non-uploads root-relative paths even if they would match loosely', () => {
      const url = '/images/uploads-in-name/wrong.jpg'
      expect(normalizeImageUrl(url)).toBe(url)
    })
  })

  describe('everything else → PLACEHOLDER_SRC', () => {
    it('C1.S13: garbage value with no leading slash and no scheme → placeholder', () => {
      expect(normalizeImageUrl('garbage-value-with-no-slash')).toBe(
        PLACEHOLDER_SRC,
      )
    })

    it('trims leading/trailing whitespace before evaluation', () => {
      expect(normalizeImageUrl('  http://example.com/x.jpg  ')).toBe(
        'http://example.com/x.jpg',
      )
    })
  })
})

describe('normalizeImageUrl — base-resolution chain (API_URL-first)', () => {
  // Save + restore env so the fallback test starts from a clean slate.
  let savedNext: string | undefined
  let savedStrapi: string | undefined

  beforeEach(() => {
    savedNext = process.env.NEXT_PUBLIC_STRAPI_API_URL
    savedStrapi = process.env.STRAPI_API_URL
  })

  afterEach(() => {
    if (savedNext === undefined) delete process.env.NEXT_PUBLIC_STRAPI_API_URL
    else process.env.NEXT_PUBLIC_STRAPI_API_URL = savedNext
    if (savedStrapi === undefined) delete process.env.STRAPI_API_URL
    else process.env.STRAPI_API_URL = savedStrapi
    vi.doUnmock('@/lib/constants')
    vi.resetModules()
  })

  it('prefers API_URL from @/lib/constants over process.env (mocked module wins)', () => {
    // API_URL is MOCK_API_URL via vi.mock above. Env vars take secondary
    // priority but must NEVER override the mocked module.
    process.env.NEXT_PUBLIC_STRAPI_API_URL = 'http://env-host:9999'
    process.env.STRAPI_API_URL = 'http://env-host-strapi:9998'

    expect(normalizeImageUrl('/uploads/casio.jpg')).toBe(
      `${MOCK_API_URL}/uploads/casio.jpg`,
    )
  })

  it('falls back to NEXT_PUBLIC_STRAPI_API_URL when API_URL is empty', async () => {
    process.env.NEXT_PUBLIC_STRAPI_API_URL = 'http://env-host:9999'
    process.env.STRAPI_API_URL = 'http://env-host-strapi:9998'

    vi.resetModules()
    vi.doMock('@/lib/constants', () => ({ API_URL: '' }))

    const { normalizeImageUrl: normalizeFresh } = await import('../url')
    expect(normalizeFresh('/uploads/casio.jpg')).toBe(
      'http://env-host:9999/uploads/casio.jpg',
    )
  })

  it('falls back to the localhost default when every base source is empty', async () => {
    process.env.NEXT_PUBLIC_STRAPI_API_URL = ''
    process.env.STRAPI_API_URL = ''

    vi.resetModules()
    vi.doMock('@/lib/constants', () => ({ API_URL: '' }))

    const { normalizeImageUrl: normalizeFresh } = await import('../url')
    expect(normalizeFresh('/uploads/casio.jpg')).toBe(
      'http://127.0.0.1:1337/uploads/casio.jpg',
    )
  })

  it('strips trailing slashes from the resolved base', () => {
    process.env.NEXT_PUBLIC_STRAPI_API_URL = 'http://env-host:9999/'
    process.env.STRAPI_API_URL = ''
    vi.resetModules()
    vi.doMock('@/lib/constants', () => ({ API_URL: '' }))

    return import('../url').then(({ normalizeImageUrl: normalizeFresh }) => {
      // No double slash before /uploads/...
      expect(normalizeFresh('/uploads/casio.jpg')).toBe(
        'http://env-host:9999/uploads/casio.jpg',
      )
    })
  })
})
