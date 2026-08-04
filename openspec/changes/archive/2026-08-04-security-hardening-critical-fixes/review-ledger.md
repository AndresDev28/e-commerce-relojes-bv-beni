# R2 Readability Review — PR 3b-extension (security-hardening-critical-fixes)

**Reviewer**: R2 Readability (single sweep, N=1)
**Diff**: `2136c0e..HEAD` — 22 files, +960/-1252, 11 commits
**Branch**: `frontend/security-hardening-critical-fixes-pr-3b-consumers`
**Date**: 2026-07-10

## Gate: PASS

The PR is well-structured overall. New code follows the screaming architecture pattern (`features/<domain>/{components,hooks,services}`). Hooks, services, and components are properly separated. TypeScript interfaces are explicit on every public surface. Barrel exports only expose the public API. No circular imports between features. Commit hygiene is mostly good (1–2 files per commit, except the larger refactor commit `ebf5258` which is acceptable).

Findings below are non-blocking; they document real defects against the project's AGENT.md rule and a code-quality improvement that the next iteration should consider.

## Findings Ledger

| id | lens | location | severity | status | evidence |
|----|------|----------|----------|--------|----------|
| R2-001 | readability | `src/features/orders/components/OrderHistory.tsx:1-13, 30-40, 47-50, 59-62, 71-75, 95-101, 110, 117, 120, 129, 134` | WARNING | info | Component carries 30+ lines of JSDoc/learning comments (top-block “RESPONSABILIDADES”, per-state `/** ESTADO X */`, per-button `{}` inline narration). AGENT.md states **"DO NOT ADD ANY COMMENTS unless asked"**. The PR rewrote OrderHistory from 245 → 146 lines, kept all pre-existing narration, and added none — so the comments survived a major refactor that was the natural moment to clean them. Self-evident code (`if (orders.length === 0)`, disabled buttons) gets a 5-line JSDoc block above it. User-impact: documentation-heavy code buries intent and slows future readers. Defensible defensive: pre-existing comments. Action: strip comments in this same PR (or open a one-line follow-up). |
| R2-002 | readability | `src/app/mi-cuenta/pedidos/[orderId]/page.tsx:21-30` | WARNING | info | `const forbiddenDetected = error === 'No tienes permiso para ver este pedido.'` and `error === 'Pedido no encontrado.'`. **Page routing couples to the hook's exact error string**. If `useOrderById` ever rephrases its message (or gets translated), page-state silently misroutes (no TS error). The fix is a discriminated return on the hook — `{ kind: 'forbidden' \| 'not-found' \| 'other-error' \| null }` — instead of `string \| null`. Also: letting `pageState` be derived by `let` outside `useEffect` instead of `useMemo` is fine but signals the hook should carry the state. Defect class: hidden coupling. User-impact: silent regressions on i18n/copy edits. |
| R2-003 | readability | `src/features/orders/hooks/useOrderById.ts:32-39`; `src/features/orders/hooks/useOrderHistory.ts:34-41`; `src/features/favorites/hooks/useFavorites.ts:25-32, 55-62`; `src/features/orders/services/requestCancellation.ts:13-21` | SUGGESTION | info | Same fetch boilerplate duplicated in 5 places: `fetch('/api/...', { method, headers: { 'Content-Type': 'application/json', 'X-Trace-Id': newTraceId() }, credentials: 'same-origin' })`. Extract a `fetchWithTraceId(url, init)` helper in `src/lib/http/` to centralize trace-id + credentials + error mapping. Saves repetition and makes the next cross-cutting concern (timeout, retry, telemetry) cheap. Defect class: duplicated logic across modules. |
| R2-004 | readability | `src/features/checkout/hooks/useCreateOrder.ts:39-44` | SUGGESTION | info | Subtotal/shipping/total calculation duplicates `useCheckoutTotals` logic. `useCheckoutTotals` (new in this same PR) defines subtotal = `cartItems.reduce(...)` + `calculateShipping(subtotal)` + total = subtotal + shipping. `useCreateOrder.doCreateOrder` repeats it inline so the async handler can reuse the math. Extract a pure `calculateTotals(cartItems): { subtotal, shipping, total }` in `src/features/checkout/services/` and have `useCheckoutTotals` AND `useCreateOrder` call it. Defect class: duplicated logic. Minor. |
| R2-005 | readability | `src/app/api/orders/__tests__/route.test.ts:659` | SUGGESTION | info | Diff ends with `\ No newline at end of file` (POSIX hygiene). Trivial fix. |
| R2-006 | readability | `src/features/orders/components/__tests__/CancelOrderModal.test.tsx:93, 125, 147`; `src/features/orders/components/__tests__/RequestCancellation.integration.test.tsx:93` | SUGGESTION | info | Repeated `(global.fetch as any).mockResolvedValueOnce(...)` pattern in test files. Acceptable as a Vitest workaround but could be `vi.mocked(global.fetch).mockResolvedValueOnce(...) as unknown as Response`. Low priority — these are tests, not source. |

## Per-Question Verdicts

### 1. Screaming Architecture — PASS
- New code lives at `src/features/{checkout,favorites,orders}/{components,hooks,services}/` exactly.
- `src/app/api/favorites/route.ts` is a thin delivery layer (auth → service → JSON). 82 lines, no business logic.
- Pages (`src/app/checkout/page.tsx`, `src/app/mi-cuenta/pedidos/[orderId]/page.tsx`) are thin delivery: they compose hooks and components; no business math (useCreateOrder owns the fetch + state).
- No circular imports between features (`grep` for cross-feature imports = 0 hits).

### 2. Naming — PASS
- Hooks: `useCheckoutTotals`, `useCreateOrder`, `useFavoritesApi`, `useOrderById`, `useOrderHistory` — convention respected.
- Services: `getFavoritesService`, `updateFavoritesService`, `assembleOrderData`, `requestOrderCancellation` — coherent.
- Two `useFavorites`-ish names are intentional and clearly distinguished: `useFavoritesApi` (low-level fetch hook) vs `useFavorites` (context consumer). Good.
- File names kebab-case for utilities, PascalCase for components — consistent.

