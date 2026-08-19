# Exploration: DEBT-LOGIN-REDIRECT — Honor ?redirect= query param on /login

> **SDD Phase:** Explore (1/6) — read-only investigation.
> **Change slug:** `DEBT-LOGIN-REDIRECT-honor-redirect-query-param`
> **Branch:** `frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param`
> **Topic key:** `sdd/DEBT-LOGIN-REDIRECT-honor-redirect-query-param/explore`
> **Date:** 2026-08-11
> **Source debt:** UXW-01 TC-12 (`.github/qa/UXW-01-favorites-silent-fail.md`)

## Current State

The `/login` (and `/registro`) pages accept a `?redirect=` query param today but **silently drop it**. After successful authentication, `AuthContext` hardcodes `router.push('/mi-cuenta')` regardless of the param. UXW-01 introduced the *generation* side (`router.push('/login?redirect=' + encodeURIComponent(pathname))` in `useFavoriteAuthPrompt.ts:42` and `mi-cuenta/pedidos/[orderId]/page.tsx:28`) but never wired the *consumption* side. The resulting broken round-trip was documented in UXW-01's archive as known debt and out of scope; this change closes it.

### Exact bug sites

```tsx
// src/context/AuthContext.tsx
// Line 87 — login() — the canonical bug site
const data = await response.json()
setUser(data.user)
router.push('/mi-cuenta')   // ← hardcoded; ignores ?redirect=

// Line 120 — register() — same bug
const data = await response.json()
setUser(data.user)
router.push('/mi-cuenta')   // ← same hardcoded push
```

Neither `LoginForm.tsx` nor `RegisterForm.tsx` touches the URL. They are pure presentational components that delegate navigation to `AuthContext`. So the fix must land in `AuthContext` (or a helper it calls).

### Path mismatch — prompt vs. reality

The prompt predicted `src/app/(auth)/login/LoginForm.tsx`, but that file does NOT exist. The actual locations:

| What | Predicted (prompt) | Actual |
|------|--------------------|--------|
| LoginForm | `src/app/(auth)/login/LoginForm.tsx` | `src/components/forms/LoginForm.tsx` |
| RegisterForm | `src/app/(auth)/register/...` | `src/components/forms/RegisterForm.tsx` (and the page is `/registro`, not `/register`) |
| Redirect helper | `src/lib/auth/redirect.ts` (new) | **Does not exist** — confirmed via `grep -E "getRedirect\|safeRedirect\|sanitizeRedirect\|isInternalPath\|isSafeRedirect"` returning no matches |
| AuthContext | `src/context/AuthContext.tsx` | ✅ confirmed |
| `useFavoriteAuthPrompt` | `src/features/favorites/hooks/useFavoriteAuthPrompt.ts` | ✅ confirmed |

### Existing redirect-generation sites (already working)

- `src/features/favorites/hooks/useFavoriteAuthPrompt.ts:42` — `router.push('/login?redirect=' + encodeURIComponent(pathname))` (covered by tests at `:95-117` and `:119-144`)
- `src/app/mi-cuenta/pedidos/[orderId]/page.tsx:28` — `router.push(`/login?redirect=/mi-cuenta/pedidos/${orderId}`)` (covered by tests at `:80-95`)

### Other places that redirect to `/login` *without* `?redirect=` (potential scope expansion)

- `src/app/checkout/page.tsx:50` — `router.push('/login')` (route guard for unauthenticated checkout)
- `src/app/carrito/page.tsx:28` — `router.push('/login')` (route guard for unauthenticated cart)

These would benefit from the same plumbing once the consumption side exists, but they don't *break* this fix — flagged for the proposal phase.

### Test coverage today

| Test file | Covers | Notes |
|-----------|--------|-------|
| `src/context/__tests__/AuthContext.test.tsx` (213 LOC) | Hydration, login success/validation/401, register, logout, throw-outside-provider | Does **not** assert `router.push` targets. Mocks `useRouter` to `vi.fn()` (no inspection of `push` calls). |
| `src/features/favorites/hooks/__tests__/useFavoriteAuthPrompt.test.ts` (241 LOC) | Prompt show/clear + `goToLogin()` push (`/login?redirect=...`) | Generation side is green; consumption side is the gap. |
| `src/app/mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx` | Route guard for orders detail | Asserts `router.push` call shape (`:90`); will continue to pass but now finally *function* end-to-end. |
| `tests/e2e/favorites-auth-prompt-a11y.spec.ts` (UXW-01 TC-07) | aria-live region a11y on the heart prompt | Establishes the E2E pattern (TEST_BASE_URL, route mocking). |
| **NO** `LoginForm.test.tsx` | — | Not present. |
| **NO** `RegisterForm.test.tsx` | — | Not present. |
| **NO** redirect-validation helper tests | — | Will be new. |

