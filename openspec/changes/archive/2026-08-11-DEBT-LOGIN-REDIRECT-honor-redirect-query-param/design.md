# Design: Honor `?redirect=` on `/login` and `/registro`

## Technical Approach

Option B (locked): pure `sanitizeRedirect` choke point + forms read URL; `AuthContext` stays URL-agnostic. Maps to `login-redirect` spec (safe-path, open-redirect rejection, loop prevention, query/fragment preserve, login/register `redirectTo`, form consumption, URL-agnostic context). Consumption-only — no checkout/carrito generation retrofit.

```
LoginForm/RegisterForm handleSubmit
  → useSearchParams().get('redirect')
  → sanitizeRedirect(raw)          // src/lib/auth/redirect.ts
  → login|register(..., redirectTo)
  → AuthContext: router.push(sanitizeRedirect(redirectTo))
```

### `sanitizeRedirect` body

```ts
// src/lib/auth/redirect.ts
const DEFAULT_REDIRECT = '/mi-cuenta'

export function sanitizeRedirect(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.length === 0) return DEFAULT_REDIRECT
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_REDIRECT
  }
  // Reject schemes hidden after leading slash quirks and bare scheme URLs
  const lower = value.toLowerCase()
  if (
    lower.includes('://') ||
    lower.startsWith('/javascript:') ||
    lower.startsWith('/data:') ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  ) {
    return DEFAULT_REDIRECT
  }
  // First path segment only (ignore query/fragment)
  const pathOnly = value.split(/[?#]/, 2)[0] ?? value
  const segment = pathOnly.split('/').filter(Boolean)[0]?.toLowerCase()
  if (segment === 'login' || segment === 'registro') return DEFAULT_REDIRECT
  return value
}
```

### AuthContext interface diff (backward compatible)

```ts
// AuthContextType
login: (
  identifier: string,
  password: string,
  redirectTo?: string
) => Promise<void>
register: (
  username: string,
  email: string,
  password: string,
  redirectTo?: string
) => Promise<void>

// login / register success paths (both sites)
import { sanitizeRedirect } from '@/lib/auth/redirect'
// ...
setUser(data.user)
router.push(sanitizeRedirect(redirectTo)) // omitted → '/mi-cuenta'
```

### Forms — read URL inside `handleSubmit`

```ts
// LoginForm.tsx (RegisterForm mirrors with register)
import { useSearchParams } from 'next/navigation'
import { sanitizeRedirect } from '@/lib/auth/redirect'

const searchParams = useSearchParams() // hook at component top (Rules of Hooks)
// INSIDE handleSubmit only:
const redirectTo = sanitizeRedirect(searchParams.get('redirect'))
await login(identifier, password, redirectTo)
```

> Note: `useSearchParams()` must be called at component top level (Rules of Hooks). Locked “read timing” means **consume** the param inside `handleSubmit`, not at render for navigation side effects. No Suspense boundary change required for submit-time use of an already-subscribed hook.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Shape | A context reads URL / B helper+forms / C result object | **B** | Context URL-agnostic; pure unit tests; existing suite stays green |
| Scope | Consumption-only vs +checkout/carrito generate | **Consumption** | PR ≤400 LOC; generation follow-up |
| Loop prevention | Allow loops / reject `/login`+`/registro` | **Reject first segment** | Avoid auth ping-pong; default `/mi-cuenta` |
| Open-redirect | Trust callers / choke-point sanitize | **Choke point in helper + context re-sanitize** | Defense in depth if non-form callers pass raw values |
| Default | `/` vs `/mi-cuenta` | **`/mi-cuenta`** | Preserves today’s behavior when param missing |
| Register | Login only / parity | **Parity** | Same debt on both forms |

## Data Flow

```
URL ?redirect= ──→ Form handleSubmit ──→ sanitizeRedirect
                                              │
                                              ▼
                                    login|register(redirectTo?)
                                              │
                                              ▼
                              AuthContext sanitizeRedirect again
                                              │
                                              ▼
                                     router.push(safePath)
```

## File Changes

| File | Action | ~LOC | Description |
|------|--------|------|-------------|
| `src/lib/auth/redirect.ts` | Create | ~35 | `sanitizeRedirect` pure helper |
| `src/lib/auth/__tests__/redirect.test.ts` | Create | ~90 | Validation matrix TC-03/04/05 + loops/empty |
| `src/context/AuthContext.tsx` | Modify | ~15 | Optional `redirectTo`; push sanitized target |
| `src/components/forms/LoginForm.tsx` | Modify | ~8 | `useSearchParams` + pass sanitized redirect |
| `src/components/forms/RegisterForm.tsx` | Modify | ~8 | Same for `register` |
| `src/context/__tests__/AuthContext.test.tsx` | Modify | ~60 | Capture `router.push`; TC-06/07/08 |
| `tests/e2e/login-redirect.spec.ts` | Create | ~80 | TC-01/02 Playwright round-trip |

**Approx authored total:** ~296 LOC (under 400-line review budget).

## Interfaces / Contracts

- `sanitizeRedirect(value: string | null | undefined): string` — always returns internal path; never throws.
- `login(id, pw, redirectTo?)` / `register(user, email, pw, redirectTo?)` — optional third/fourth arg; omit = `/mi-cuenta`.
- No cookie/JWT changes. No new npm deps.