### 3. Complexity — PASS
- All files ≤ 146 lines. Largest is `OrderHistory.tsx` (146) — almost entirely JSX with one tiny effect.
- `useCreateOrder.ts` (104 lines) — borderline for a single hook but readable.
- No nested logic > 3 levels.
- No clever patterns (no `Object.assign(Promise, ...)`, no `Proxy`, no `eval`). The `Object.assign(Promise.resolve(value), { status: 'fulfilled', value })` in `app/mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx:55-60` is a test helper to satisfy React 19's `use()` contract — pragmatic and self-contained, not flagged.
- Magic numbers: none material. The 2-second redirect delay in the page (`setTimeout(..., 2000)`) is a UI timeout inline; could be a named constant `FORBIDDEN_REDIRECT_MS` if it ever appears twice, but it's local and self-explanatory.

### 4. TypeScript interfaces — PASS
- Every hook has a `UseXxxResult` interface; every service has an `XxxInput`/output pattern; every component declares a props interface.
- `assembleOrderData.ts` properly types `AssembledOrderData`, `AssembleOrderDataInput`, `PaymentInfo`, and `ExpandedPaymentIntent`.
- No `any` in source code (searched: only inside `updateFavoritesService` discriminator string literal `'any'`-ish variants — false positive on the word "any"). Test files use `(global.fetch as any)` — SUGGESTION only.

### 5. Comments — WARNING (R2-001)
- AGENT.md: "DO NOT ADD ANY COMMENTS unless asked". New code in this PR is **comment-free** (`useCheckoutTotals.ts`, `useCreateOrder.ts`, `useFavorites.ts`, `useOrderById.ts`, `useOrderHistory.ts`, `assembleOrderData.ts`, `requestCancellation.ts`, `FavoritesContext.tsx`, `app/api/favorites/route.ts`, `CancelOrderModal.tsx` — all clean).
- Outdated comments referencing Authorization headers: **none remain**. Refactor swept them out.
- One outlier: `OrderHistory.tsx` keeps 30+ lines of learning comments (see R2-001).

### 6. Barrel exports — PASS
- `features/checkout/index.ts` — exports `CheckoutForm`, `OrderSummary`, `assembleOrderData` + type, `useCreateOrder`, `useCheckoutTotals`. No internals.
- `features/favorites/index.ts` — exports `FavoriteItemRow`, context, `useFavoritesApi`, services, types. No internals.
- `features/orders/index.ts` — exports components + services + hooks + types. No internals.
- All barrels export the public API only.

### 7. Review size / commit hygiene — PASS
- 11 commits, mostly 1–2 files (e.g., `feat(orders): add useOrderById hook` = 1 file, `feat(favorites): add /api/favorites route` = 1 file).
- The largest commit, `ebf5258 refactor: migrate checkout and orders to cookie-based auth with service/hook extraction`, spans 8 files but is a single coherent cross-page refactor. Acceptable.
- Minor: commit `9ba2c9b refactor(orders): add useOrderHistory hook and migrate OrderHistory` also touches `src/app/checkout/page.tsx` — message mentions only OrderHistory. The change starts the checkout migration that finishes in `ebf5258`. Not a blocker; flag for commit-message precision.

## Critical Issues

None.

## Warnings (non-blocking)

- **R2-001**: Comments in `OrderHistory.tsx` violate AGENT.md "no comments" rule. Pre-existing, survived a major refactor. Clean up in this PR or as a tiny follow-up.
- **R2-002**: `mi-cuenta/pedidos/[orderId]/page.tsx` couples `pageState` to `useOrderById`'s exact error strings. Replace with discriminated return on the hook.

---

# R1 Risk Review — PR 3b-extension

**Reviewer**: R1 Risk (exhaustive sweep, N=1; second-pass confirmation)
**Diff**: `2136c0e..HEAD` — 22 files, +960/-1252, 11 commits
**Branch**: `frontend/security-hardening-critical-fixes-pr-3b-consumers`
**Date**: 2026-07-10
**Sweeps completed**: 2

## Gate: FAIL

AuthContext is correctly cookie-based and the four API routes properly delegate to `requireUser()`, but the **checkout flow is broken in production**: `CheckoutForm.tsx` still reads the JWT from `localStorage`, which PR 3a emptied. The PR title promises "all consumers migrated to cookie-based auth" — `CheckoutForm` is a consumer that didn't get migrated, so functionally the migration is incomplete. Fix this before pushing (or scope it out explicitly as a follow-up PR and disclose it).

## Findings Ledger

