# Exploration: Fix Catalog Duplicate Keys

**Change**: fix-catalog-duplicate-keys
**Type**: Bug fix (production blocker)
**Date**: 2026-06-19
**Base commit**: `03f206d`

## Current State

The `/tienda` catalog page renders products from `useProducts` (a client hook that
paginates Strapi via "Load More" with URL sync). Two defects combine to produce React
duplicate-key warnings and dropped products:

1. **Unstable Strapi pagination (root cause).** `getProducts(params)` in
   `src/lib/api.ts` only sets a `sort` query key when the caller explicitly passes
   `params.sort`. `useProducts` defaults `sort` to `'default'` and skips passing it
   (`useProducts.ts:83-85`), so the default catalog request sends NO sort param at all.
   Strapi v4 OFFSET/LIMIT pagination returns rows in arbitrary order without an explicit
   stable sort, so parallel-fetched pages overlap (same product appears on two pages).
   The current sort syntax is the single comma-separated form `sort=price:asc`
   (`api.ts:99`). Strapi v4 documents multi-field sort ONLY as array syntax
   `sort[0]=field:asc&sort[1]=id:asc`; the comma form is undocumented and may be
   silently ignored, preventing a secondary tiebreaker.

2. **No deduplication safety net.** `useProducts` accumulates pages via
   `Promise.all` (`useProducts.ts:130-136`) and concatenates results with no
   `deduplicateById` (`useProducts.ts:139-142`). Duplicate IDs flow straight into
   `products` state and render as `<div key={product.id}>` (`page.tsx:62`), triggering
   the React duplicate-key error.

### Evidence (from prior diagnostic session, 102 watches in Strapi)
- `rawCount: 19, dedupedCount: 16, strapiTotal: 19` for the "edgy" category.
- Product IDs 188, 192, 208 appeared on multiple pages during parallel fetch.

### Pre-existing debt (OUT of scope — documented only)
- `getProducts(params)` in `src/lib/api.ts:102-128` has a **double-fetch bug**: line
  102 calls `fetchApi` and stores the result in `data`, which is never used; lines
  107-128 perform a second manual `fetch` that produces the actual return value. Every
  paginated call wastes one HTTP request. The existing `products-pagination.test.ts`
  does not catch this because it only inspects `mockFetch.mock.calls[0][0]` (the dead
  call), and both calls build an identical URL from the same `query` object.

## Affected Areas

- `src/lib/api.ts` — sort query building in `getProducts(params)` (lines 91-100). Must
  always emit a stable sort tiebreaker using Strapi v4 array syntax.
- `src/features/catalog/hooks/useProducts.ts` — product accumulation (lines 111-147).
  Must add a `deduplicateById` safety net before `setProducts`.
- `src/lib/api/__tests__/products-pagination.test.ts` — sort assertions (lines 59-101).
  Must update from `sort=price%3Aasc` to `sort[0]=price%3Aasc&sort[1]=id:asc` and add a
  default-tiebreaker test.
- `src/features/catalog/hooks/__tests__/useProducts.test.ts` — NEW. Dedup behavior test
  via `renderHook` (pattern established in `CartContext.test.tsx`; `next/navigation`
  mock pattern from `OrderHistory.test.tsx`).

## Minimal Fix Boundary

### IN scope
1. Stable Strapi sort tiebreaker in `api.ts`: always send `sort[0]=id:asc` when no
   explicit sort; append `sort[1]=id:asc` as secondary key for explicit sorts.
2. Correct Strapi v4 array sort syntax (`sort[0]=`/`sort[1]=`) replacing the
   undocumented comma form.
3. `deduplicateById` safety net in `useProducts`, applied to both the page-1 path and
   the parallel-accumulate path.
4. Focused unit tests: update `products-pagination.test.ts` sort assertions; add
   `useProducts` dedup test.
5. Minimal type updates if needed (current `GetProductsParams.sort: string` likely
   needs no change).

### OUT of scope (hard guardrails)
- X-Trace-Id header refactor.
- API error-mapping refactor (ApiError).
- `page.tsx` architecture refactor (the `key={product.id}` stays correct once products
  are deduped).
