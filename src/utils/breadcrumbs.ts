/**
 * Pure URL/page-aware breadcrumb builder.
 *
 * Single entry point used by every producer route. No I/O, no hooks, no
 * `next/link` references — every es-ES label literal lives here so the routes
 * stay declarative ("which page am I on?") rather than copy-pasting arrays.
 *
 * Re-exports the shared `Breadcrumb` type from `@/types/breadcrumb` so callers
 * can `import { Breadcrumb, buildBreadcrumbs } from '@/utils/breadcrumbs'`.
 */

import type { Breadcrumb } from '@/types/breadcrumb'

// ============================================
// Public types
// ============================================

/**
 * Discriminator for every breadcrumb producer in the app. Adding a new route
 * means adding a new literal here — TypeScript will surface every call site.
 */
export type BreadcrumbRoute =
  | 'home'
  | 'tienda'
  | 'tienda-product'
  | 'carrito'
  | 'checkout'
  | 'favoritos'
  | 'pedidos'
  | 'pedido-detail'
  | 'login'
  | 'registro'

/**
 * Minimum shape required to resolve a category slug into a display label.
 * `getCategories()` returns more fields; the builder only needs `name` and `slug`.
 */
export interface CategoryLookup {
  name: string
  slug: string
}

/**
 * Shape required from a Strapi product to derive the `/tienda/[slug]` crumb.
 * Both object and array shapes of `category` are accepted — the builder
 * normalizes them internally.
 */
export interface ProductForBreadcrumbs {
  name: string
  href: string
  category?: unknown
}

/**
 * Input contract for `buildBreadcrumbs`. Route-specific fields are optional;
 * the builder ignores them when irrelevant to the route.
 */
export interface BuildBreadcrumbsInput {
  route: BreadcrumbRoute
  /** Required only when `route === 'tienda'`. */
  categorySlug?: string | null
  /** Required only when `route === 'tienda'`. */
  categories?: readonly CategoryLookup[]
  /** Required only when `route === 'tienda-product'`. */
  product?: ProductForBreadcrumbs
  /** Required only when `route === 'pedido-detail'`. */
  orderId?: string
}

// ============================================
// Pure helpers (internal)
// ============================================

/**
 * Extract the first usable category from an object-or-array (or nullish) shape.
 * Returns `null` if the shape is empty/null/undefined so callers can branch on
 * "no category at all" vs "category present".
 */
function readCategory(product: ProductForBreadcrumbs): {
  name: string
  slug: string
} | null {
  const raw = product.category
  if (raw == null) return null

  // Array form: take the first usable element.
  if (Array.isArray(raw)) {
    const first = raw.find(
      (item): item is { name: string; slug: string } =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as { name?: unknown }).name === 'string' &&
        typeof (item as { slug?: unknown }).slug === 'string' &&
        ((item as { name: string }).name.length > 0) &&
        ((item as { slug: string }).slug.length > 0),
    )
    return first ?? null
  }

  // Object form.
  if (typeof raw === 'object') {
    const name = (raw as { name?: unknown }).name
    const slug = (raw as { slug?: unknown }).slug
    if (typeof name === 'string' && typeof slug === 'string' && name.length > 0 && slug.length > 0) {
      return { name, slug }
    }
    return null
  }

  return null
}

// ============================================
// Public builder
// ============================================

/**
 * Build the breadcrumb list for a given route.
 *
 * Pure: same input → same output, no shared mutable state, no I/O. The result
 * is always a fresh array.
 */
export function buildBreadcrumbs(input: BuildBreadcrumbsInput): Breadcrumb[] {
  const { route } = input

  switch (route) {
    case 'home':
      return [{ name: 'Inicio', href: '/' }]

    case 'carrito':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Carrito', href: '/carrito' },
      ]

    case 'checkout':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Cesta', href: '/carrito' },
        { name: 'Finalizar Compra', href: '/checkout' },
      ]

    case 'favoritos':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Favoritos', href: '/favoritos' },
      ]

    case 'pedidos':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Mi Cuenta', href: '/mi-cuenta' },
        { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
      ]

    case 'pedido-detail': {
      const orderId = input.orderId ?? ''
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Mi Cuenta', href: '/mi-cuenta' },
        { name: 'Mis Pedidos', href: '/mi-cuenta/pedidos' },
        {
          name: `Pedido #${orderId}`,
          href: `/mi-cuenta/pedidos/${orderId}`,
        },
      ]
    }

    case 'login':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Login', href: '/login' },
      ]

    case 'registro':
      return [
        { name: 'Inicio', href: '/' },
        { name: 'Registro', href: '/registro' },
      ]

    case 'tienda':
      return buildTiendaCrumbs(input.categorySlug, input.categories)

    case 'tienda-product':
      return buildTiendaProductCrumbs(input.product)

    default: {
      // Exhaustiveness guard — adding a new BreadcrumbRoute without a case
      // here will surface as a TypeScript error at the call sites.
      const _exhaustive: never = route
      void _exhaustive
      return []
    }
  }
}

// ============================================
// Per-route builders (internal)
// ============================================

function buildTiendaCrumbs(
  categorySlug: string | null | undefined,
  categories: readonly CategoryLookup[] | undefined,
): Breadcrumb[] {
  const base: Breadcrumb[] = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda' },
  ]

  // No slug → 2 levels.
  if (!categorySlug || categorySlug.length === 0) {
    return base
  }

  // Transient (#1): slug present but categories not yet resolved → stay at 2.
  if (!categories || categories.length === 0) {
    return base
  }

  // Resolved: use the category's display name.
  const match = categories.find((c) => c.slug === categorySlug)
  if (match) {
    return [
      ...base,
      { name: match.name, href: `/tienda?category=${categorySlug}` },
    ]
  }

  // Stale (#2): slug doesn't match any resolved category → show raw slug.
  return [
    ...base,
    { name: categorySlug, href: `/tienda?category=${categorySlug}` },
  ]
}

function buildTiendaProductCrumbs(
  product: ProductForBreadcrumbs | undefined,
): Breadcrumb[] {
  if (!product) {
    // Defensive: builder contract requires product for this route.
    // Returning the base 2-level list keeps the consumer rendering stable
    // rather than throwing at runtime.
    return [
      { name: 'Inicio', href: '/' },
      { name: 'Tienda', href: '/tienda' },
    ]
  }

  const category = readCategory(product)
  const base: Breadcrumb[] = [
    { name: 'Inicio', href: '/' },
    { name: 'Tienda', href: '/tienda' },
  ]

  if (!category) {
    // #3: product without category → 3 levels, NO placeholder.
    return [
      ...base,
      { name: product.name, href: product.href },
    ]
  }

  return [
    ...base,
    { name: category.name, href: `/tienda?category=${category.slug}` },
    { name: product.name, href: product.href },
  ]
}