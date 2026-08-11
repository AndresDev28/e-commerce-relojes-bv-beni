# SDD Prompt: DEBT-LOGIN-REDIRECT — Honor ?redirect= query param on /login

## Copy-paste para `/sdd-new`

```
/sdd-new frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param

Pre-context (from previous session):

DEBT-LOGIN-REDIRECT is a pre-existing debt discovered during UXW-01
QA (TC-12). The /login page has a LoginForm that ignores the
?redirect= query param and always pushes to /mi-cuenta after
successful authentication. This breaks the UXW-01 redirect flow:
when an anonymous user taps the heart, sees the auth prompt, clicks
"Iniciar sesión", navigates to /login?redirect=/tienda — after login
they land on /mi-cuenta instead of back on /tienda. The user is
disoriented (they wanted to favorite a watch, not check their
account).

Current bad behavior:
- Anonymous user on /tienda → taps heart → sees auth prompt
- Clicks "Iniciar sesión" → URL becomes /login?redirect=%2Ftienda
- Submits valid credentials → redirected to /mi-cuenta (not /tienda)
- The ?redirect= is silently dropped

Expected behavior:
- Same flow as above, but after login, land on the path from ?redirect=
- Sanitize: only allow internal paths (start with /, not //, no
  protocol-relative URLs to prevent open redirect)
- Default to /mi-cuenta when ?redirect= is missing or invalid
- Should work on both /login and /register if applicable

Where to look:
- src/app/(auth)/login/page.tsx — the login page wrapper
- src/app/(auth)/login/LoginForm.tsx (or similar) — the form
  component with the auth logic
- src/context/AuthContext.tsx — login() function probably does the
  router.push('/mi-cuenta'); this is where the fix likely lands
- Possibly: a redirect utility to validate/sanitize the path

Reference points:
- The fix is documented as known debt in
  openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/
  (TC-12 in .github/qa/UXW-01-favorites-silent-fail.md and the
  proposal/design's "Out of Scope" section)
- The redirect generation already exists: useFavoriteAuthPrompt.ts
  uses `router.push('/login?redirect=' + encodeURIComponent(pathname))`
- The opposite direction (creating the redirect param) works; we
  need to make the consumption side also work.

Scope and constraints:
- ~30-60 LOC change
- Single PR (no chained needed; well under 400-line budget)
- Should NOT break existing auth flow for users who don't have
  ?redirect= (still lands on /mi-cuenta as default)
- Should add a Vitest test for the redirect logic (path validation,
  default fallback, open-redirect protection)
- Should add a Playwright E2E test following the established pattern
  (TEST_BASE_URL env var, route mocking for /api/auth/session and
  /api/auth/login, header scoping for multiple logout buttons if any)

Session preferences (same as UXW-01):
- Execution mode: Interactive
- Artifact store: hybrid (OpenSpec files + Engram)
- Delivery strategy: ask-on-risk
- Review budget: 400 lines
- Strict TDD: ON (verify in engram with mem_search
  "sdd-init/e-commerce-relojes-bv-beni" before launching sdd-explore)
- Test command: npx vitest run --maxWorkers=2 (MANDATORY worker limit)

Branch convention (per AGENT.md):
frontend/{TICKET-ID}-{description-slug}, NOT the strict type/desc
format from branch-pr skill. So this change goes on:
frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param

QA process established in this project:
- After sdd-apply/sdd-verify, create a QA plan at
  .github/qa/{ticket-id}-{slug}.md using TEMPLATE.md
- P0 tests should be converted to Playwright E2E in
  tests/e2e/{slug}.spec.ts
- Use TEST_BASE_URL env var (defaults to http://localhost:3000)

Runtime ledger:
- Use gentle-ai sdd-attempt acquire/settle per the orchestrator
  Native Runtime Attempt Authority rule
- Pattern from UXW-01 works: budget exceeded → reset → re-acquire with
  larger max-changed-lines → settle (called "size:exception")

Workflow:
1. Launch sdd-explore to confirm scope and find exact files
2. Launch sdd-propose with 2-3 implementation options (minimal fix
   in AuthContext vs. redirect helper utility vs. URL-validated
   config object)
3. Present summary, get user approval
4. Launch sdd-spec (NEW spec at openspec/specs/login-redirect/spec.md
   since there's no current spec for auth redirect handling)
5. Launch sdd-design (small change, focused decisions)
6. Launch sdd-tasks (small, ~5-8 tasks)
7. Acquire runtime attempt
8. Launch sdd-apply (strict TDD: RED tests for path validation +
   default fallback + open-redirect protection; GREEN impl)
9. Launch sdd-verify
10. Settle attempt
11. Hand off to user for QA via the new QA process

This is a small fix (the technical part is trivial: read the param,
validate, redirect). The interesting part is:
- Where to put the validation logic (single source of truth)
- How to handle edge cases (open redirect prevention)
- Test coverage for the path validation

HARD GATE: SDD Session Preflight must be confirmed before launching
sdd-explore. If missing, ask the preflight prompt and STOP.
```

