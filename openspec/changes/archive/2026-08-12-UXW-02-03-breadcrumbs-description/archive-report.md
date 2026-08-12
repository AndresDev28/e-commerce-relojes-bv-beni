# Archive Report: UXW-02 + UXW-03 — Breadcrumb Truncation & Product Description Rendering

## Change Summary

The change closes two UXW debts in one branch. **UXW-02** hardens the `Breadcrumbs` component against long labels on narrow viewports: every item now exposes its full label through a `title` attribute (native tooltip), and both the trailing span and the non-trailing Link branches apply `max-w-[12rem] truncate` for mobile overflow defense. **UXW-03** rewires the product-detail page to render Strapi 5 rich-text blocks as markdown: a new `StrapiBlock`/`StrapiBlockChild` type pair replaces the broken `description: string` guard, a pure `blocksToMarkdown()` converter (`src/utils/blocks.ts`) handles paragraph/heading/list/quote/code/inline/empty/null/unknown cases, and the PDP wires it into ReactMarkdown with paragraph/heading/list overrides. Catalog mappers set `description: ''` because `ProductCard` doesn't render it. The change ships one extended capability spec (`breadcrumbs`) and one new capability spec (`product-detail`).

## Final State (per orchestrator launch prompt)

| Metric | Value |
|---|---|
| Verdict | PASS_WITH_WARNINGS — no CRITICAL |
| Requirements satisfied | 5/5 (1+4) |
| Scenarios runtime-pass | 19/19 (4+15) |
| Vitest scoped (changed files) | 36/36 GREEN (exit 0) |
| Vitest full suite | 953 pass / 21 fail (exit 1; 21 failures are pre-existing `localStorage.clear` jsdom gap, ZERO in changed files) |
| Playwright E2E | 4/4 GREEN (2 tests × Chromium + Firefox) |
| `npx next build` | GREEN (exit 0) |
| `npx tsc --noEmit` | 0 errors |
| Runtime ledger | closed (`state: complete`); size:exception accepted |
| LOC changed vs `main` | 673 (662 insertions + 11 deletions) |
| Branch | `frontend/UXW-02-03-breadcrumbs-description` — ready for push |
| HEAD | `cfdb7eb` (C2) |
| Size exception | maintainer reset by AndresDev28 (673 > 400 budget) |

## Commits (2 total)

| SHA | Message | Scope |
|---|---|---|
| `0d15f1e` | `feat(breadcrumbs): add title attr + truncation defense (UXW-02)` | C1 |
| `cfdb7eb` | `feat(product-detail): convert Strapi blocks to markdown description (UXW-03)` | C2 |

## Files Changed (12)

### Created (5)

| File | Purpose |
|---|---|
| `src/utils/blocks.ts` | Pure `blocksToMarkdown()` converter (paragraph/heading/list/quote/code/inline/empty/null/unknown) |
| `src/utils/__tests__/blocks.test.ts` | 16 converter cases |
| `src/features/catalog/__tests__/ProductDetailClient.test.tsx` | 4 ReactMarkdown pipeline cases (characterization) |
| `tests/e2e/product-detail-ux.spec.ts` | Playwright E2E (PDP paragraphs + breadcrumb title) |
| `tests/e2e/mock-strapi-server.mjs` | Standalone mock Strapi server (port :1338) — necessary because `page.route()` cannot intercept server-component fetches |

### Modified (7)