- Fixing the pre-existing `api.ts` double-fetch bug — documented as debt only.

## Approaches

### 1. Fix sort in api.ts (query builder) + dedup safety net in useProducts
Always emit a stable sort at the query-building layer; add defense-in-depth dedup at
the accumulation layer.

- **Pros**: Fixes root cause at the correct single responsibility point (`getProducts`
  owns Strapi query construction); dedup is a safety net for residual drift; both
  layers protected; minimal blast radius (2 source files).
- **Cons**: Default catalog order visibly changes from arbitrary to `id:asc` (creation
  order) — intentional and desirable, but is a behavior change.
- **Effort**: Low
- **Estimated changed lines**: ~140-180 (well under the 400-line budget)

### 2. Fix sort only in useProducts (always pass sort) + dedup in useProducts
Pass an explicit sort from the hook so `api.ts` always receives one; skip touching
`api.ts` sort logic.

- **Pros**: Touches only one source file.
- **Cons**: Does NOT fix the array syntax — `api.ts` still emits the undocumented comma
  form `sort=price:asc`, so a secondary `id:asc` tiebreaker cannot be expressed. Root
  cause only partially addressed; multi-field sort remains impossible.
- **Effort**: Low
- **Estimated changed lines**: ~80-100

### 3. Fix sort in api.ts + dedup in useProducts + fix double-fetch
Same as Approach 1 but also removes the dead `fetchApi` call at `api.ts:102`.

- **Pros**: Eliminates the wasted HTTP request per paginated call.
- **Cons**: Violates the hard scope guardrail (double-fetch is explicitly OUT). Risks
  scope spiral — the previous attempt was reset for exactly this kind of scope creep.
- **Effort**: Medium
- **Rejected**: Out of scope per guardrails.

## Recommendation

**Approach 1.** It fixes the root cause at the correct architectural layer
(`getProducts` is the single point that builds Strapi queries) and adds the
`deduplicateById` safety net at the accumulation layer. The sort tiebreaker guarantees
deterministic page boundaries; the dedup guarantees that even if residual drift occurs
(network timing, concurrent inserts), no duplicate key ever reaches React. Approach 2
is rejected because it cannot express a multi-field sort. Approach 3 is rejected by the
scope guardrails.

## Risks

- **Default order change**: catalog default sort becomes `id:asc` (creation order)
  instead of arbitrary. This is intentional and desirable, but is a visible behavior
  change the user should confirm.
- **Strapi array sort acceptance**: the fix relies on Strapi v4 honoring
  `sort[0]=field:asc&sort[1]=id:asc`. This is the documented form (confirmed in the
  prior diagnostic session). If the Strapi instance ignores it, the dedup safety net
  still prevents duplicate keys, but products could still be lost to pagination drift
  — dedup is a safety net, not a cure for lost rows.
- **Double-fetch debt remains**: each paginated call still wastes one HTTP request.
  Pre-existing, not a regression. Should be tracked as a follow-up change.
- **Test update surface**: the 6 existing sort assertions in
  `products-pagination.test.ts` must change from `sort=` to `sort[0]=`/`sort[1]=`. No
  behavior regression — the URL is just expressed in the documented form.

## Assumptions

- Strapi v4 accepts `sort[0]=field:asc&sort[1]=id:asc` (documented behavior).
- `id` is a valid Strapi sort field (standard for all content types).
- `id:asc` (creation order) is an acceptable default catalog order.
- `@testing-library/react` ^16.3.0 `renderHook` + `next/navigation` mock are sufficient
  to test the `useProducts` dedup path (both patterns already exist in the codebase).

## Rollback Plan

The change is isolated to 2 source files + 2 test files on a dedicated branch. Rollback
is a single `git revert` or branch deletion back to `03f206d`. No database migrations,
no environment changes, no irreversible state.

## Ready for Proposal

**Yes.** The root cause is confirmed, the minimal fix boundary is clear, the blast
radius is small (~140-180 lines), and the scope guardrails are explicit. The
orchestrator should tell the user:
- The default catalog order will change to creation order (`id:asc`) — confirm this is
  acceptable.
- The pre-existing double-fetch bug will NOT be fixed in this change (documented as
  debt) to keep the change focused.