## Files & locations (for context-loading in next session)

| What | Where |
|------|-------|
| LoginForm component | `src/app/(auth)/login/LoginForm.tsx` (or `src/components/LoginForm.tsx`) |
| Login page wrapper | `src/app/(auth)/login/page.tsx` |
| AuthContext (login function) | `src/context/AuthContext.tsx` |
| Redirect generation (working side) | `src/features/favorites/hooks/useFavoriteAuthPrompt.ts` |
| UXW-01 QA plan with TC-12 | `.github/qa/UXW-01-favorites-silent-fail.md` |
| UXW-01 SDD archive (known debt mentioned) | `openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/` |
| Test patterns | `src/context/AuthContext.test.tsx` (if exists) |
| E2E patterns | `tests/e2e/favorites-auth-prompt-a11y.spec.ts` |

## Expected test cases for the new QA plan

```
P0:
- TC-01: Anonymous user → tap heart → "Iniciar sesión" → log in
  with valid creds → land back on /tienda (NOT /mi-cuenta)
- TC-02: Same flow with redirect=/tienda/{slug} (detail page) → land
  back on the detail page

P1:
- TC-03: Path validation rejects protocol-relative URLs (//evil.com)
- TC-04: Path validation rejects full URLs (http://evil.com)
- TC-05: Path validation accepts query strings (/tienda?category=foo)
- TC-06: No ?redirect= param → defaults to /mi-cuenta (existing behavior)

P2:
- TC-07: Invalid/malformed ?redirect= → defaults to /mi-cuenta (not an error)
- TC-08: Same flow works for /register if applicable (consistency)
- TC-09: Regression: cart, checkout, mi-cuenta flows still work
```

## Files I'll create when this runs

```
openspec/changes/login-redirect-honor-query-param/
├── proposal.md
├── spec/         # or openspec/specs/login-redirect/spec.md (NEW)
├── design.md
└── tasks.md

src/context/AuthContext.tsx                       # MODIFIED (login() reads ?redirect=)
src/app/(auth)/login/LoginForm.tsx               # MODIFIED (read URL param)
src/lib/auth/redirect.ts                          # NEW (path validation helper)
src/lib/auth/__tests__/redirect.test.ts           # NEW (validation unit tests)
src/context/__tests__/AuthContext.test.tsx        # MODIFIED (add redirect cases)

tests/e2e/login-redirect.spec.ts                  # NEW (Playwright E2E for TC-01, TC-02)

.github/qa/DEBT-LOGIN-REDIRECT-honor-redirect-query-param.md  # NEW (QA plan)
```

## Post-mortem: Suspense boundary requirement (hotfix C8, 2026-08-11)

After the initial PR was opened, CI build failed with:
```
useSearchParams() should be wrapped in a suspense boundary at page "/registro"
```

**Root cause**: `useSearchParams()` in `LoginForm.tsx` and `RegisterForm.tsx`
bails out static prerendering in Next.js 15 App Router, regardless of WHEN
you consume the value (even inside `handleSubmit`).

**Wrong assumption that was made in design.md**:
> "No Suspense boundary change required for submit-time use of an already-subscribed hook."

This is **incorrect**. The rule is: any `useSearchParams()` in the client tree
causes CSR bailout. The bailout is at the hook call, not at value consumption.

**Fix**: wrap each form in `<Suspense fallback={...}>` in the page wrapper.
Both pages remain statically prerendered. Only the form slot is dynamic
at runtime. This is the canonical Next.js 15 pattern.

```tsx
// src/app/(auth)/login/page.tsx (and same for /registro)
import { Suspense } from 'react'
// ...
<Suspense fallback={<div className="py-8 text-center">Cargando…</div>}>
  <LoginForm />
</Suspense>
```

**Lesson for future cycles**:
1. Whenever you add `useSearchParams()` (or `usePathname()` with route-dependent
   logic) to a client component rendered inside a static page, add a `<Suspense>`
   boundary in the page wrapper.
2. ALWAYS run `npx next build` before pushing — design-time verification is
   not enough. Static prerendering fails only at build time.
3. The "obvious" fix of adding `'use client'` to the page wrapper or
   `export const dynamic = 'force-dynamic'` is WRONG — those are workarounds
   that miss the actual cause. `'use client'` doesn't help because the bailout
   comes from the server tree; `force-dynamic` is a hammer that kills static
   generation of the entire page.

**Hotfix commit**: `4bcb690` on branch `frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param`.
