import { describe, it, expect } from 'vitest'
import { sanitizeRedirect } from '@/lib/auth/redirect'

describe('sanitizeRedirect', () => {
  describe('happy path — safe internal paths', () => {
    it('returns the path unchanged', () => {
      expect(sanitizeRedirect('/tienda')).toBe('/tienda')
    })

    it('returns a nested path unchanged', () => {
      expect(sanitizeRedirect('/mi-cuenta/pedidos/abc')).toBe('/mi-cuenta/pedidos/abc')
    })

    it('preserves query strings', () => {
      expect(sanitizeRedirect('/tienda?category=relojes')).toBe('/tienda?category=relojes')
    })

    it('preserves fragments', () => {
      expect(sanitizeRedirect('/mi-cuenta/pedidos/abc#status')).toBe('/mi-cuenta/pedidos/abc#status')
    })
  })

  describe('missing or empty input → default fallback', () => {
    it('returns /mi-cuenta for null', () => {
      expect(sanitizeRedirect(null)).toBe('/mi-cuenta')
    })

    it('returns /mi-cuenta for undefined', () => {
      expect(sanitizeRedirect(undefined)).toBe('/mi-cuenta')
    })

    it('returns /mi-cuenta for empty string', () => {
      expect(sanitizeRedirect('')).toBe('/mi-cuenta')
    })
  })

  describe('open-redirect rejection — protocol-relative and backslash', () => {
    it('rejects //evil.com', () => {
      expect(sanitizeRedirect('//evil.com')).toBe('/mi-cuenta')
    })

    it('rejects /\\evil.com', () => {
      expect(sanitizeRedirect('/\\evil.com')).toBe('/mi-cuenta')
    })
  })

  describe('open-redirect rejection — absolute URLs with scheme', () => {
    it('rejects http://evil.com', () => {
      expect(sanitizeRedirect('http://evil.com')).toBe('/mi-cuenta')
    })

    it('rejects https://evil.com', () => {
      expect(sanitizeRedirect('https://evil.com')).toBe('/mi-cuenta')
    })
  })

  describe('open-redirect rejection — javascript and data URIs', () => {
    it('rejects javascript:alert(1)', () => {
      expect(sanitizeRedirect('javascript:alert(1)')).toBe('/mi-cuenta')
    })

    it('rejects data:text/html URI', () => {
      expect(sanitizeRedirect('data:text/html,<script>alert(1)</script>')).toBe('/mi-cuenta')
    })
  })

  describe('open-redirect rejection — path without leading slash', () => {
    it('rejects evil.com (no leading /)', () => {
      expect(sanitizeRedirect('evil.com')).toBe('/mi-cuenta')
    })

    it('rejects tienda (no leading /)', () => {
      expect(sanitizeRedirect('tienda')).toBe('/mi-cuenta')
    })
  })

  describe('auth-page loop prevention', () => {
    it('rejects /login', () => {
      expect(sanitizeRedirect('/login')).toBe('/mi-cuenta')
    })

    it('rejects /login?redirect=/tienda', () => {
      expect(sanitizeRedirect('/login?redirect=/tienda')).toBe('/mi-cuenta')
    })

    it('rejects /registro', () => {
      expect(sanitizeRedirect('/registro')).toBe('/mi-cuenta')
    })

    it('rejects /registro?foo=bar', () => {
      expect(sanitizeRedirect('/registro?foo=bar')).toBe('/mi-cuenta')
    })
  })
})
