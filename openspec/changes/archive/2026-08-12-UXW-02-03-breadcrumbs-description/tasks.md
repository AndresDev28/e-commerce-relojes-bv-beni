# Tasks: UXW-02 Breadcrumbs and UXW-03 Product Description

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 330–390 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | C1 breadcrumbs → C2 description, two commits in one PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| C1 | Breadcrumb title/truncation defense | Single PR | `npx vitest run --maxWorkers=2 src/components/ui/__tests__/Breadcrumbs.test.tsx` | N/A: presentational class/attribute change | Breadcrumbs component and test |
| C2 | Strapi blocks-to-markdown PDP pipeline | Single PR | `npx vitest run --maxWorkers=2 src/utils/__tests__/blocks.test.ts src/features/catalog/__tests__/ProductDetailClient.test.tsx src/app/tienda/[slug]/__tests__/page.test.tsx` | `npx playwright test tests/e2e/product-detail-ux.spec.ts` | Converter, types, PDP consumers, and related tests |

## Phase 1: C1 Breadcrumbs a11y and truncation

- [x] **T1 RED:** Add four failing cases in `src/components/ui/__tests__/Breadcrumbs.test.tsx` for trailing/non-trailing `title`, `max-w-[12rem] truncate`, and short-label title presence. Run `npx vitest run --maxWorkers=2 <file>`; confirm RED.
- [x] **T2 GREEN:** Update `src/components/ui/Breadcrumbs.tsx` with `title={crumb.name}` and `max-w-[12rem] truncate` on both branches. Scoped Vitest must pass; preserve full text for WCAG Label in Name and keyboard links.
- [x] **T3 VERIFY:** Run scoped C1 Vitest, then `npx vitest run --maxWorkers=2`; smoke breadcrumb routes with keyboard traversal, 200% zoom, and screen-reader/full-label checks. Record GREEN.

## Phase 2: C2 Description RED and conversion foundation

- [x] **T4 RED:** Change the PDP fixture in `src/app/tienda/[slug]/__tests__/page.test.tsx` to blocks; create 8+ converter cases in `src/utils/__tests__/blocks.test.ts` and 3+ ReactMarkdown cases in `src/features/catalog/__tests__/ProductDetailClient.test.tsx`. Run scoped Vitest and confirm RED.
- [x] **T5 GREEN:** Add `StrapiBlockChild`/`StrapiBlock` and change `StrapiProduct.description` in `src/types/index.ts`; create `src/utils/blocks.ts` covering paragraphs, headings, ordered/unordered lists, quote, code, inline emphasis/links, empty/null, and safe unsupported fallback. Converter tests pass.

## Phase 3: C2 Integration and verification

- [x] **T6 GREEN:** In `src/app/tienda/[slug]/page.tsx`, convert blocks before `ProductDetailClient`; set `description: ''` in `src/features/catalog/hooks/useProducts.ts` and `src/features/catalog/components/FeaturedProducts.tsx`. All three focused test files pass.
- [x] **T7 VERIFY:** Create `tests/e2e/product-detail-ux.spec.ts` with full Strapi `page.route()` mock, PDP paragraphs, and breadcrumb title tests on Chromium + Firefox. Run focused Vitest, full `npx vitest run --maxWorkers=2`, `npx playwright test`, then `npx next build`; record GREEN.
