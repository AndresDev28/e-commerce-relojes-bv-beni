# Proposal: UXW-02 + UXW-03 — Breadcrumb truncation + Product description rendering

## Intent

Two product-detail-page UX bugs surfaced during the UXW-01 regression sweep. **UXW-02**: breadcrumb items render no `title` attribute and no CSS truncation — long product names overflow on mobile, and neither pointer nor assistive-tech users can recover the full label. **UXW-03**: `/tienda/{slug}` never renders the product description — Strapi 5 returns `description` as a blocks array, but the frontend guards on `typeof === 'string'` (always false), so every PDP falls back to "No hay descripción disponible". Description content drives purchase decisions and SEO; today both silently break in production while CI stays green, because the page test mocks `description` as a string.

## Proposal question round

Satisfied during explore: the user locked all product decisions (frontend-only converter in `src/utils/blocks.ts`, backend untouched, test mock updated in the same PR, spec placement). No further product questions remain; the items under **Open questions** are design-phase technical decisions.

## Scope

### In Scope

- UXW-02: `title={crumb.name}` on both render branches + `max-w-* truncate` on the trailing span in `src/components/ui/Breadcrumbs.tsx`
- UXW-02: tests for `title` on both branches + truncation-class defense
- UXW-03: NEW `src/utils/blocks.ts` with `blocksToMarkdown()` converter (no new npm deps)
- UXW-03: call the converter in `src/app/tienda/[slug]/page.tsx` and `src/features/catalog/hooks/useProducts.ts`
- UXW-03: fix `StrapiProduct.description` type to `StrapiBlock[] | null` in `src/types/index.ts`
- UXW-03: update the `FeaturedProducts.tsx` consumer (L47) coherently
- UXW-03: tests — converter unit, rendering pipeline (jsdom), mock update in `page.test.tsx`
- UXW-03: NEW Playwright E2E `tests/e2e/product-detail-ux.spec.ts` covering TC-01 + TC-02

### Out of Scope

- Backend changes (`../e-commerce-relojes-bv-beni-api`) — frontend-only PR
- Replacing `react-markdown` with a Strapi blocks renderer (deferred)
- Pagination / catalog-load-more changes (separate spec, separate ticket)
- Other react-markdown surfaces (FAQ, terms) — only the PDP description pipeline is fixed
- Cross-browser styling polish beyond the truncation defense

## Capabilities

### New Capabilities

- `product-detail`: PDP description rendering pipeline — Strapi 5 blocks → markdown conversion, empty/null fallback behavior, and the `StrapiProduct.description` type contract.

### Modified Capabilities

- `breadcrumbs`: additive a11y requirement — `title` attribute on both render branches plus truncation defense on the trailing crumb.

## Approach

### UXW-02 (breadcrumbs a11y)

- Add `title={crumb.name}` on the trailing `<span>` (L40) and the non-trailing `<Link>` (L44).
- Add `max-w-[…] truncate` (Tailwind) on the trailing span for mobile overflow defense; exact width decided in design.
- Keep existing tests green; add tests for `title` presence on both branches and the truncation class.

### UXW-03 (description rendering)

- NEW `src/utils/blocks.ts` exporting `blocksToMarkdown(blocks: StrapiBlock[]): string`.
- `src/types/index.ts`: define `StrapiBlock` (shape `{ type: string; children: Array<{ type: string; text: string; … }> }`); change `StrapiProduct.description: string | null` → `StrapiBlock[] | null`.
- `src/app/tienda/[slug]/page.tsx` L53-56: replace the `typeof === 'string'` guard with `blocksToMarkdown(strapiProduct.description ?? [])`; result feeds `ProductDetailClient`, which renders ReactMarkdown.
- `src/features/catalog/hooks/useProducts.ts` L61: apply the same conversion in `formatProduct`.
- `src/features/catalog/components/FeaturedProducts.tsx` L47: apply the same conversion (or drop the field if `ProductCard` does not display it — confirm during design).
- `src/app/tienda/[slug]/__tests__/page.test.tsx` L28: update the mock to the blocks shape — closes the "CI green while prod broken" gap.

### Spec placement

- UXW-02 → extend `openspec/specs/breadcrumbs/spec.md` (additive a11y requirement on the existing spec).
- UXW-03 → NEW `openspec/specs/product-detail/spec.md` (no existing PDP spec; rendering is a separate domain from catalog-loading).

### E2E coverage

