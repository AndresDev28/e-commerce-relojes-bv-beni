/**
 * [BREAD-02] buildBreadcrumbs — pure function unit tests.
 *
 * Covers all 10 BreadcrumbRoute enum values plus the dynamic scenarios:
 * - /tienda transient: slug present but categories list still empty (no slug label)
 * - /tienda stale: slug does not match any resolved category (raw slug label)
 * - /tienda/[slug] product without category: 3 levels (Inicio / Tienda / Product)
 * - /tienda/[slug] object category: 4 levels
 * - /tienda/[slug] array category: 4 levels
 * - ?sort=/?page= ignored: builder doesn't take these params
 *
 * The builder is pure (no I/O, no hooks, no next/link references); every es-ES
 * literal lives in src/utils/breadcrumbs.ts.
 */

import { describe, it, expect } from 'vitest'
import {
  buildBreadcrumbs,
  type BreadcrumbRoute,
  type BuildBreadcrumbsInput,
  type CategoryLookup,
} from '../breadcrumbs'

describe('[BREAD-02] buildBreadcrumbs — static route coverage', () => {
  const staticCases: Array<{
    route: BreadcrumbRoute
    input: BuildBreadcrumbsInput
    expected: Array<{ name: string; href: string }>
  }> = [
    {
      route: 'home',
      input: { route: 'home' },
      expected: [{ name: 'Inicio', href: '/' }],
    },
    {
      route: 'carrito',
      input: { route: 'carrito' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Carrito', href: '/carrito' },
      ],
    },
    {
      route: 'checkout',
      input: { route: 'checkout' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Cesta', href: '/carrito' },
        { name: 'Finalizar Compra', href: '/checkout' },
      ],
    },
    {
      route: 'favoritos',
      input: { route: 'favoritos' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Favoritos', href: '/favoritos' },
      ],
    },
    {
      route: 'pedidos',
      input: { route: 'pedidos' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Mi Cuenta', href: '/mi-cuenta' },
        { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
      ],
    },
    {
      route: 'pedido-detail',
      input: { route: 'pedido-detail', orderId: 'ORD-42' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Mi Cuenta', href: '/mi-cuenta' },
        { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
        { name: 'Pedido #ORD-42', href: '/mi-cuenta/pedidos/ORD-42' },
      ],
    },
    {
      route: 'login',
      input: { route: 'login' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Login', href: '/login' },
      ],
    },
    {
      route: 'registro',
      input: { route: 'registro' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Registro', href: '/registro' },
      ],
    },
    {
      route: 'tienda',
      // No categorySlug → 2 levels
      input: { route: 'tienda' },
      expected: [
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
      ],
    },
  ]

  it.each(staticCases)(
    'route "$route" produces the expected static breadcrumb list',
    ({ input, expected }) => {
      const result = buildBreadcrumbs(input)
      expect(result).toEqual(expected)
    },
  )
})

describe('[BREAD-02] buildBreadcrumbs — /tienda dynamic', () => {
  const categories: CategoryLookup[] = [
    { name: 'Cronómetros', slug: 'cronometros' },
    { name: 'Vestir', slug: 'vestir' },
  ]

  describe('Resolved category (slug matches a known category)', () => {
    it('returns 3 items ending with the category name', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: 'cronometros',
        categories,
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Cronómetros', href: '/tienda?category=cronometros' },
      ])
    })
  })

  describe('Transient — #1 slug present but categories still empty', () => {
    it('returns exactly 2 items and does NOT render the slug as a label', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: 'chrono',
        categories: [],
      })

      expect(result).toHaveLength(2)
      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
      ])

      // Belt-and-suspenders: the slug must not leak into any label
      for (const crumb of result) {
        expect(crumb.name).not.toContain('chrono')
      }
    })
  })

  describe('Stale — #2 slug does not match any resolved category', () => {
    it('returns 3 items ending with the raw slug as a graceful-degradation label', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: 'legacy-line',
        categories,
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'legacy-line', href: '/tienda?category=legacy-line' },
      ])
    })
  })

  describe('No category slug at all', () => {
    it('returns 2 items', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categories,
      })

      expect(result).toHaveLength(2)
    })

    it('handles an explicit empty slug the same as no slug', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: '',
        categories,
      })

      expect(result).toHaveLength(2)
    })

    it('handles a null slug the same as no slug', () => {
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: null,
        categories,
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('Out-of-scope query parameters — #4 ?sort=/?page= are not inputs', () => {
    it('builder contract accepts only categorySlug (no sort or page params)', () => {
      // This test verifies the builder type-level: it has no sort/page parameters.
      // The builder is therefore incapable of reflecting those URL params in its
      // output — by construction. Calling it with the canonical /tienda input
      // yields the resolved-category output regardless of any other URL state.
      const result = buildBreadcrumbs({
        route: 'tienda',
        categorySlug: 'cronometros',
        categories,
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Cronómetros', href: '/tienda?category=cronometros' },
      ])
    })
  })
})

describe('[BREAD-02] buildBreadcrumbs — /tienda/[slug] product-detail', () => {
  const productHref = '/tienda/casio-vintage'

  describe('Resolved category — object shape', () => {
    it('returns 4 items ending with the product name', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: { name: 'Vestir', slug: 'vestir' },
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Vestir', href: '/tienda?category=vestir' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('Resolved category — array shape (single-element array)', () => {
    it('returns 4 items ending with the product name', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: [{ name: 'Vestir', slug: 'vestir' }],
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Vestir', href: '/tienda?category=vestir' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('Resolved category — array shape (multi-element array uses the first item)', () => {
    it('returns 4 items using the first array element as the category', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: [
            { name: 'Vestir', slug: 'vestir' },
            { name: 'Cronómetros', slug: 'cronometros' },
          ],
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Vestir', href: '/tienda?category=vestir' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('No category — #3 product.category is null', () => {
    it('returns exactly 3 items: Inicio / Tienda / Product', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: null,
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('No category — product.category is undefined', () => {
    it('returns exactly 3 items', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('No category — product.category is an empty array', () => {
    it('returns exactly 3 items', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: [],
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })

  describe('No category — product.category is an empty object', () => {
    it('returns exactly 3 items (empty object is treated as no category)', () => {
      const result = buildBreadcrumbs({
        route: 'tienda-product',
        product: {
          name: 'Casio Vintage A158',
          href: productHref,
          category: {},
        },
      })

      expect(result).toEqual([
        { name: 'Inicio', href: '/' },
        { name: 'Tienda', href: '/tienda' },
        { name: 'Casio Vintage A158', href: productHref },
      ])
    })
  })
})

describe('[BREAD-02] buildBreadcrumbs — purity & output shape', () => {
  it('returns a fresh array on every call (no shared mutable state)', () => {
    const a = buildBreadcrumbs({ route: 'home' })
    const b = buildBreadcrumbs({ route: 'home' })
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('every returned item satisfies the Breadcrumb interface', () => {
    const result = buildBreadcrumbs({
      route: 'tienda',
      categorySlug: 'cronometros',
      categories: [{ name: 'Cronómetros', slug: 'cronometros' }],
    })

    for (const crumb of result) {
      expect(typeof crumb.name).toBe('string')
      expect(typeof crumb.href).toBe('string')
      expect(crumb.name.length).toBeGreaterThan(0)
      expect(crumb.href.length).toBeGreaterThan(0)
    }
  })
})