# Tasks: frontend/ux-breadcrumbs

## Review Workload Forecast

Estimated changed lines: 370–435. 400-line budget risk: High. Chained PRs recommended: Yes. Delivery strategy: ask-on-risk. Chain strategy: stacked-to-main. Fallback if overshoot: PR#1 = WU1+WU2+WU3, PR#2 = WU4+WU5+WU6+WU7, PR#3 = WU8.

Decision needed before apply: Yes (review workload guard fired; user chose split into 3 chained PRs with stacked-to-main)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

> **size:exception for PR#1**: actual measured diff at apply time was **916 code lines** (planning files 688 lines excluded — those travel separately). The WU2 builder (`src/utils/breadcrumbs.ts` 268 lines + test 390 lines) is larger than originally forecast. Maintainer (user) accepted the exception 2026-07-21; rationale logged. PR#2 and PR#3 remain within budget.

> Home page OUT of scope (#6). Tests first; impl only after failing test.
>
> WU8 covers the home page wiring previously deferred by decision #6.

## WU1 (A) — Type single source

- [ ] A1 RED: write `src/types/__tests__/breadcrumb-source.test.ts` — DRY grep asserts one `Breadcrumb` declaration under `src/types/breadcrumb.ts`; compile-time shape asserts `name: string; href: string`.
- [ ] A2 GREEN: create `src/types/breadcrumb.ts` exporting `interface Breadcrumb { name: string; href: string }` + JSDoc.
- [ ] A3 VERIFY: `npx vitest run --maxWorkers=2 src/types/__tests__/breadcrumb-source.test.ts`; suite green. Rollback: revert file + test.

## WU2 (B) — `buildBreadcrumbs` pure function

- [ ] B1 RED: write `src/utils/__tests__/breadcrumbs.test.ts` — all 10 routes + transient (#1) + stale (#2) + no-category (#3) + object/array `product.category` + `?sort=`/`?page=` ignored (#4).
- [ ] B2 GREEN: create `src/utils/breadcrumbs.ts` exporting `BreadcrumbRoute`, `CategoryLookup`, `BuildBreadcrumbsInput`, `buildBreadcrumbs(input): Breadcrumb[]`. Pure.
- [ ] B3 VERIFY: `npx vitest run --maxWorkers=2 src/utils/__tests__/breadcrumbs.test.ts`; suite green. Rollback: revert file + test.

## WU3 (C) — `<Breadcrumbs>` a11y

- [ ] C1 RED: write `src/app/components/ui/__tests__/Breadcrumbs.test.tsx` asserting `<nav aria-label="Breadcrumb">`, trailing `<li aria-current="page"><span>`, earlier `<a>` w/ matching `href`.
- [ ] C2 GREEN: modify `src/app/components/ui/Breadcrumbs.tsx` — import from `@/types/breadcrumb` (drop dup); trailing `<span aria-current="page">`, earlier `<Link>`.
- [ ] C3 VERIFY: `npx vitest run --maxWorkers=2 src/app/components/ui/__tests__/Breadcrumbs.test.tsx`; suite green. Rollback: revert component + test.

## WU4 (D) — Static routes wired + typo fix

- [ ] D1 `src/app/carrito/page.tsx`: `route:'carrito'` (2 levels).
- [ ] D2 `src/app/checkout/page.tsx`: `route:'checkout'` (3 levels).
- [ ] D3 `src/app/favoritos/page.tsx`: `route:'favoritos'` (2 levels).
- [ ] D4 `src/app/mi-cuenta/pedidos/page.tsx`: `route:'pedidos'` (3 levels).
- [ ] D5 `src/app/mi-cuenta/pedidos/[orderId]/page.tsx`: `route:'pedido-detail',orderId` (4 levels, `Pedido #{orderId}`).
- [ ] D6 `src/app/(auth)/login/page.tsx`: `route:'login'` (`Login`, #5); rename `breadcrums`.
- [ ] D7 `src/app/(auth)/registro/page.tsx`: `route:'registro'` (`Registro`, #5); rename `breadcrums`.
- [ ] D8 VERIFY: suite green; `grep -rn 'breadcrums' src/` = 0; DRY test passes. Rollback: per-file; typo separate.

## WU5 (E) — `/tienda` category-aware wiring

- [ ] E1 RED: write `src/app/tienda/__tests__/page.test.tsx` mocking `getCategories`; assert transient (#1), resolved, stale (#2), `?sort=`/`?page=` ignored (#4).
- [ ] E2 GREEN: modify `src/app/tienda/page.tsx` — `useMemo(() => buildBreadcrumbs({ route:'tienda', categorySlug, categories }), [categories, categorySlug])` + JSDoc.
- [ ] E3 VERIFY: `npx vitest run --maxWorkers=2 src/app/tienda/__tests__/page.test.tsx`; suite green. Rollback: revert page + test.

## WU6 (F) — `/tienda/[slug]` SSR product-detail wiring

- [ ] F1 RED: write `src/app/tienda/[slug]/__tests__/page.test.tsx` mocking `getProductBySlug`; assert 4-level (object|array) and 3-level (`category` null/empty, #3).
- [ ] F2 GREEN: `src/app/tienda/[slug]/page.tsx` — SSR `buildBreadcrumbs({ route:'tienda-product', product: strapiProduct })`; pass to client.
- [ ] F3 GREEN: `src/features/catalog/components/ProductDetailClient.tsx` — accept `breadcrumbs: Breadcrumb[]` prop; render `<Breadcrumbs breadcrumbs={breadcrumbs} />`.
- [ ] F4 VERIFY: `npx vitest run --maxWorkers=2 src/app/tienda/[slug]/__tests__/page.test.tsx`; suite green; DRY test passes. Rollback: revert page + client + test.

## WU7 (G) — `ShopLoopHead` drops local duplicate

- [ ] G1 GREEN: `src/features/catalog/components/ShopLoopHead.tsx` — remove local `interface Breadcrumb`; add import.
- [ ] G2 VERIFY: suite green; DRY test confirms exactly one declaration. Rollback: revert file; DRY test fails as signal.

## WU8 (H) — Home page wiring

- [ ] H1 RED: create `src/app/__tests__/` dir; write `src/app/__tests__/page.test.tsx` — mock `getProducts`/`getCategories` (return `[]`, rendering prerequisite); render `Home`; assert `<Breadcrumbs>` receives `[{name:'Inicio', href:'/'}]` via `buildBreadcrumbs({route:'home'})` integration (no breadcrumb-specific mocks).
- [ ] H2 GREEN: modify `src/app/page.tsx` — import `buildBreadcrumbs` from `@/utils/breadcrumbs`; call `buildBreadcrumbs({ route: 'home' })` server-side (no `useMemo` — server component); render `<Breadcrumbs breadcrumbs={breadcrumbs} />` above `<HeroSection />`.
- [ ] H3 VERIFY: `npx vitest run --maxWorkers=2 src/app/__tests__/page.test.tsx`; suite green. Rollback: revert `src/app/page.tsx` + remove `src/app/__tests__/page.test.tsx`.