- NEW `tests/e2e/product-detail-ux.spec.ts` using a `page.route()` mock that returns a blocks-shape Strapi payload (pattern reused from `tests/e2e/login-redirect.spec.ts`).
- TC-01: load `/tienda/{slug}`, assert description paragraphs are visible (Chromium + Firefox).
- TC-02: regression — breadcrumbs still render with the `title` attribute (Chromium + Firefox).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ui/Breadcrumbs.tsx` | Modified | `title` on both branches + truncation on trailing span |
| `src/utils/blocks.ts` | New | `blocksToMarkdown()` converter |
| `src/types/index.ts` | Modified | `StrapiBlock` type; `StrapiProduct.description` shape fix |
| `src/app/tienda/[slug]/page.tsx` | Modified | Replace string guard with converter call |
| `src/features/catalog/hooks/useProducts.ts` | Modified | Convert description in `formatProduct` |
| `src/features/catalog/components/FeaturedProducts.tsx` | Modified | Convert or drop description field (design decides) |
| `src/app/tienda/[slug]/__tests__/page.test.tsx` | Modified | Mock updated to blocks shape |
| `tests/e2e/product-detail-ux.spec.ts` | New | Playwright TC-01 + TC-02 |

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Strapi blocks shape evolves (Strapi v6) | Low | Single converter in `src/utils/blocks.ts` is the one place to update |
| `FeaturedProducts` description field may not be displayed | Low | Confirm during design; either convert or remove |
| Visual regression on routes with short trailing crumbs | Low | `max-w` only on trailing span; verify `/pedido-detail` (short) and `/tienda/[slug]` (long) |
| react-markdown behavior change | Low | Pinned in package.json; existing tests cover rendering |
| Production blocks shape differs from expectation | Low | Verified against seed-orders L71,81,91 during explore |

## Non-goals

- Migrating other react-markdown consumers (FAQ, terms) to the blocks pipeline — no bug there.
- Cross-locale breadcrumb handling — current es-ES-only behavior unchanged.
- Server-side markdown rendering optimization — `react-markdown` runs fine as-is.

## Open questions (decide before sdd-design)

1. Does `ProductCard` render the `description` field fed by `FeaturedProducts.tsx` L47? If not, remove it from the type projection entirely.
2. Tailwind `max-w` value for the trailing crumb — `max-w-[12rem]` (~192px) vs `max-w-[16rem]`; measure on `/tienda/[slug]` with a long product name.
3. Playwright `page.route()` mock scope — recommend returning the full Strapi product payload with `description: [{…blocks}]` to exercise the full pipeline. Confirm during design.

## Alternatives considered

- **UXW-02 CSS-only truncation**: rejected — hides information from screen readers; `title` is required for a11y.
- **UXW-02 tooltip library (Radix, Headless UI)**: rejected — adds a dependency for what the native `title` attribute handles.
- **UXW-02 middle-ellipsis truncation**: rejected — confusing; ellipsis-at-end is the standard.
- **UXW-03 backend serializer**: rejected — out of frontend-only PR scope; requires cross-repo coordination.
- **UXW-03 `@strapi/blocks-react-renderer`**: deferred — adds a dependency and larger surface; the converter suffices for this store's description shape.
- **UXW-03 HTML escaping + `dangerouslySetInnerHTML`**: rejected — XSS risk; `react-markdown` is safe.

## Rollback Plan

Single revert of the PR commit(s). No schema migration, no backend change, no feature flag, no wire-format change. Revert restores the (broken) status quo: fallback description text and title-less breadcrumbs. All changes are local to breadcrumb rendering and the PDP description pipeline — no API contract changes.

## Definition of Done

- [ ] UXW-02: `title` attr on both render branches + `max-w-* truncate` on trailing span
- [ ] UXW-02: 4 new Vitest cases covering `title` attr, truncation class, short-name fallback
- [ ] UXW-03: `src/utils/blocks.ts` `blocksToMarkdown()` converter with unit tests
- [ ] UXW-03: `StrapiProduct.description` type updated to `StrapiBlock[] | null`
- [ ] UXW-03: `page.tsx`, `useProducts.ts`, `FeaturedProducts.tsx` consumers updated
- [ ] UXW-03: existing mock in `page.test.tsx` updated to blocks shape
- [ ] UXW-03: 3 new Vitest cases (converter, fallback, rendering)
- [ ] UXW-03: NEW `tests/e2e/product-detail-ux.spec.ts` with 2 tests on Chromium + Firefox
- [ ] `npx vitest run --maxWorkers=2` green
- [ ] `npx playwright test` green on chromium + firefox
- [ ] `npx next build` green
