# Breadcrumbs Specification

## Purpose

Generate URL- and state-aware breadcrumb lists for every producer route, expose one shared `Breadcrumb` type, and guarantee accessible semantics for the trailing crumb.

## Requirements

### Requirement: Breadcrumb Builder Contract and Type Consolidation

The system MUST expose a pure `buildBreadcrumbs(input)` helper returning a `Breadcrumb[]`. The `Breadcrumb` interface MUST be defined exactly once in `src/types/breadcrumb.ts` with fields `name: string` and `href: string`, and imported by every consumer.

#### Scenario: Typed output and single source of truth

- GIVEN any valid input
- WHEN `buildBreadcrumbs` executes
- THEN it returns an array satisfying the shared `Breadcrumb` interface
- AND a search for `Breadcrumb` type declarations finds exactly one in `src/types/breadcrumb.ts`

### Requirement: Static Crumbs for Non-Catalog Routes

The homepage (`/`) is **out of scope** for this change (deferred to a follow-up). `/carrito`, `/checkout`, and `/favoritos` MUST render 2 levels. `/mi-cuenta/pedidos` MUST render 3 levels. `/mi-cuenta/pedidos/[orderId]` MUST render 4 levels ending in `Pedido #{orderId}`. `/(auth)/login` and `/(auth)/registro` MUST render `Inicio / Login` and `Inicio / Registro` using literal es-ES labels.

#### Scenario: Static routes match expected labels

- GIVEN visits to `/carrito`, `/mi-cuenta/pedidos/42`, `/(auth)/login`, and `/(auth)/registro`
- WHEN each page renders
- THEN the trailing labels read `Carrito`, `Pedido #42`, `Login`, and `Registro` respectively

### Requirement: `/tienda` Category-Aware Crumbs with Transient and Stale Handling

`/tienda` MUST render `Inicio / Tienda` when no `?category=` is present or while `getCategories()` is still resolving on a deep-link (no slug-as-label during the transient). When the slug matches a resolved category, the third crumb MUST be the category's `name`. When no match exists (Strapi deleted it), the third crumb MUST be the raw slug.

#### Scenario: Resolved category

- GIVEN `?category=cronometros` and the categories list contains the matching slug
- WHEN the page renders after fetch resolves
- THEN the list ends with the category `name`

#### Scenario: Transient hides slug

- GIVEN `/tienda?category=chrono` before `getCategories()` resolves
- WHEN the page renders
- THEN the list contains exactly two items and the slug `chrono` is not used as a label

#### Scenario: Stale category

- GIVEN `?category=legacy-line` and the resolved list contains no matching slug
- WHEN the page renders
- THEN the list ends with the literal `legacy-line`

### Requirement: `/tienda/[slug]` Product-Detail Crumbs

The product-detail page MUST render 4 levels `Inicio / Tienda / {Category} / {Product}` when the product has a category, normalizing single-object and array shapes of `product.category`. When the product has no category, the page MUST render exactly 3 levels `Inicio / Tienda / {Product}` with no placeholder.

#### Scenario: Resolved category

- GIVEN `product.category` is `{slug:'dress',name:'Vestir'}` or an array containing it
- WHEN the SSR page renders
- THEN the list ends with `{ProductName}` after `Vestir`

#### Scenario: Product without category

- GIVEN a product with `category` null or empty
- WHEN the page renders
- THEN the list contains `Inicio / Tienda / {ProductName}` only

### Requirement: Out-of-Scope Query Parameters Ignored

The system MUST NOT alter crumbs in response to `?sort=` or `?page=`. Only `?category=` on `/tienda` influences breadcrumb output.

#### Scenario: Sort and page ignored

- GIVEN `/tienda?category=dress&sort=price-asc&page=2`
- WHEN the page renders
- THEN only `category=dress` is reflected

### Requirement: Accessibility Semantics

Every breadcrumb list MUST be wrapped in `<nav aria-label="Breadcrumb">`. Exactly the trailing list item MUST carry `aria-current="page"`. Non-trailing items MUST be anchors linking to their `href`.

#### Scenario: Accessible breadcrumb

- GIVEN any breadcrumb list on any producer route
- WHEN the HTML is inspected
- THEN a `<nav aria-label="Breadcrumb">` wraps the list
- AND the trailing `<li>` has `aria-current="page"`
- AND earlier items are `<a>` tags with matching `href`

### Requirement: Typo Fix in Auth Pages

The `(auth)/login` and `(auth)/registro` files MUST NOT contain the string `breadcrums`.

#### Scenario: Typo removed

- GIVEN a text search of those two files
- WHEN executed
- THEN zero matches for `breadcrums` are returned