### UXW-01 archive — explicit references to this debt

- `openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/proposal.md:19`:
  > "Making `/login` honor `?redirect=` (existing debt — `LoginForm` always pushes `/mi-cuenta`; separate ticket)."
- `openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/design.md:13` (D3):
  > "**Login does not honor `?redirect=`** (existing debt — out of scope)."
- `openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/exploration.md:85-91`:
  > "the `/login` page itself does not currently consume the `redirect` query parameter — `LoginForm` always pushes to `/mi-cuenta`. So L1's redirect-with-redirect-query may also need a small follow-up on `LoginForm` to honor `?redirect=` (a known existing partial debt, **out of scope for UXW-01 but worth flagging**)."
- `openspec/changes/archive/2026-08-09-uxw-01-favoritos-silent-fail/verify-report.md:111`:
  > "`useFavoriteAuthPrompt.ts` uses `usePathname()` + `router.push('/login?redirect='+encodeURIComponent(pathname))`. **Now also re-exported from barrel.** Unchanged logic."
- `.github/qa/UXW-01-favorites-silent-fail.md:194-201` (TC-12):
  > "**KNOWN ISSUE**: the project has pre-existing debt where `/login` does NOT honor the `?redirect=` query parameter — the `LoginForm` always pushes to `/mi-cuenta` after successful authentication. This is OUT OF SCOPE for UXW-01 ... **If TC-12 fails with 'lands on /mi-cuenta instead of /tienda', that's EXPECTED**, not a regression. Mark this as PASS with the note 'known debt'."

## Affected Areas

- `src/context/AuthContext.tsx` — **primary fix site** (`login()` line 87, `register()` line 120). The `AuthContextType` interface (L22-25) MAY grow an optional `redirectTo` param OR the context may read `useSearchParams()` itself.
- `src/components/forms/LoginForm.tsx` — may need to pass `redirectTo` (if interface grows) or stay unchanged (if `AuthContext` reads the URL itself).
- `src/components/forms/RegisterForm.tsx` — same.
- `src/lib/auth/redirect.ts` — **new**; pure path-validation helper (sanitize + default + open-redirect protection). Per the prompt's prediction, lives here.
- `src/lib/auth/__tests__/redirect.test.ts` — **new**; Vitest unit tests for validation matrix.
- `src/context/__tests__/AuthContext.test.tsx` — extend to cover: `login()` honors `?redirect=`, default fallback, open-redirect rejection, register parity.
- `tests/e2e/login-redirect.spec.ts` — **new**; Playwright E2E covering TC-01, TC-02 (round-trip from `/tienda` and `/tienda/{slug}`).
- `openspec/specs/login-redirect/spec.md` (or `openspec/changes/DEBT-LOGIN-REDIRECT-honor-redirect-query-param/specs/login-redirect/spec.md`) — new delta spec; no current spec for auth-redirect handling exists (verified: `session-management` covers cookie/JWT only, not post-auth navigation).

## Approaches

### Option A — Minimal: read `useSearchParams()` inside `AuthContext`

```tsx
// AuthContext.tsx — inside login()
const searchParams = useSearchParams()
const target = sanitizeRedirect(searchParams.get('redirect')) ?? '/mi-cuenta'
router.push(target)
```

- **Pros:** Smallest diff. Single touch point. No new param plumbed through `LoginForm`/`RegisterForm`.
- **Cons:** `AuthContext` becomes URL-aware (new coupling). Testing `useSearchParams` in Vitest requires `next/navigation` mock additions. Reader of the context loses signal about navigation because the redirect lives in the call.
- **Effort:** Low. ~15 LOC + ~80 LOC tests.

### Option B — Helper utility + explicit `redirectTo` parameter

```ts
// src/lib/auth/redirect.ts (new)
export function sanitizeRedirect(raw: string | null | undefined, fallback = '/mi-cuenta'): string {
  if (!raw) return fallback
  if (typeof raw !== 'string') return fallback
  // Must start with single '/', must NOT start with '//' or '/\\' (open-redirect)
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // Optional: reject protocol-relative edge cases, control chars, etc.
  return raw
}
```