## Testing Strategy

| Layer | What | Approach | TC |
|-------|------|----------|----|
| Unit | `sanitizeRedirect` matrix | Vitest pure; table-driven | TC-03,04,05 + loops, empty, schemes, `//`, `/\\`, no leading `/` |
| Integration | `login`/`register` push targets | Vitest + shared `push` mock; assert `toHaveBeenCalledWith` | TC-06,07,08,09 |
| E2E | Round-trip landings | Playwright; mock auth APIs; assert final URL | TC-01,02 |

Strict TDD: RED tests before production code per work unit. Command: `npx vitest run --maxWorkers=2`.

### AuthContext test mock upgrade

```ts
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))
// After successful login('a','b','/tienda') → expect(push).toHaveBeenCalledWith('/tienda')
// After login('a','b') → expect(push).toHaveBeenCalledWith('/mi-cuenta')
// After login('a','b','//evil.com') → expect(push).toHaveBeenCalledWith('/mi-cuenta')
```

### E2E sketch (TC-01)

Mock `POST /api/auth/login` + session; `page.goto('/login?redirect=/tienda')`; fill credentials; submit; `expect(page).toHaveURL(/\/tienda/)`.

## Threat Matrix

Reference matrix (docs/git/commit/push/PR automation): **N/A** — this change does not touch shell, VCS, or PR automation.

| Boundary | Applicability | Design response | Planned RED tests |
|----------|---------------|-----------------|-------------------|
| Documentation-like paths | N/A — no file classification | — | — |
| Git repository selection | N/A | — | — |
| Commit state | N/A | — | — |
| Push state | N/A | — | — |
| PR commands | N/A | — | — |
| **Post-auth client routing (open redirect)** | **Applicable** | `sanitizeRedirect` rejects `//`, `/\\`, schemes, non-paths; context re-sanitizes | TC-03,04,07 unit/integration |
| **Auth-page loop** | **Applicable** | Reject first segment `login`/`registro` | unit cases + TC-07 |

## Work-Unit Commits

Each unit <200 LOC, suite green between commits, tests ship with behavior.

| ID | Name | Description | Verification |
|----|------|-------------|--------------|
| **C1** | `test(auth): RED sanitizeRedirect matrix` | Add failing `redirect.test.ts` covering happy path, empty/null, `//`, `/\\`, schemes, no slash, loops, query/fragment | `npx vitest run --maxWorkers=2 src/lib/auth/__tests__/redirect.test.ts` RED |
| **C2** | `feat(auth): add sanitizeRedirect helper` | Implement `src/lib/auth/redirect.ts` until C1 green | same command GREEN |
| **C3** | `test(auth): RED AuthContext redirectTo push targets` | Upgrade router mock; failing cases TC-06/07/08 (login/register honor/fallback/reject) | `npx vitest run --maxWorkers=2 src/context/__tests__/AuthContext.test.tsx` RED |
| **C4** | `feat(auth): optional redirectTo on login/register` | Interface + body use `sanitizeRedirect`; omit keeps `/mi-cuenta` | AuthContext tests GREEN; full suite worker-limited |
| **C5** | `feat(auth): LoginForm passes ?redirect=` | `useSearchParams` + sanitize in `handleSubmit` → `login` | focused form/typecheck; existing suite green |
| **C6** | `feat(auth): RegisterForm passes ?redirect=` | Parity with LoginForm → `register` | suite green |
| **C7** | `test(e2e): login redirect round-trip TC-01/02` | Playwright `tests/e2e/login-redirect.spec.ts` | `npx playwright test tests/e2e/login-redirect.spec.ts` |

**Rollback boundary per unit:** revert that commit only; prior units remain coherent.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Open-redirect bypass (`//evil`, `/\\`, encoded schemes) | Med | RED-first exhaustive matrix; dual sanitize (form + context) |
| Auth loop `/login?redirect=/login` | Low | First-segment reject → `/mi-cuenta` |
| `useSearchParams` SSR/Suspense bailout | Low | Hook at top; **consume** only in `handleSubmit`; no render-time navigation |
| Existing AuthContext suite break | Low | Optional param; no `useSearchParams` in context (TC-09) |
| E2E flakiness on auth APIs | Med | Route-mock login/session like other e2e specs; `TEST_BASE_URL` |

## Migration / Rollout

No migration required. No feature flag. Ship behind normal PR; behavior change only when `?redirect=` present and valid.

## Rollback Plan

1. Revert the feature PR (or walk back C7→C1).
2. Hardcoded `router.push('/mi-cuenta')` returns.
3. UXW-01 generation side (`useFavoriteAuthPrompt`, order detail) **unchanged** and still emits `?redirect=` (harmless again).
4. No data, cookies, or env to clean.

## Dependencies

- Runtime: `useSearchParams` from `next/navigation` (already used project-wide via App Router).
- Internal: `@/lib/auth/redirect` (new), existing `AuthContext` / forms.
- No new packages. Generation side already shipped (UXW-01).

## Open Questions

- None blocking. Locked decisions 1–9 apply as stated.
- Follow-up (out of scope): retrofit `checkout/page.tsx` and `carrito/page.tsx` to *generate* `?redirect=`.
