# Proposal: Honor ?redirect= Query Param on /login and /registro

## Intent

UXW-01 generates `/login?redirect=<path>` (favorites auth prompt, order-detail guard), but `AuthContext.login()`/`register()` hardcode `router.push('/mi-cuenta')`, silently dropping the param. Users land on `/mi-cuenta` instead of where they came from (UXW-01 TC-12 known debt).

## Scope

### In Scope
- `sanitizeRedirect()` helper: internal paths only, default `/mi-cuenta`, rejects open-redirect and auth-page loops
- `login()`/`register()` accept optional `redirectTo`
- LoginForm + RegisterForm read `?redirect=` in `handleSubmit` and pass it
- Unit tests (validation matrix + push-target assertions) and E2E round-trip

### Out of Scope
- Retrofitting `checkout/page.tsx:50`, `carrito/page.tsx:28` to *generate* `?redirect=` (follow-up)
- Session cookie/JWT behavior

## Capabilities

### New Capabilities
- `login-redirect`: post-auth navigation policy — `?redirect=` consumption, sanitization, default fallback, loop prevention

### Modified Capabilities
- None

## Approach

| | A: Inline in AuthContext | B: Helper + forms read URL | C: Result-object helper |
|---|---|---|---|
| Shape | Context calls `useSearchParams()` | `src/lib/auth/redirect.ts`; forms pass `redirectTo` | Helper returns `{ok, path}` |
| Pros | Smallest diff | Context stays URL-agnostic; single sanitization choke point; pure unit tests | Type-safe invalid branch |
| Cons | URL coupling in context; `useSearchParams` mock churn | 3 files touched | Overkill for one param |
| Code+tests | ~15 + ~80 LOC | ~45–55 + ~150 LOC | ~60 + ~170 LOC |

**Recommended: B** — AuthContext stays URL-agnostic (existing 213-LOC suite stays green), one choke point for open-redirect defense, mirrors UXW-01's generation-side pattern.

Key decisions: (1) consumption-only — keeps PR under 400 lines; (2) reject `/login` and `/registro` prefixes (loop prevention); (3) read param in `handleSubmit` — no Suspense boundary needed (Next.js 15); (4) new `login-redirect` spec — navigation ≠ cookie plumbing; (5) register parity — both forms in this PR.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/auth/redirect.ts` | New | `sanitizeRedirect()` helper |
| `src/lib/auth/__tests__/redirect.test.ts` | New | Validation matrix |
| `src/context/AuthContext.tsx` | Modified | Optional `redirectTo` on login/register |
| `src/components/forms/{LoginForm,RegisterForm}.tsx` | Modified | Read + pass param |
| `src/context/__tests__/AuthContext.test.tsx` | Modified | Assert push targets |
| `tests/e2e/login-redirect.spec.ts` | New | TC-01/TC-02 round-trip |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Open-redirect bypass (`//evil.com`, `/\x`) | Med | RED-first exhaustive helper matrix |
| Auth-page redirect loop | Low | Prefix rejection → default |
| SSR `useSearchParams` bailout | Low | Read in `handleSubmit`, not render |

## Rollback Plan

Revert the single PR → hardcoded `/mi-cuenta` behavior returns. No data or config state; UXW-01 generation side unaffected.

## Dependencies

None — generation side already shipped in UXW-01.

## Success Criteria

- [ ] `?redirect=/tienda` (and detail pages) → lands there after login (TC-01/02)
- [ ] Missing/invalid param → `/mi-cuenta` (TC-06/07); `//evil.com`, `http://evil.com` rejected (TC-03/04); query strings allowed (TC-05)
- [ ] `/registro` parity (TC-08); cart/checkout/mi-cuenta regressions green (TC-09)
- [ ] `npx vitest run --maxWorkers=2` green; PR ≤ 400 changed lines

## Proposal question round

Assumptions needing user confirmation, correction, or a second round:

1. Confirm Option B and consumption-only scope (checkout/carrito generation retrofit as follow-up)?
2. Beyond `/login` and `/registro`, should any internal paths be excluded as redirect targets (e.g. `/api/*`)?
3. Confirm a new `login-redirect` spec rather than extending `session-management`?