```tsx
// AuthContextType extends:
// login: (identifier, password, redirectTo?: string) => Promise<void>
// register: (username, email, password, redirectTo?: string) => Promise<void>
```

```tsx
// LoginForm.tsx — reads URL once at mount, passes to login
const searchParams = useSearchParams()
const redirectTo = sanitizeRedirect(searchParams.get('redirect'))
await login(identifier, password, redirectTo)
```

- **Pros:** Pure helper is trivially unit-testable. `AuthContext` stays URL-agnostic (testable with no `useSearchParams` mock). Forms own the URL-to-redirect resolution (separation of concerns). Easy to extend later (analytics, logging).
- **Cons:** Larger touch surface (3 files: helper + 2 forms). Slightly more LOC.
- **Effort:** Low–Medium. ~45-55 LOC + ~150 LOC tests.

### Option C — URL-validated config object (overkill for this scope)

Pass `{ redirectTo?: string }` shape via context so callers declare intent explicitly.

- **Pros:** Future-proof if redirect semantics grow (analytics IDs, A/B variants).
- **Cons:** Premature abstraction for a one-param bug fix. Inflates the diff.
- **Effort:** Medium. Same LOC as B but more indirection.
- **Recommended for proposal phase: REJECT for this change.**

### Recommended: **Option B**

Reasons:

1. Matches the predicted shape in the prompt (`src/lib/auth/redirect.ts`).
2. Pure helper unit-tests cover open-redirect protection cleanly without spinning up React.
3. `AuthContext` stays URL-agnostic → existing 213 LOC of tests stay green with no `useSearchParams` mock churn.
4. Forms stay thin and own the URL-to-intent translation, mirroring how `useFavoriteAuthPrompt` already owns the *generation* side.
5. Trivial to retrofit `checkout`/`carrito` later (same helper, same call shape).

## Risks

- **Open-redirect bypass:** if `sanitizeRedirect` is naive, an attacker can craft `?redirect=//evil.com` and hijack the post-login navigation. Must reject any path starting with `//` or `/\\`. Must NOT accept full URLs (`http://evil.com`). The validation helper is the chokepoint — it MUST be exhaustively tested (RED-first).
- **Loop redirect:** if user lands on `/login?redirect=/login`, after fix they loop back to `/login?redirect=/login`. Lowest-impact mitigation: if the sanitized `redirectTo` starts with `/login` or `/registro`, fall back to default. Worth a Scenario in the delta spec.
- **SSR / `useSearchParams`:** Next.js 15 requires Suspense boundaries around `useSearchParams`. If the form is rendered above the boundary, this could trigger a CSR bailout. Mitigation: read the param inside the form's `handleSubmit` (or use a try/catch on `useSearchParams()`). Need to verify in proposal/spec phase.
- **Test isolation:** the existing `AuthContext.test.tsx` mocks `useRouter` but not `useSearchParams`. Adding the param via the interface (Option B) avoids touching that mock.
- **`checkout` and `carrito` regression:** if the proposal adds `?redirect=` plumbing to those route guards, it must not break existing `router.push('/login')` behavior for users who haven't been on a guarded route. Proposal phase to decide whether to retrofit those sites in this same change or open a follow-up.
- **Register parity:** the prompt says "should work for both /login and /register if applicable". The actual route is `/registro` (Spanish). Both `login()` and `register()` need the same fix.

## Ready for Proposal

**Yes.** All file paths are confirmed. The two bug sites in `AuthContext` (lines 87 and 120) are exact. No existing redirect helper — confirmed via grep. Test surface is mapped (existing 213 LOC of `AuthContext.test.tsx` + new redirect helper tests + new E2E). UXW-01 archive cites this debt in three places. Option B is recommended.

Open questions for the proposal phase:

1. **Where does the URL read happen?** Inside `AuthContext` (Option A) or inside the forms (Option B)? Recommendation: B (keeps context URL-agnostic).
2. **Should the fix also retrofit `checkout`/`carrito` to *generate* `?redirect=`, or is this strictly a *consumption*-only fix?** Out-of-scope risk: touching checkout might balloon the diff.
3. **Loop prevention:** reject `redirectTo` values that point at `/login` or `/registro` themselves, or just allow them and rely on the next navigation to land on `/mi-cuenta`? UX-wise, allowing the loop is annoying; rejecting is the safer default.
4. **Spec location:** new spec at `openspec/specs/login-redirect/spec.md` (clean domain split) or extend `session-management` (it already covers auth)? Recommendation: new spec — `session-management` is about cookie/JWT plumbing, not post-auth navigation policy.