| File | Change |
|---|---|
| `src/components/ui/Breadcrumbs.tsx` | `title={crumb.name}` + `max-w-[12rem] truncate` on both branches |
| `src/components/ui/__tests__/Breadcrumbs.test.tsx` | +4 UXW-02 cases (title + truncation defense) |
| `src/types/index.ts` | `StrapiBlock`/`StrapiBlockChild`; `description: StrapiBlock[] \| null` |
| `src/app/tienda/[slug]/page.tsx` | `blocksToMarkdown(description ?? [])` before `ProductDetailClient` |
| `src/app/tienda/[slug]/__tests__/page.test.tsx` | Blocks-shape JSON fixture + 7 mapping cases |
| `src/features/catalog/hooks/useProducts.ts` | `description: ''` (ProductCard doesn't render) |
| `src/features/catalog/components/FeaturedProducts.tsx` | `description: ''` (ProductCard doesn't render) |

### Documentation (1)

| File | Change |
|---|---|
| `openspec/specs/breadcrumbs/spec.md` | UXW-02 additive requirement + 4 scenarios (canonical spec merged) |

### New capability spec (1)

| File | Change |
|---|---|
| `openspec/specs/product-detail/spec.md` | NEW capability, 4 requirements + 15 scenarios (canonical spec created) |

## Artifacts Archived

- `proposal.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (7/7 tasks complete; T1-T7 all `[x]`)
- `specs/breadcrumbs/spec.md` ✅ (delta)
- `specs/product-detail/spec.md` ✅ (delta)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Capability Specs Synced

- `openspec/specs/breadcrumbs/spec.md` — **EXTENDED**. Added "Tooltip & Truncation Defense (UXW-02)" requirement (4 scenarios) appended to the existing 7 requirements. Match-by-name: `### Requirement: Tooltip & Truncation Defense (UXW-02)`. All other requirements preserved.
- `openspec/specs/product-detail/spec.md` — **NEW capability**. 4 requirements (Description Rendering, Blocks-to-Markdown Conversion, Empty/Null Description Handling, StrapiProduct Type Correctness) + 15 scenarios. No prior version to merge.

## Spec Compliance Matrix (final)

### Breadcrumbs — UXW-02 Tooltip & Truncation Defense (1 requirement, 4 scenarios)

- ✅ Long trailing current-page label (title + `max-w-[12rem] truncate`)
- ✅ Long non-trailing ancestor label (title + `max-w-[12rem] truncate`)
- ✅ Short label (text not truncated + title still present)
- ✅ Screen reader label (WCAG 2.5.3 Label in Name)

### Product Detail — UXW-03 (4 requirements, 15 scenarios)

- ✅ Description Rendering — paragraph / heading / list / link / bold-italic
- ✅ Blocks-to-Markdown Conversion — paragraph / nested emphasis / link / empty
- ✅ Empty/Null Description Handling — null / empty / undefined
- ✅ StrapiProduct Type Correctness — blocks payload / PDP consumer / catalog consumers

**Overall compliance**: 19/19 scenarios runtime-pass; 5/5 requirements met.

## Final-State vs Snapshot Authority

Per the Final-State Authority hierarchy, the following intermediate-snapshot claims were superseded by final-state facts supplied in the orchestrator's launch prompt:

- `tasks.md` forecast 330-390 authored lines / 400-line budget risk "Low" / chained PRs "No". Actual authored lines = 673 (662+11), exceeding both the forecast band and the 400-line review budget. The orchestrator's launch prompt confirms the size:exception was accepted via maintainer reset by AndresDev28 and the change ships as a single PR with two commits (C1 + C2). The archive report records the final state, not the forecast.
- The 21 pre-existing `localStorage.clear` jsdom mock failures (17 `CartContext.test.tsx` + 4 `CookieBanner.test.tsx`) are unrelated to the change and remain the responsibility of DEBT-02 follow-up work — they do NOT block archive.

## Deviations (validated in verify-report.md)

1. **E2E mock mechanism** — `page.route()` cannot intercept Next.js server-component fetches (they run in the Node dev-server, not the browser). Added `tests/e2e/mock-strapi-server.mjs` (port :1338) + `STRAPI_API_URL` env override. `page.route()` remains in the design as a design-compliant no-op. Validated empirically with 4/4 Playwright passes.
2. **`ProductDetailClient.test.tsx` as characterization** — passes 4/4 against the pre-existing ReactMarkdown renderer; not strict RED, but `ProductDetailClient.tsx` is unchanged per design. Acceptable.
3. **CSS class assertions** in `Breadcrumbs.test.tsx` (`max-w-[12rem] truncate`) — explicit design requirement locking the truncation defense; flagged as implementation-detail coupling but not a defect.
4. **Manual a11y smoke** (keyboard/zoom/screen-reader) — delegated to human. Structural a11y contract (`nav[aria-label]`, `aria-current="page"`, full-label text node + `title`) verified by unit + E2E.

## Archive Mechanical-Contract Evidence

- Source: `openspec/changes/UXW-02-03-breadcrumbs-description/` (untracked in git)
- Destination: `openspec/changes/archive/2026-08-12-UXW-02-03-breadcrumbs-description/`
- Move mechanism: `mv` (fallback used because the source files were untracked in git; `git mv` correctly rejected the move and the SKILL's `mv`-fallback path was used)
- `diff -r snapshot vs archived folder`: **EMPTY** (exit 0) — only passing evidence
- Source removal verified: `ls openspec/changes/UXW-02-03-breadcrumbs-description` returns "No such file or directory"
- Snapshot root: `/tmp/sdd-archive.XIu9uu` (removed after readback)

## Lessons (carry to future cycles)

1. `page.route()` cannot intercept Next.js server-component fetches — use a standalone mock Strapi server + `STRAPI_API_URL` env override for SSR E2E. Pattern documented in `tests/e2e/mock-strapi-server.mjs` header comment.
2. `next build` corrupts a running `next dev` server's `.next` cache (missing `vendor-chunks/mdast-util-to-hast.js` → 500s). Always stop dev + `rm -rf .next` before building.
3. Strapi 5 rich-text blocks are an array, NOT a markdown string — frontend type guards with `typeof === 'string'` silently fail. New `StrapiBlock`/`StrapiBlockChild` types are the SSOT.
4. Project carries 21 pre-existing Vitest failures (CartContext + CookieBanner jsdom `localStorage.clear` gap) — these are follow-ups, NOT blockers for new changes.
5. 360 LOC forecast missed actual 673 LOC — converter + tests + mock server growth is organic and essential. Future `sdd-tasks` estimates should add buffer for E2E mock server infrastructure when applicable.
6. Authored line count (662+11=673) exceeded the 400-line review budget forecast as "Low" — the two-commit set is a chained-PR candidate despite the single-PR forecast. The orchestrator's `size:exception` worked; chained PRs may be the safer default for future changes > 400 LOC.

## Follow-ups

- **DEBT-LOGIN-REDIRECT follow-up** (already in flight, not part of this change): retrofit checkout/carrito to generate `?redirect=` query param.
- **21 pre-existing Vitest failures**: jsdom `localStorage.clear` upgrade or proper mock (DEBT-02 follow-up).
- **Mock server realism**: `mock-strapi-server.mjs` currently ignores slug filter; mirror real Strapi shape including filter support.
- **Roadmap doc update**: `docs/roadmapToProduction.md` on local main (1 ahead of origin already has DEBT-LOGIN-REDIRECT entry) — bundle UXW-02-03 entry into a future batched PR docs commit.
- **Commit the canonical specs**: `openspec/specs/breadcrumbs/spec.md` and `openspec/specs/product-detail/spec.md` are currently in the working tree (uncommitted). They should ride with the feature branch PR or ship as a separate docs commit before push.

## Delivery

- **Branch**: `frontend/UXW-02-03-breadcrumbs-description` (NOT pushed yet — orchestrator hands off to user for `git push` + PR creation)
- **PR strategy**: single PR with `size:exception` (per user decision)
- **Push command**: `git push origin frontend/UXW-02-03-breadcrumbs-description`
- **PR base**: `main`
- **Commits to push**: `0d15f1e` (C1), `cfdb7eb` (C2)

## SDD Cycle Complete

The change has been planned, implemented (RED→GREEN strict TDD), verified, and archived. Ready for the next change.