| id | lens | location | severity | status | evidence |
|----|------|----------|----------|--------|----------|
| R1-001 | risk | `src/features/checkout/components/CheckoutForm.tsx:64-78` | BLOCKER | open | The PR description states the goal is to migrate "all consumers" to cookie-based auth, yet `CheckoutForm.tsx` was untouched (verified: `git diff 2136c0e..HEAD -- src/features/checkout/components/CheckoutForm.tsx` = 0 lines) and still does `const jwt = localStorage.getItem('jwt')` (line 65) then sends `Authorization: Bearer ${jwt}` to `/api/create-payment-intent`. After PR 3a removed JWT from `AuthContext` (commit `fc6eaaf`), no code in the codebase writes the JWT to localStorage — `localStorage.getItem('jwt')` returns `null` at runtime, the `throw new Error('No authentication token found')` fires on line 68, and the customer can never reach Stripe checkout. The complementary half of the bug is `src/app/api/create-payment-intent/route.ts:46-63`, which still reads `request.headers.get('authorization')` and only accepts `Bearer` — it does not call `requireUser()` and does not read the `bv_session` cookie. So even if `CheckoutForm` were patched to fetch with `credentials: 'same-origin'`, the route would 401 it. Combined user impact: complete checkout flow inoperable for all logged-in users (which is the only path that reaches /checkout). Defect class: functional break of payment path with security relevance (the old pattern reads a long-lived credential from JS-accessible storage). Action: either migrate `CheckoutForm` to use `requireUser`/`bv_session` (remove the `localStorage.getItem('jwt')` block + `Authorization` header) AND migrate `/api/create-payment-intent/route.ts` to `requireUser(request)`, OR disclose this is scoped to PR 3c and re-target the milestone. |
| R1-002 | risk | `src/app/api/favorites/__tests__/` (absent) | WARNING | info | New `/api/favorites` route (src/app/api/favorites/route.ts:1-82, added in commit `580168e`) introduces a brand-new server endpoint with no dedicated tests in the PR. The security-critical behaviors of this endpoint — `requireUser()` enforcement, validation of array-of-non-empty-strings with `MAX_FAVORITES = 200`, IDOR prevention on `PUT /api/users/${userId}` (line 42 of updateFavoritesService), and `X-Trace-Id` echo on every response — are not directly exercised; they are only transitively covered through `validate-request.test.ts` and `session.test.ts`. Pattern mirror: sibling endpoints (`/api/orders`, `/api/orders/[orderId]`) ship with 660-line and 880-line test suites (see `src/app/api/orders/__tests__/route.test.ts`, `src/app/api/orders/[orderId]/__tests__/route.test.ts`). User impact: future regression that loosens `requireUser` or breaks the `MAX_FAVORITES` cap (a data-corruption risk for the user's favorites relation in Strapi) would not be caught. Defect class: missing security test coverage on a new auth-gated endpoint. Action: add `route.test.ts` mirroring the orders test structure — at minimum: cookie-missing → 401, expired/invalid token (Strapi 401) → 401, oversized array (>200) → 400, non-string item → 400, X-Trace-Id echo, IDOR-safe `userId` on PUT. |
| R1-003 | risk | `src/features/orders/services/getOrdersService.ts:20-50` (unchanged in diff but exercised by the migrated `useOrderHistory` hook) | WARNING | info | `getOrdersService` only adds an explicit `filters[user][id][$eq]=${userIdParam}` Strapi filter when the client supplies `?user=N`; when no param is passed, the service drops the user filter entirely and trusts Strapi to scope by the bearer token (line 48-50: `if (userIdParam) { strapiParams.set(...) }`). `useOrderHistory` (src/features/orders/hooks/useOrderHistory.ts:34) never sends a `user` param, so in production this code path relies wholly on Strapi's user-permission plugin / a policy at `/api/orders` to scope the response. If that policy regresses or is misconfigured, `GET /api/orders` will leak every authenticated user's orders to every authenticated user. Pre-existing in code, but the PR brings this hook online to "real" consumers and is a natural moment to harden. Defect class: defense-in-depth gap on a list endpoint. Action (defensive): unconditionally set `filters[user][id][$eq]=${user.id}` in `getOrdersService` so the filter travels with the request and survives Strapi-side policy drift. Verify with a unit test that asserts the query string contains the `filters[user][id][$eq]=42` fragment. Mirror the same shape in `/api/favorites` if equivalent exposure exists. |

## Per-Question Verdicts

### 1. JWT removal completeness from `AuthContext` — PASS (with caveats)
- `src/context/AuthContext.tsx:19-25`: `AuthContextType` exposes only `user | isLoading | login | register | logout`. `grep -n "jwt" src/context/AuthContext.tsx` = 0 hits.
- `grep -n "useAuth().jwt" src/` = 0 hits; no client path obtains JWT via the context anymore.
- **Caveat**: a non-Context client path still reads JWT directly from `localStorage` (R1-001).

### 2. Cookie-based auth security — PASS
- `src/lib/auth/session.ts:3`: `SESSION_COOKIE = 'bv_session'` (consistent across route + tests).
- `src/lib/auth/session.ts:5-13`: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 604800`. Verified by `src/lib/auth/__tests__/session.test.ts` (lines 32, 40, 48, 56).
- `src/lib/auth/validate-request.ts:18-25`: rejects when no cookie; rejects when Strapi returns 401 (expired token); rejects when Strapi's user payload has no `id`. The JWT signature/expiry validation itself is delegated to Strapi's `/api/users/me` round-trip (line 29-36), which is the right call (don't re-implement JWT verification). Tests cover all four paths (validate-request.test.ts:26-128).

### 3. Route authorization completeness — PASS
- `/api/favorites` (GET, PUT): `requireUser(request)` at route lines 11 and 36. ✓
- `/api/orders` (GET, POST): `requireUser(request)` at route lines 21 and 56. ✓
- `/api/orders/[orderId]` (GET): `requireUser(request)` at line 22. ✓
- `/api/orders/[orderId]/request-cancellation` (POST): `requireUser(request)` at line 29. ✓
- IDOR: `/api/orders/[orderId]/route.ts:66` and `/api/orders/[orderId]/request-cancellation/route.ts:89` both compare `order.user.id !== user.id` and return 404 (not 403) so the endpoint does not reveal existence of other users' orders. Verified by tests at route.test.ts:122-148. ✓
- `/api/orders` GET IDOR: only enforced when `userIdParam` is present (line 32-39); see R1-003.

### 4. X-Trace-Id propagation — PASS
- Every new fetch in `useOrderById.ts:36`, `useOrderHistory.ts:38`, `useFavorites.ts:29, 59`, `useCreateOrder.ts:59`, `requestCancellation.ts:17` includes `X-Trace-Id: newTraceId()`. ✓
- Every server route echoes `X-Trace-Id: traceId` on success and error responses: `/api/favorites/route.ts:22, 27, 47, 59, 74, 79`; `/api/orders/route.ts:42, 48, 66, 76, 82, 91, 105`; `/api/orders/[orderId]/route.ts:42, 49, 58, 69, 75, 80`; `/api/orders/[orderId]/request-cancellation/route.ts:42, 49, 67, 73, 85, 92, 99, 125, 132, 138, 143`. ✓

### 5. Data exposure risks — PASS
- All `catch` blocks return friendly Spanish messages (`'No pudimos cargar tus pedidos. Intentá de nuevo.'`, etc.) — no stack traces, no Strapi URLs, no internal IDs leak.
- No `console.log/error/warn` statements added in this PR. Existing console in unrelated files (`src/app/carrito/page.tsx:44`, `src/lib/email/client.ts`) was untouched by this diff.
- Previous auth-state-leaking logs are gone (verified by reading the new file bodies — no `console.*` exists).

### 6. Input validation — PASS (with style note)
- `/api/orders` POST validates `orderId` (string, non-empty), `items` (array, non-empty), numeric `subtotal/shipping/total` — all in the route (src/app/api/orders/route.ts:72-93). `assembleOrderData` is correctly typed end-to-end.
- `/api/favorites` PUT: `validateFavoritesList(body)` runs in the route (src/app/api/favorites/route.ts:51). The validator function lives in `src/features/favorites/services/updateFavoritesService.ts:15` for testability — defensible architecture, not a defect. The validator enforces array shape, ≤200 elements (MAX_FAVORITES), and non-empty string items. ✓
- `/api/orders/[orderId]/request-cancellation`: `reason` validated as non-empty string (line 46-51); reason is `.substring(0, 1000)` server-trimmed at line 116. ✓

### 7. Test coverage of security — PASS for migrated routes, WARNING for new `/api/favorites`
- 401-without-cookie: covered for `/api/orders` (route.test.ts:40-46), `/api/orders/[orderId]` (route.test.ts:50-62), and `requireUser` itself (validate-request.test.ts:26-38). ✓
- 401-with-invalid-token (Strapi 401): covered at orders/__tests__/route.test.ts:47-58 and validate-request.test.ts:40-63. ✓
- IDOR: covered at `/api/orders` (route.test.ts:77-108) and `/api/orders/[orderId]` (route.test.ts:122-148, including the security suite at 387-421). ✓
- Cookie validation: covered at session.test.ts:91-112 (cookie present, cookie absent, cookie mixed with others — only `bv_session` is read). ✓
- **Gap**: `/api/favorites/route.ts` has no `__tests__` directory — see R1-002.

## Critical Issues
- **R1-001** (BLOCKER): `CheckoutForm.tsx` is the only consumer that still reads JWT from `localStorage` and posts a Bearer token. After PR 3a, the JWT is no longer stored anywhere, so this throws on every checkout load. The migration is functionally incomplete. Fix or scope-out before merge.

## Warnings
- **R1-002**: New `/api/favorites` route lacks any dedicated security tests.
- **R1-003**: `getOrdersService` does not enforce a `user` filter unconditionally; relies on Strapi policies. Defense-in-depth hardening recommended.

## Recommendation
**fix-first** — address R1-001 (CheckoutForm migration: remove `localStorage.getItem('jwt')`, drop `Authorization` header, switch to `credentials: 'same-origin'`, and migrate `/api/create-payment-intent` to `requireUser()`). R1-002 and R1-003 are defense-in-depth improvements that are appropriate for a follow-up PR.

---

# R3 Reliability Review — PR 3b-extension

**Reviewer**: R3 Reliability (exhaustive sweep, N=2)
**Diff**: `2136c0e..HEAD` — 22 files, +960/-1252, 11 commits
**Branch**: `frontend/security-hardening-critical-fixes-pr-3b-consumers`
**Date**: 2026-07-10
**Sweeps completed**: 2

## Gate: FAIL

The PR migrates consumer-side code to cookie-based auth and the migrated tests **all pass** (OrderHistory 19/19, CancelOrderModal 8/8, route.test 16/16 + 19/19, page.test.tsx 0 failures across the new tests, AuthContext 9/9). The 34 failing tests in the suite are pre-existing failures in files this PR did not touch (CartContext, CookieBanner, CheckoutForm — confirmed by name comparison against the 22-file diff). **However, two real reliability defects remain**: (1) the new `useOrderById` 403 branch is unreachable in production because the API always returns 404 (information-disclosure policy), and (2) zero unit tests were added for the eight new files (3 hooks, 1 service, 1 route, 2 hook services, 1 context refactor) — every test in the new code paths is incidental coverage from the existing migration. Fix these before pushing; the second is the more impactful because it directly affects user-impacting logic (payment-failure path in `useCreateOrder`, transform correctness in `assembleOrderData`, hook-level cancellation in `requestCancellation`).

## Findings Ledger

| id | lens | location | severity | status | evidence |
|-----|------|----------|----------|--------|----------|
| R3-001 | reliability | `src/features/orders/hooks/useOrderById.ts:41-55`; `src/app/mi-cuenta/pedidos/[orderId]/page.tsx:21-40, 76-96` | WARNING | info | `useOrderById` branches on `response.status === 403` (line 41) and `response.status === 404` (line 49). The `/api/orders/[orderId]/route.ts:66-71` implementation (verified at `git show 2136c0e:src/app/api/orders/[orderId]/route.ts` and current `HEAD`) returns **404** for both "not found" and "another user's order" — this is intentional information-disclosure prevention, asserted by `src/app/api/orders/[orderId]/__tests__/route.test.ts:122-148, 387-421, 468-504`. **The 403 branch in `useOrderById` is unreachable in production.** Downstream consequence: `page.tsx:23` `forbiddenDetected = error === 'No tienes permiso para ver este pedido.'` never evaluates `true` (the route never returns 403), so the `useEffect` at `page.tsx:32-40` that triggers a `setTimeout(... 2000)` redirect to `/mi-cuenta/pedidos?error=forbidden` never fires. Cross-user access attempts show the generic "Pedido No Encontrado" view (pageState `not-found`) instead of the dedicated "Acceso Denegado" UI with auto-redirect. **Tests pass because `src/app/mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx:247-292` mocks `fetch` to return `status: 403`, but the route never returns 403 in production.** User impact: confusing UX on cross-user URL probing, no actual data leak (server still enforces ownership at `route.ts:66`). Defect class: dead code + coupling to error-string equality (`page.tsx:23, 46` uses literal `===` against the hook's Spanish message — already flagged by R2-002 as a fragility). Action: either (a) drop the 403 branch from `useOrderById` and the `forbiddenDetected` machinery from `page.tsx`, since the route policy is "404 for everything," OR (b) switch the hook to return a discriminated union `{ kind: 'ok' \| 'not-found' \| 'forbidden' \| 'error' }` so the dead branch becomes structurally expressible when/if a future route returns 403. Pre-existing coupling (the hook is new in this PR but `page.tsx` carries the coupling from the prior implementation). |
| R3-002 | reliability | `src/features/checkout/hooks/useCreateOrder.ts:1-104`; `src/features/checkout/hooks/useCheckoutTotals.ts:1-21`; `src/features/checkout/services/assembleOrderData.ts:1-61`; `src/features/orders/hooks/useOrderById.ts:1-82`; `src/features/orders/hooks/useOrderHistory.ts:1-63`; `src/features/orders/services/requestCancellation.ts:1-33`; `src/features/favorites/hooks/useFavorites.ts:1-80`; `src/app/api/favorites/route.ts:1-82` | BLOCKER | open | **Zero new tests for eight new files.** The PR's diff adds 8 new files; `find src/{app/api/favorites,features/{checkout/{hooks,services},favorites/hooks,orders/{hooks,services}}} -name "*.test.*"` returns 0 matches. Existing tests were migrated (CancelOrderModal.test.tsx now mocks 403 for `useAuth` instead of reading localStorage JWT; OrderHistory.test.tsx, route.test.ts files updated to set `SESSION_COOKIE`), but no test covers: (a) `useCreateOrder`'s payment-failure branch (`useCreateOrder.ts:86-92` — surfaces "Tu pago fue procesado, pero hubo un problema al registrar tu pedido: … Por favor, contacta con soporte indicando tu ID de pago: …" with the actual `paymentIntent.id`); (b) `useCreateOrder`'s double-submit guard (no AbortController / no in-flight check between `setIsCreatingOrder(true)` and the fetch — if user double-clicks Pagar, both calls hit `/api/orders`); (c) `assembleOrderData`'s `latest_charge` missing/edge cases (returns `'unknown'` brand and `'0000'` last4 — this is silently wrong when Stripe's PaymentIntent hasn't been confirmed yet, which is a real lifecycle state); (d) `useCheckoutTotals` boundary at `FREE_SHIPPING_THRESHOLD = 50` (exact equality: `subtotal === 50` → free shipping per `src/lib/constants/shipping.ts:22`); (e) `useOrderHistory` refetch when `page` changes (verified manually — `useCallback([page])` rebuilds → `useEffect` re-fires — but no assertion test); (f) `useOrderById` cancellation cleanup (`cancelled` ref flips on unmount — verified manually — but no assertion test); (g) `requestCancellation` error path returns server's `errorData.error` correctly when body parse succeeds; (h) `app/api/favorites` GET returns `{ favorites: [] }` (empty case) and PUT body-validation paths (`too_many`, `invalid_item`); (i) `useFavorites` logout path — see R3-003. **Defect class: untested behavior on user-impacting payment + cancellation + favorites paths.** Sibling files migrated by this PR DO have tests (orders/route.test.ts has 660+ lines, orders/[orderId]/route.test.ts has 880+ lines), so the gap is conspicuous. User impact: a regression in `assembleOrderData` (e.g., brand default `'unknown'` becomes `''`) would ship without detection; a regression in `useCreateOrder`'s error message would also ship without detection; the cancellation hook could silently swallow server errors and no test would fail. Action: write at least: (1) `assembleOrderData.test.ts` — happy path, missing `latest_charge`, missing `payment_method_details`, missing `card`, full nested path; (2) `useCreateOrder.test.tsx` — happy path, server error surfaces message, double-submit protection, paymentIntent.id surfaced in error; (3) `useCheckoutTotals.test.ts` — empty cart, exactly at threshold (49.99, 50, 50.01), multiple items; (4) `useOrderById.test.tsx` — success, 404, network failure, unmount-during-fetch, orderId-change refetch; (5) `useOrderHistory.test.tsx` — page-change refetch, error propagation; (6) `requestCancellation.test.ts` — happy path, server `error` propagation, non-JSON response fallback; (7) `app/api/favorites/__tests__/route.test.ts` — mirror orders/__tests__/route.test.ts shape (401 without cookie, 401 with expired session, PUT body validation, IDOR on PUT `/api/users/${userId}`). R1-002 already flags the `/api/favorites` test gap; this finding widens it to all eight new files. |
| R3-003 | reliability | `src/features/favorites/hooks/useFavorites.ts:20-46`; `src/features/favorites/context/FavoritesContext.tsx:34-38, 59-62`; `src/context/AuthContext.tsx:126-141` | WARNING | info | **Cross-user favorites leakage via stale hook state.** `AuthContext.logout()` (`src/context/AuthContext.tsx:126-141`) calls `clearCart()` and sets `user=null` but never tells `useFavoritesApi` to reset its `favorites` array. `FavoritesContext.useEffect` (line 34-38) only fires `fetchFavorites()` when `user` becomes truthy — when `user` becomes null, nothing happens, and the previous user's `Product[]` stays in `useFavoritesApi.favorites` state. The exported `isFavorite(productId)` (`FavoritesContext.tsx:56-57`) will return `true` for products belonging to the previous user until the next login completes a new fetch. **User impact: in a shared browser session (kiosk, family device, or simply if a second user logs in before the first user's tabs are closed), the second user briefly sees the first user's favorite-product heart-fill state and any `isFavorite()`-gated UI affordances.** Not a security boundary (server still enforces ownership on add/remove) but a real UX/correctness defect. Defect class: missing state reset on auth identity change. Pre-existing in spirit (the old FavoritesContext also did not clear on logout — `git show 2136c0e:src/features/favorites/context/FavoritesContext.tsx | grep -A 4 fetchFavorites` shows `if (!user) { setFavorites([]); ... }` ONLY in the fetch path, not on user-change). Action: in `useFavoritesApi`, expose `clearFavorites()` (already in the public type via `FavoritesContext.tsx:19`), wire `FavoritesContext.useEffect` to also reset state when `user` flips to null, AND call it from `AuthContext.logout` (or expose a "user identity changed" callback the provider subscribes to). Lower-priority than R3-002 because the security path is intact — flagged as info-level defense-in-depth. |
| R3-004 | reliability | `src/features/orders/components/OrderHistory.tsx:51-93`; `src/features/orders/hooks/useOrderHistory.ts:23-63` | WARNING | info | **Loading/error states flash stale data on page change.** `useOrderHistory` (line 23-63) sets `loading=true` and `error=null` at the start of `fetchOrders` (line 30-31) but does NOT clear `orders` or `pagination` (lines 24-25). When the user clicks `Siguiente` (`OrderHistory.tsx:122`), `currentPage` changes → `fetchOrders` rebuilds via `useCallback([page])` → `useEffect` re-fires (line 58-60) → component immediately enters `if (loading) { return <Cargando pedidos...> }` (line 51-57), showing the spinner. That's correct. But if a previous fetch's `setOrders(data.data)` was already pending and resolves AFTER the page-change fetch starts, the stale orders briefly flash before being overwritten by the new fetch's response. Vitest does not exercise this — `OrderHistory.test.tsx:411-434` only tests forward navigation, never concurrent fetches. In production this is unlikely (the prior fetch was awaited inside `useEffect`'s microtask before unmount-equivalent logic), but the contract is fragile: there is no `AbortController` on the fetch, no `cancelled` ref (cf. `useOrderById.ts:25` which DOES have one — inconsistent), and no `ignoreStaleResponse` guard. **Defect class: stale-data race window on rapid page changes.** User impact: momentarily wrong list when the user clicks "Siguiente" twice quickly. Action: mirror `useOrderById`'s pattern — wrap `fetchOrders` in a `let cancelled = false` closure; set `cancelled = true` in the `useEffect` cleanup so the resolved `data.data` is ignored. Note: this is **inconsistency between two hooks in the same PR** (`useOrderById` correctly handles cancellation, `useOrderHistory` does not). Same applies to `useFavoritesApi.fetchFavorites` (line 20-46) — no cancellation. |

## Per-Question Verdicts

### 1. AuthContext behavior — PASS (out of scope for this PR)
- `src/context/AuthContext.tsx` is **NOT** in the 22-file diff (`git diff 2136c0e..HEAD --name-only | grep AuthContext` = 0 hits). AuthContext was migrated in an earlier PR.
- Verified separately: `src/context/__tests__/AuthContext.test.tsx` runs 9 tests, **0 failures** (jq over vitest JSON output). Covers hydrate-from-`/api/auth/session`, 401 no-user, network-error fallback, login, register, logout.
- `AuthContext.tsx:40-62` correctly handles all three cases: `response.ok` → `setUser(data.user ?? null)`, non-2xx → `setUser(null)`, fetch throw → `setUser(null)`. `setIsLoading(false)` in `finally` (line 56-58) prevents the infinite-loading-state bug.
- `login` (line 64-91), `register` (line 93-124), `logout` (line 126-141) all clear `setIsLoading(false)` in `finally` — no stuck loading state.

### 2. Hook behavior — PASS with the R3-001/R3-004 caveats
- **`useOrderById`** (src/features/orders/hooks/useOrderById.ts): handles loading/error/success states via `setLoading` + `setError` + `setOrder`. Cleans up on unmount via the `cancelled` ref (line 25, 76-78). Refetches when `orderId` changes via the `[orderId]` dependency on `useEffect` (line 79). **Defect: 403 branch unreachable** — see R3-001.
- **`useFavoritesApi`** (src/features/favorites/hooks/useFavorites.ts): handles loading/error/success. `fetchFavorites` and `updateFavorites` are stable via `useCallback([])` (line 20, 48). Optimistic update is **NOT implemented** — state is only updated on server confirmation (`setFavorites(newFavorites)` at line 70). User impact: the heart icon doesn't fill until the server round-trip completes (~100-500ms in dev). This is a UX regression vs the prior behavior (`git show 2136c0e:src/features/favorites/context/FavoritesContext.tsx | grep "Optimista"` shows the old `setFavorites(prev => [product, ...prev])` BEFORE the fetch). Defect class: lost optimistic update. Worth fixing.
- **`useOrderHistory`** (src/features/orders/hooks/useOrderHistory.ts): refetches when `page` changes via `useCallback([page])` → `useEffect([fetchOrders])` (line 56-60). **Defect: no cancellation on unmount** — see R3-004.
- **`useCreateOrder`** (src/features/checkout/hooks/useCreateOrder.ts): handles loading (`setIsCreatingOrder`) + error (`setOrderError`) + success (router.push or `onSuccess`). `finally` block resets loading (line 93-95). However: (a) **no double-submit guard** — `createOrder` does not check `if (isCreatingOrder) return` before proceeding; if `handleSuccess` fires twice (Stripe's `confirmPayment` can theoretically invoke `onSuccess` twice if mounted twice), both POSTs hit `/api/orders` and two orders are created. No test for this. (b) Error message at line 89-92 includes the `paymentIntent.id` — good for support traceability, but no test asserts this.
- **`useCheckoutTotals`** (src/features/checkout/hooks/useCheckoutTotals.ts): **pure computation** via `useMemo`. Edge cases: empty cart → `{ subtotal: 0, shipping: 5.95, total: 5.95 }` (since 0 < 50). Exact threshold: subtotal=50 → shipping=0 (`>=` is inclusive at `src/lib/constants/shipping.ts:22`). NaN-prone if any `item.price` is NaN — not validated.

### 3. Service determinism — PASS
- **`assembleOrderData`** (src/features/checkout/services/assembleOrderData.ts:41-60): **pure**, no side effects, no Date.now/Math.random. Same input → same output. Edge cases handled: missing `latest_charge` → defaults to 'unknown'/'0000'. **Defect: defaults hide Stripe bugs** — if Stripe hasn't populated `latest_charge`, the user sees brand=`unknown`, last4=`0000` in their order confirmation, masking a Stripe-side issue. No test covers this.
- **`requestCancellation`** (src/features/orders/services/requestCancellation.ts:8-32): not a pure function (it's a service that does I/O). Handles server errors: tries `errorData.message` then `errorData.error` (line 27-28), falls back to default Spanish message. No AbortController — if user navigates away mid-cancellation, the fetch continues. No cleanup on unmount, but since this is a plain function (not a hook), cleanup is the consumer's responsibility.
- **`getFavoritesService`** (src/features/favorites/services/getFavoritesService.ts): I/O service. Returns `{ favorites }` or `{ error: NextResponse }`. No hidden state. Defect: returns `payload.favorites ?? []` (line 54) — if Strapi's response is missing the `favorites` key (malformed), it silently returns empty array instead of erroring. Pre-existing behavior.
- **`updateFavoritesService`** (src/features/favorites/services/updateFavoritesService.ts): I/O service. Validator returns discriminated union (clean). No hidden state.
- **`getOrdersService`** (src/features/orders/services/getOrdersService.ts): I/O service. No try/catch around `fetch` (line 55-62) — if `fetch` throws (network error), the error propagates to the route's outer `catch` (src/app/api/orders/route.ts:44) which returns 500 with a generic message. User impact: **network error → 500 instead of 502**, inconsistent with the favorites route which returns 502 on network failure (src/app/api/favorites/route.ts:25-29). Defect class: inconsistent error semantics across API routes.
- **`createOrderService`** (src/features/orders/services/createOrderService.ts): I/O service. Wraps fetch in try/catch — consistent with favorites. Returns `{ data }` on success, `{ error: NextResponse }` on failure. Clean.

### 4. Route behavior — PASS
- **`/api/favorites` GET** (src/app/api/favorites/route.ts:7-30): Returns `{ favorites }`. Handles empty favorites via `getFavoritesService` (line 54) → `payload.favorites ?? []`. Auth via `requireUser`. Trace ID echo.
- **`/api/favorites` PUT** (src/app/api/favorites/route.ts:32-82): Validates body via `validateFavoritesList` (line 51). Returns updated favorites (line 72-74). Handles 400 for malformed JSON (line 42-49), 400 for invalid list (line 52-61). Auth via `requireUser`. **Defect: PUT returns `validation.favorites` (the validated input) rather than the server's stored favorites** — if Strapi normalizes the array (e.g., dedupes), the client gets a stale view. Untested.
- **`/api/orders` GET** (src/app/api/orders/route.ts:17-50): Handles pagination via `page` searchParam (line 27). IDOR prevention via `userIdParam !== user.id` → 403 (line 32-39 of getOrdersService). Returns `{ data, meta }`. 502 on Strapi error, 500 on unexpected error. **Defect: 500 on fetch throw** (see Service determinism). Pagination edge cases: page=0 → Strapi probably 400s (untested); pageSize is fixed at 10 server-side (line 45 of getOrdersService) — clients cannot request fewer/more.
- **`/api/orders` POST** (src/app/api/orders/route.ts:52-110): Validates `orderId` (line 72), `items` (line 78), numeric `subtotal/shipping/total` (line 84-93). Returns `{ data: createOrderService.data }` (line 103) — note: shape is `{ data: order }` not `{ order }`, may mismatch client expectations. Untested.
- **`/api/orders/[orderId]` GET** (src/app/api/orders/[orderId]/route.ts): Verified. Returns `{ data: order }`. 404 for both not-found and forbidden (line 66-71). **Defect: 403 branch in `useOrderById` is unreachable** (see R3-001).
- **`/api/orders/[orderId]/request-cancellation` POST** (src/app/api/orders/[orderId]/request-cancellation/route.ts): Verified. Validates reason (line 46), checks ownership (line 89), status transitions only allowed from `pending|paid|processing` (line 96), truncates reason to 1000 chars (line 116). All paths return Spanish messages.
- **Error codes summary**: 401 (no cookie / invalid session), 400 (validation), 403 (IDOR on /api/orders when ?user=N mismatch), 404 (not found / not owned), 502 (Strapi failure), 500 (unexpected). All Spanish. ✓

### 5. Test reliability — PASS for migrated tests, BLOCKER for new-code coverage gap
- **`npx vitest run --project unit --maxWorkers=2`**: 703 passed / 34 failed across 47 files. **All 34 failures are in files this PR did not touch**:
  - `src/__tests__/context/CartContext.test.tsx` (15 failures — `localStorage.getItem is not a function` jsdom error)
  - `src/app/components/ui/__tests__/CookieBanner.test.tsx` (2 failures — same `localStorage` issue)
  - `src/features/checkout/components/__tests__/CheckoutForm.test.tsx` (8 failures — same root cause)
  - `src/features/checkout/components/__tests__/CheckoutForm.retry.test.tsx` (5 failures — same)
  - Plus 4 PAY-10 Retry Logic failures (`[PAY-10] Retry Logic Tests`) — unrelated to this PR.
  - All failures share the symptom `localStorage.getItem is not a function` — a jsdom/stubbing issue in `vitest.setup.ts` that pre-dates this PR. Verified by `git log --oneline src/features/checkout/components/__tests__/CheckoutForm.test.tsx | head -3` — last touched before `2136c0e`.
- **New tests added by this PR**: **0**. All test changes in the diff are *migrations* of existing tests (replacing localStorage JWT mocks with `SESSION_COOKIE` mocks via `request.cookies.set(SESSION_COOKIE, '...')`).
- **Tests that pass in the PR's scope** (verified via jq over vitest JSON output):
  - `src/app/api/orders/__tests__/route.test.ts` — 16/16
  - `src/app/api/orders/[orderId]/__tests__/route.test.ts` — 19/19
  - `src/app/mi-cuenta/pedidos/[orderId]/__tests__/page.test.tsx` — all green
  - `src/features/orders/components/__tests__/CancelOrderModal.test.tsx` — 8/8
  - `src/features/orders/components/__tests__/OrderHistory.test.tsx` — 19/19
  - `src/features/orders/components/__tests__/OrderCard.test.tsx` — 37/37
  - `src/features/orders/components/__tests__/OrderDetail.test.tsx` — 55/55
  - `src/features/orders/components/__tests__/OrderTimeline.test.tsx` — 3/3
  - `src/context/__tests__/AuthContext.test.tsx` — 9/9
  - `src/app/api/auth/{login,logout,register,session}/__tests__/route.test.ts` — all green
  - `src/lib/api/__tests__/orders.test.ts` — 18/18
- **Flakiness**: no `waitFor` timing failures observed in the PR's tests. Tests use `mockResolvedValueOnce` and deterministic mock chains. No real-network calls.
- **Determinism**: tests stub `global.fetch` directly, no real HTTP. No `Date.now`/`Math.random` leakage into assertions (the `generateOrderId` test uses regex match against `ORD-\d+-[A-Z0-9]{4}`).

### 6. Regressions — PASS with one minor caveat
- **`CheckoutForm` still uses localStorage JWT** (R1-001, BLOCKER, NOT a new R3 finding). The R1 review already documents this. From R3's lens: this is a reliability defect because every checkout attempt will throw `No authentication token found`. Not a regression from this PR (file untouched in this PR) but a blocker for merge.
- **`Navbar`** (src/app/components/Navbar.tsx): reads `useAuth().user` (line 7 import verified, file not in this PR's diff) → `useAuth` returns `{ user, isLoading, login, register, logout }` (no `jwt`). The previous R1 review confirmed no `useAuth().jwt` calls remain. R3 verdict: Navbar correctly shows auth state via the new cookie-based session.
- **Cart ↔ checkout integration**: `useCreateOrder` (src/features/checkout/hooks/useCreateOrder.ts:38-53) computes `subtotal = cartItems.reduce(...)`, `shipping = calculateShipping(subtotal)`, `total = subtotal + shipping`. `useCheckoutTotals` (src/features/checkout/hooks/useCheckoutTotals.ts:14-19) computes the same thing. **Defect: R2-004 already noted this duplication**. From R3's lens: divergence risk — if `useCheckoutTotals` ever adds a discount line and `useCreateOrder` doesn't pick it up, the order is created with `subtotal != useCheckoutTotals.subtotal`. The fix is R2-004's recommendation: extract `calculateTotals(cartItems)` into a pure service and have both hooks call it. No test currently asserts that the two stay in sync.

### 7. Error mapping — PASS
- All `fetch` errors map to Spanish user-friendly messages. No raw `TypeError: Failed to fetch` or `500 Internal Server Error` reaches the UI. Verified:
  - `useFavoritesApi.fetchFavorites` → `'No se pudo obtener tus favoritos.'` (line 35)
  - `useFavoritesApi.updateFavorites` → `'No se pudieron actualizar tus favoritos.'` (line 66)
  - `useOrderById` → `'No tienes permiso para ver este pedido.'` (line 43), `'Pedido no encontrado.'` (line 51), `'Error al cargar el pedido. Inténtalo de nuevo.'` (line 68)
  - `useOrderHistory` → `'Error al cargar los pedidos.'` (line 44)
  - `useCreateOrder` → `'No se pudo crear el pedido.'` (line 66) wrapped in `'Tu pago fue procesado, pero hubo un problema al registrar tu pedido: … Por favor, contacta con soporte indicando tu ID de pago: …'` (line 89-92)
  - `requestCancellation` → `'Error al enviar la solicitud de cancelación.'` (line 24) overridden by server's `errorData.message` or `errorData.error` (line 27-28)
  - `AuthContext.login/register` → server's `data.error` or default message (line 82, 115)
- Hook error states surface to consumers via `error: string | null` returns. No raw HTTP error codes (`throw new Error(response.statusText)`) anywhere. ✓
- **Defect (already noted in R3-001)**: error-string equality coupling between `useOrderById` and `page.tsx` (R2-002's domain, R3's reliability lens).

## Critical Issues

- **R3-002** (BLOCKER): Zero unit tests added for eight new files. Eight hooks/services/route have no direct coverage. The migrated tests pass, but they don't cover the new code paths (payment-failure path of `useCreateOrder`, brand/last4 defaults in `assembleOrderData`, cancellation ref in `useOrderHistory`, validator paths in `/api/favorites` PUT, etc.). A regression would ship without detection.

## Warnings (non-blocking)

- **R3-001**: `useOrderById` 403 branch is unreachable in production; `page.tsx`'s forbidden-redirect machinery never fires. UI shows "Pedido No Encontrado" for cross-user access (still secure, just less helpful).
- **R3-003**: `useFavoritesApi` doesn't clear `favorites` on logout → cross-user state leakage in shared sessions. Server-side still enforces auth; UX/correctness issue only.
- **R3-004**: `useOrderHistory` lacks cancellation cleanup that `useOrderById` correctly has. Inconsistent hook patterns in the same PR. Stale-data race window on rapid page changes.

## Recommendation

**fix-first** — R3-002 (add unit tests for the eight new files) is the highest-leverage action: it's the only BLOCKER, and addressing it surfaces any latent bugs in the new code. R3-001 (delete the dead 403 branch or convert the hook to a discriminated union) is a small code change with high readability gain. R3-003 and R3-004 are defense-in-depth and can ship as follow-ups. R1-001 (CheckoutForm migration) remains the unaddressed cross-PR BLOCKER.

**Sweeps_completed**: 2
