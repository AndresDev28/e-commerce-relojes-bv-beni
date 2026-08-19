# Tasks: Honor `?redirect=` on `/login` and `/registro`

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~296 LOC |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Not needed (single PR) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Task List

### T1 — `test(auth): RED sanitizeRedirect matrix`
- **Files:** `src/lib/auth/__tests__/redirect.test.ts`; **Acceptance:** add failing table tests for safe paths, missing values, `//`, `/\\`, schemes, non-leading slash, auth loops, query and fragment preservation; RED before helper exists. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~90. **Depends:** none.

### T2 — `feat(auth): add sanitizeRedirect helper`
- **Files:** `src/lib/auth/redirect.ts`; **Acceptance:** implement pure safe-path sanitization and `/mi-cuenta` fallback; T1 becomes GREEN with all matrix assertions passing. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~35. **Depends:** T1.

### T3 — `test(auth): RED AuthContext redirectTo push targets`
- **Files:** `src/context/__tests__/AuthContext.test.tsx`; **Acceptance:** upgrade router mock and add failing TC-06/07/08 assertions for valid, missing, invalid, and register targets; RED before context change. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~60. **Depends:** T2.

### T4 — `feat(auth): optional redirectTo on login/register`
- **Files:** `src/context/AuthContext.tsx`; **Acceptance:** add optional parameters and defense-in-depth sanitization; T3 and existing TC-09 tests GREEN, default remains `/mi-cuenta`. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~15. **Depends:** T3.

### T5 — `feat(auth): LoginForm passes ?redirect=`
- **Files:** `src/components/forms/LoginForm.tsx`; **Acceptance:** read `redirect` with `useSearchParams` in submit flow, sanitize it, and pass `redirectTo` to `login`; Vitest suite GREEN. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~8. **Depends:** T4.

### T6 — `feat(auth): RegisterForm passes ?redirect=`
- **Files:** `src/components/forms/RegisterForm.tsx`; **Acceptance:** mirror T5 for `register`, preserving `/mi-cuenta` fallback; Vitest suite GREEN. **Test:** `npx vitest run --maxWorkers=2` **LOC:** ~8. **Depends:** T4.

### T7 — `test(e2e): login redirect round-trip TC-01/02`
- **Files:** `tests/e2e/login-redirect.spec.ts`; **Acceptance:** add RED-then-GREEN Playwright coverage for `/login?redirect=/tienda` and `/tienda/{slug}` final URLs; full Vitest command remains required. **Test:** `npx vitest run --maxWorkers=2` **Runtime:** `npx playwright test tests/e2e/login-redirect.spec.ts`. **LOC:** ~80. **Depends:** T5, T6.

## Work Graph

`T1 → T2 → T3 → T4 → (T5 ∥ T6) → T7`

## Test Plan per Task

- **RED:** T1 validation matrix, T3 AuthContext push targets, T7 TC-01/TC-02 round trips.
- **GREEN:** T2 helper, T4 context, T5 login form, and T6 register form; run `npx vitest run --maxWorkers=2` after each.

## Pre-Apply Checklist

- [x] Confirm branch `frontend/DEBT-LOGIN-REDIRECT-honor-redirect-query-param` and clean baseline.
- [x] Acquire runtime ledger per unit: `gentle-ai sdd-attempt acquire --cwd <repo> --change <change> --work-unit <label> --evidence-goal <goal> --max-attempts <count> --max-changed-lines <count>`.
- [x] Apply and commit C1→C7 in order; record focused test and runtime results.
- [x] Roll back any unit by reverting only its commit; preserve earlier coherent units.

## Out of Scope

- Retrofitting `checkout/page.tsx` or `carrito/page.tsx` to generate `?redirect=`.
- Cookie, JWT, checkout, or carrito behavior changes.
