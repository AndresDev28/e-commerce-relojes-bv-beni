# Archive Report: security-hardening-critical-fixes

## Change

- **Name**: `security-hardening-critical-fixes`
- **Status**: ARCHIVED (manual archive; native bind-sdd was blocked by post-apply scope-drift after main advanced)
- **Merged via**: PRs #57 (PR2), #58 (PR3a+PR3b), #91 (PR4a), #93 (Trivy fix), #95 (PR4b rescue)
- **Archived on**: 2026-08-04
- **Roadmap context**: continuation of `fix-security-baseline` / `fix-security-baseline-b` (DEBT-10, DEBT-10b); resolved remaining cross-cutting security concerns flagged in earlier sessions

## Summary

Frontend security hardening change: JWT moved from `localStorage` to httpOnly `SESSION_COOKIE`; `requireUser` gate added to API routes; `X-Trace-Id` propagation end-to-end; console-leak cleanup; CSP hardening; CSP-route trace propagation; legacy JWT orders API removed; favorites route + services covered with unit tests. 29/29 tasks completed across 4 chained PRs (PR1 tracing/CSP, PR2 route-authz, PR3a session infra, PR3b consumer migration, PR4a refactor, PR4b coverage). Final main HEAD: `69c3cb0` (PR #95 merge).

## Phases

| Phase | Artifact | Engram ID / PR |
|---|---|---|
| Explore | `exploration.md` (from PR-3b session, kept in `review-ledger.md`) | Engram #405 |
| Propose | `proposal.md` | Engram proposal |
| Spec | `specs/catalog-load-more/spec.md` (delta) + canonical `specs/session-management/spec.md`, `specs/secure-route-authorization/spec.md`, `specs/api-traceability/spec.md` | created during PR1/PR3 |
| Design | `design.md` | 5 architecture decisions |
| Tasks | `tasks.md` | 29/29 |
| Apply | PR #57 + PR #58 + PR #91 + PR #95 | merged to main |
| Verify | `verify-report.md` | rewritten with `gentle-ai.verify-result/v1` envelope; verdict `pass_with_warnings` |
| Archive | `archive-report.md` | this file |

## Capabilities synced to canonical

- `session-management` — already canonical at `openspec/specs/session-management/spec.md`
- `secure-route-authorization` — already canonical at `openspec/specs/secure-route-authorization/spec.md`
- `api-traceability` — already canonical at `openspec/specs/api-traceability/spec.md`
- `catalog-load-more` — delta in `openspec/changes/archive/2026-08-04-security-hardening-critical-fixes/specs/catalog-load-more/spec.md`; canonical already exists at `openspec/specs/catalog-load-more/spec.md` (synced earlier)

Drift between delta and canonical `catalog-load-more` is intentional:
- The delta fixed the URL-sync bug introduced by double-fetch in `getProducts`.
- The canonical `catalog-load-more` (synced in earlier `fix-catalog-duplicate-keys` change) covers pagination state.

No semantic regression: the delta adds `REQ-LCF-URL-SYNC` to lock the single-fetch URL state; the canonical already has `REQ-LCF-1` / `REQ-LCF-2` / `REQ-LCF-3` / `REQ-LCF-4`.

## Verification summary (from `verify-report.md`)

- **Verdict**: `pass_with_warnings`
- **Blockers**: 0
- **Critical findings**: 0
- **Requirements**: 12/12
- **Scenarios**: 28/28
- **Tests**: 132 passing change-scoped (out of 832 unit total; 21 pre-existing localStorage/jsdom failures in `CartContext`/`CookieBanner` — out of scope, W1)
- **tsc**: exit 0
- **npm audit**: 0 vulnerabilities (post-#93 overrides)
- **Trivy**: green (post-#93 CVE remediation)

### Warnings carried forward

- **W1**: 21 pre-existing `localStorage.clear is not a function` failures in jsdom (out of scope).
- **W2**: `api-traceability` spec scenarios (Trace Id in Route Handlers / Trace Id on Errors) without owning tasks in any phase. Functionally covered; not formally tasked.
- **W3**: orphan `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx` — excluded from `unit` project (per task 3.7) but not picked up by `integration` project (which only reads `test/integration/**`).

### Findings from 4R review (lineage `review-bf31a670866c326b`)

| ID | Lens | Location | Severity | Status |
|---|---|---|---|---|
| R3-no-op-type-pin | reliability | `src/lib/api/__tests__/orders.public-api.test.ts:25` | WARNING | info |
| R4-requireuser-502-gap | resilience | `src/app/api/favorites/__tests__/route.test.ts:35` | WARNING | info |
| R3-too-many-branch-uncovered | reliability | `src/app/api/favorites/__tests__/route.test.ts:148` | WARNING | info |
| R3-requireuser-502-end2end | reliability | `src/app/api/favorites/__tests__/route.test.ts:35` | WARNING | info |
| R4-happy-path-bundle | resilience | `src/features/favorites/services/__tests__/getFavoritesService.test.ts:116` | SUGGESTION | info |
| R4-write-json-asymmetry | resilience | `src/features/favorites/services/__tests__/updateFavoritesService.test.ts:58` | SUGGESTION | info |
| R2-no-op-test-name | readability | `src/lib/api/__tests__/orders.public-api.test.ts:25` | SUGGESTION | info |
| R2-duplicated-502-shape | readability | `src/features/favorites/services/__tests__/getFavoritesService.test.ts:53` | SUGGESTION | info |

All findings are non-blocking; three of the four WARNINGs are pre-existing follow-ups already noted in verify-report.md as deferred nice-to-haves.

## Final state

- **Branch**: `frontend/security-hardening-critical-fixes-pr-4a-remove-legacy-jwt-orders` (merged via PR #91); `frontend/security-hardening-critical-fixes-pr-4b-favorites-coverage` (merged via PR #95 — original PR #92 raced with rebase and merged against the PR4a branch, content recovered into PR #95)
- **Main HEAD**: `69c3cb0c56ad0163e7bfb571fd2c9ea593f32918` ("test(favorites): cover cookie-based /api/favorites and services (PR4b rescue) (#95)")
- **PR chain**:
  1. PR #93 (Trivy fix) → `b61e7e6`
  2. PR #91 (PR4a) → `6855911`
  3. PR #94 (release-please 1.4.1) → `dca7bb8`
  4. PR #95 (PR4b rescue) → `69c3cb0`
- **Earlier merged work** (not in this diff but enforced by these specs):
  - PR1 (tracing/CSP) — commits `dd33131`, `160e3cb` on main.
  - PR2 (route-authz) — PR #57 merge `3f21214` on main.
  - PR3a + PR3b (cookie migration) — PR #58 merge `834aab1` on main.
- **Net diff vs pre-change main**: removes 3 legacy test files (`orders.test.ts`, `test-helpers.ts`, `orders.integration.test.ts`), adds 4 new test files (`orders.public-api.test.ts`, `favorites route.test.ts`, `getFavoritesService.test.ts`, `updateFavoritesService.test.ts`), reduces `src/lib/api/orders.ts` to type-only, adds `socket.io-parser`/`fast-uri`/`brace-expansion` overrides in `package.json` for CVE remediation.

## Sync status

No-op for canonical spec files; all canonical specs were already created and synced during PR1/PR3 implementation. The `catalog-load-more` delta lives in `openspec/changes/archive/2026-08-04-security-hardening-critical-fixes/specs/catalog-load-more/spec.md`; the canonical already incorporates the URL-sync fix.

## Lessons / Discoveries

- **`gentle-ai sdd-attempt` ledger is single-active per change.** Multiple concurrent work units on the same change require explicit `reset` between phases. The `complete` state is sticky until reset. Documented for next session.
- **`bind-sdd` requires the review's frozen `base_tree` to match HEAD~1 at bind time.** If main advances between `review start` and `bind-sdd`, the operation fails with `compact post-apply gate is not allow`. Documented for the roadmap (DEBT-12 candidate: tighten bind-sdd gate to support scope-drift recovery).
- **PR race conditions with rebase.** PR #92 was merged into the PR4a base branch instead of `main` because GitHub Actions resolved the base before the rebase landed. Mitigation: when rebasing a chained PR series, ensure the upstream PR merges BEFORE the downstream PR is opened, or use `--force-with-lease` carefully. Documented for the chain strategy skill.
- **Trivy cache is sticky per runner.** A re-run after PR #93 merged still reported stale lockfile versions because Trivy read `node_modules` cached from the previous run. Mitigation: include an `npm ci` step in the Trivy job, or accept that lockfile changes require a fresh commit. The Trivy job in `.github/workflows/security.yml` does NOT cache `node_modules`, so the second run was reading stale local cache. Recommended follow-up: add `cache: false` or explicit `npm ci` step.
- **Verify envelope format is strict.** The PR1-era `verify-report.md` (PASS WITH WARNINGS) did not satisfy `gentle-ai.verify-result/v1` and was rejected by the dispatcher. The new envelope requires a fenced YAML block at the top with explicit `schema`, `verdict`, `evidence_revision`, `test_exit_code`, etc. Documented for future verify phases.
- **Reuse `feature-branch-chain` across multi-week changes.** PRs #57 → #58 → PR4a → PR4b took ~6 weeks from proposal to archive. The chain strategy preserved reviewability per slice and made Trivy remediation (PR #93) independent of the security work itself. Recommended pattern for future multi-PR hardening changes.