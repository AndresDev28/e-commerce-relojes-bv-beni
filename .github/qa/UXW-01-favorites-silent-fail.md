# UXW-01 QA Test Plan — Manual End-to-End Verification

> **Perspective**: external QA tester (no code knowledge beyond what the spec says)
> **Goal**: verify that the silent-fail bug on the heart icon is fixed for anonymous users, and that no regression was introduced for authenticated users.
> **Author**: SDD verify phase pre-merge sanity check
> **Last updated**: 2026-08-09

---

## 0. Pre-flight checklist (BEFORE running tests)

Before touching any test case, confirm the environment is ready. If any of these fail, fix them first — testing on a broken environment produces misleading results.

- [x] **Backend is running**: `npm run dev` in `../e-commerce-relojes-bv-beni-api/` (or confirm remote Strapi URL is reachable in `.env`)
- [x] **Frontend is running on this branch**: `npm run dev` in `e-commerce-relojes-bv-beni/`. Confirm you're on branch `frontend/UXW-01-favoritos-silent-fail` (`git branch --show-current`).
- [x] **Dependencies are fresh**: `rm -rf .next && npm ci` if you haven't run the branch before (Next.js caches are sneaky)
- [x] **Database has at least 5 watches**: navigate to `http://localhost:3000/tienda` and confirm the grid renders multiple cards
- [x] **Browser is ready**:
  - Chrome/Firefox/Safari with DevTools open (Network + Console tabs visible)
  - One **incognito/anonymous** profile (clean, no logged-in user)
  - One **authenticated** profile (logged in with a test user — see how to create one below)
- [x] **Screen reader available** (optional but recommended): macOS VoiceOver (`Cmd+F5`), NVDA on Windows, or `orca` on Linux
- [x] **Test user credentials**: if you don't have a test account, create one at `http://localhost:3000/register`. Save credentials somewhere safe (a password manager, or a sticky note — don't commit them).

---

## 1. Critical scenarios (P0 — these are the bug fix itself)

### TC-01 — Anonymous user taps heart on grid card

> **The original bug**: tapping the heart as an anonymous user did nothing. This test confirms the fix.

- [x] **Precondition**: incognito window, navigate to `http://localhost:3000/tienda`
- [x] **Step 1**: locate any product card in the grid. Note the watch name (e.g., "Reloj Submariner")
- [x] **Step 2**: tap the heart icon on that card
- [x] **Expected**:
  - A message appears **under or near the heart** (NOT a global toast, NOT in a corner)
  - Message reads exactly: **"Iniciá sesión para guardar favoritos"**
  - Next to the message, a clickable link/button reads **"Iniciar sesión"** (blue/primary color)
  - No page reload, no console error
- [x] **Step 3**: click "Iniciar sesión"
- [x] **Expected**:
  - Browser navigates to `http://localhost:3000/login?redirect=%2Ftienda`
  - Verify the URL bar shows the encoded redirect (the `%2F` is the URL-encoded `/`)
- [✅] **PASS / FAIL**: _______

**Notes**: if the prompt doesn't appear, the bug is NOT fixed — STOP and report. If the prompt appears but the URL doesn't have `%2Ftienda`, the redirect encoding is broken — STOP and report.

---

### TC-02 — Anonymous user taps heart on detail page

> **Same bug, different route**. The detail page is `/tienda/{slug}` (note: `/productos/[id]` does NOT exist in this codebase).

- [x] **Precondition**: incognito window, navigate to `http://localhost:3000/tienda`
- [x] **Step 1**: click any product card to open its detail page. Confirm the URL becomes `/tienda/{some-slug}` (e.g., `/tienda/reloj-submariner`)
- [x] **Step 2**: locate the heart icon on the detail page (likely near the price or image)
- [x] **Step 3**: tap the heart
- [x] **Expected**:
  - Inline prompt appears near the heart with text "Iniciá sesión para guardar favoritos" + "Iniciar sesión" CTA
  - No console errors
- [x] **Step 4**: click "Iniciar sesión"
- [x] **Expected**:
  - URL becomes `http://localhost:3000/login?redirect=%2Ftienda%2F{some-slug}` (the full slug is URL-encoded — note the `%2F` between `tienda` and the slug)
- [✅] **PASS / FAIL**: _______

**Notes**: this is the path the original RED test caught as a false green. If TC-01 passes but this fails, the hook is checking the wrong path.

---

### TC-03 — Authenticated user adds favorite from grid

> **Regression check**: existing happy path must keep working.

- [x] **Precondition**: authenticated window (logged in), navigate to `http://localhost:3000/tienda`
- [x] **Step 1**: locate a product card whose heart is currently empty (not favorited)
- [x] **Step 2**: tap the heart
- [x] **Expected**:
  - Heart fills in (filled vs outline icon)
  - **NO prompt appears** (you're authenticated, no need for the login CTA)
  - Network tab shows a `PUT /api/favorites` request with the watch id, returning 200
- [x] **Step 3**: refresh the page (`F5` or `Cmd+R`)
- [x] **Expected**: heart is STILL filled (state persisted server-side)
- [✅] **PASS / FAIL**: 

---

### TC-04 — Authenticated user removes favorite from detail page

> **Different route, same behavior** — make sure the detail page also works for authed users.

- [x] **Precondition**: authenticated window, on a `/tienda/{slug}` page of a watch you've favorited in TC-03
- [x] **Step 1**: tap the heart (which is currently filled)
- [x] **Expected**:
  - Heart empties
  - No prompt, no redirect
  - Network tab shows `DELETE /api/favorites` (or `PUT` with the updated list) returning 200
- [✅] **PASS / FAIL**: _______

---

### TC-05 — Favorites page reflects auth state

> **Sanity check** that `/favoritos` shows the user's saved watches and doesn't break.

- [x] **Precondition**: authenticated, with at least one favorited watch
- [x] **Step 1**: navigate to `http://localhost:3000/favoritos`
- [x] **Expected**: list shows your favorited watches; each row has a remove (heart) button
- [x] **Step 2**: click the remove button on one watch
- [x] **Expected**: row disappears from the list, no errors
- [✅] **PASS / FAIL**: _______

---

## 2. UX correctness scenarios (P1 — design decisions validation)

### TC-06 — Prompt is local to the tapped heart (D1 design rationale)

> **Why this matters**: the design rejected a global `needsAuth` flag because in a grid, all hearts would show the prompt when ONE was tapped. The discriminated union ensures only the tapped heart's prompt appears.

- [x] **Precondition**: incognito, on `/tienda` with multiple cards visible (at least 6)
- [x] **Step 1**: tap the heart on card #1 (top-left)
- [x] **Expected**: prompt appears ONLY under card #1's heart. All other 5+ hearts are unchanged (no prompt)
- [x] **Step 2**: tap the heart on card #4 (middle of grid)
- [x] **Expected**: prompt appears ONLY under card #4's heart. Card #1's prompt may or may not still be visible (acceptable either way; design says prompt state is local to the consumer). No prompt appears on cards #2, #3, #5, #6
- [✅] **PASS / FAIL**: _______

---

### TC-07 — Prompt has correct a11y semantics (D2 design rationale)

> **Why this matters**: the design chose `role="status"` + `aria-live="polite"` (NOT `role="alert"`) because the prompt is feedback, not an error. A screen reader should announce it politely without interrupting.

- [x] **Precondition**: incognito, on `/tienda`. Enable screen reader (VoiceOver / NVDA / ORCA).
- [x] **Step 1**: with screen reader active, tap a heart
- [x] **Expected**: screen reader announces "Iniciá sesión para guardar favoritos" and "Iniciar sesión, button"
- [x] **Expected**: announcement does NOT interrupt or override current speech (polite, not assertive)
- [✅] **PASS / FAIL**: 

---

### TC-08 — Keyboard navigation works

> **Why this matters**: the CTA must be keyboard-reachable for users who don't use a mouse.

- [x] **Precondition**: incognito, on `/tienda`
- [x] **Step 1**: press `Tab` repeatedly until a heart icon has visible focus (focus ring / outline)
- [x] **Step 2**: press `Enter` or `Space` to "tap" the heart via keyboard
- [x] **Expected**: prompt appears
- [x] **Step 3**: press `Tab` — focus should move to the "Iniciar sesión" CTA button
- [x] **Expected**: focus ring is clearly visible on the CTA
- [x] **Step 4**: press `Enter` on the focused CTA
- [x] **Expected**: navigates to `/login?redirect=...`
- [✅] **PASS / FAIL**: _______

---

### TC-09 — Mobile viewport doesn't break the prompt

> **Why this matters**: BV Beni is mobile-first. The prompt shouldn't overflow, get clipped, or push the grid layout into chaos.

- [x] **Precondition**: Chrome DevTools → toggle device toolbar (Cmd+Shift+M) → select "iPhone 14 Pro" or similar. Incognito.
- [x] **Step 1**: navigate to `/tienda` on mobile viewport
- [x] **Step 2**: tap a heart
- [x] **Expected**:
  - Prompt is fully visible (text doesn't get cut off)
  - CTA "Iniciar sesión" is tappable with thumb (not too small, not overlapping other elements)
  - Grid layout doesn't shift unexpectedly (CLS — Cumulative Layout Shift — should be minimal)
- [✅] **PASS / FAIL**: _______

---

## 3. Edge cases (P2 — defensive checks)

### TC-10 — Re-tap behavior (idempotency)

- [x] **Precondition**: incognito, on `/tienda`
- [x] **Step 1**: tap a heart → prompt appears
- [x] **Step 2**: tap the SAME heart again (not the CTA)
- [x] **Expected**: prompt either stays visible (acceptable) or disappears (acceptable). What is NOT acceptable: double navigation, console error, broken state
- [✅] **PASS / FAIL**: _______

---

### TC-11 — Anonymous user navigates to `/favoritos` directly

- [ ] **Precondition**: incognito
- [ ] **Step 1**: navigate directly to `http://localhost:3000/favoritos`
- [ ] **Expected**: you see an empty state ("No tenés favoritos aún" or similar). NOT a redirect to login. NOT a crash. The page is auth-aware but does not block.
- [ ] **PASS / FAIL**: En anónimo, incognito y sin iniciar sesión directamente el botón de link a favoritos está deactivado, quizas este test sobra porque ya está cubierto por la lógica anterior, de hecho, entrando diractamente en el link http://localhost:3000/favoritos hace un "loading y me devuelve a la página de inicio"

---

### TC-12 — Sign-in flow round-trip

- [x] **Precondition**: incognito, on `/tienda`, after tapping a heart and clicking "Iniciar sesión" — you're now at `/login?redirect=%2Ftienda`
- [x] **Step 1**: log in with valid test credentials
- [x] **Expected**: after successful login, you land on `/mi-cuenta` (NOT back on `/tienda`)
- [✅] **PASS / FAIL — this is the KNOWN DEBT, see notes**...Si ha redirigido directamente a "mi cuenta" 

> **KNOWN ISSUE**: the project has pre-existing debt where `/login` does NOT honor the `?redirect=` query parameter — the `LoginForm` always pushes to `/mi-cuenta` after successful authentication. This is OUT OF SCOPE for UXW-01 (documented in `design.md` D3 and `proposal.md` Out-of-Scope). **If TC-12 fails with "lands on /mi-cuenta instead of /tienda", that's EXPECTED**, not a regression. Mark this as PASS with the note "known debt".

---

### TC-13 — Clear-on-auth behavior (D4 design rationale)

> **Why this matters**: when an anonymous user sees the prompt, then somehow authenticates (e.g., via a different tab or via OAuth), the prompt should clear.

- [x] **Precondition**: incognito on `/tienda`
- [x] **Step 1**: tap a heart → prompt appears
- [x] **Step 2**: open a NEW tab in the same browser, log in there
- [x] **Step 3**: go back to the original tab, refresh (`F5`)
- [x] **Expected**: after refresh, you're authenticated. The heart should now toggle favorites normally (no prompt, no redirect)
- [✅] **PASS / FAIL**: 

---

### TC-14 — Network failure during authed mutation

> **Why this matters**: defensive check — if Strapi is down, what does the user see?

- [x] **Precondition**: authenticated, on `/tienda`
- [x] **Step 1**: stop the backend (`Ctrl+C` in the Strapi dev server)
- [x] **Step 2**: tap a heart
- [x] **Expected**: error message appears (likely the existing `ErrorMessage` pattern). No infinite spinner, no white screen. The heart's filled state should NOT be permanently optimistic — when you refresh, the heart should return to its actual state.
- [✅] **PASS / FAIL**:

> **Note**: this scenario is OUT OF SCOPE for UXW-01 (the change was about anon flow). But if the existing behavior is broken in a NEW way after this PR (e.g., the heart stays filled forever even after backend recovers), that's a regression worth reporting.

---

## 4. Regression sweep (P2 — make sure nothing else broke)

Quick smoke tests on adjacent features. These don't need exhaustive coverage; just confirm nothing visibly regressed.

- [✅] **TC-15** — `/` (home page) loads, hero banner renders
- [✅] **TC-16** — Add an item to the cart from `/tienda/{slug}` — cart icon shows count
- [✅] **TC-17** — Navigate to checkout as authenticated — checkout flow starts (don't complete the purchase in QA)
- [✅] **TC-18** — Visit `/mi-cuenta` as authenticated — account dashboard loads
- [✅] **TC-19** — Log out from header — returns to anon state, no stale auth prompts anywhere
- [✅] **TC-20** — Search bar on `/tienda` — typing filters the grid (if applicable)

---

## 5. Reporting

When you finish testing, report results in this format:

## UXW-01 QA Report
```markdown

**Tester**: <your name>
**Date**: YYYY-MM-DD
**Branch**: frontend/UXW-01-favoritos-silent-fail @ <commit-sha>
**Environment**: <local dev / staging / etc>

### Results

| TC ID | Status | Notes |
|-------|--------|-------|
| TC-01 | ✅ PASS / ❌ FAIL | <observation> |
| TC-02 | ✅ PASS / ❌ FAIL | <observation> |
| TC-03 | ✅ PASS / ❌ FAIL | <observation> |
| ... | ... | ... |

### Summary

- P0 results: X/Y passed
- P1 results: X/Y passed
- P2 results: X/Y passed
- Known debt confirmed: YES / NO (TC-12)

### Blockers (if any)

<list of issues that block merge>

### Recommended action

- ✅ READY TO MERGE
- ⚠️ MERGE WITH MINOR FOLLOW-UPS (list them)
- ❌ BLOCK MERGE (list blocking issues)
```

---

## 6. Quick reference

**The exact prompt text** (must match in TC-01, TC-02):
> "Iniciá sesión para guardar favoritos" + button "Iniciar sesión"

**The exact redirect URL shapes**:
- Grid: `/login?redirect=%2Ftienda`
- Detail: `/login?redirect=%2Ftienda%2F{slug}` (e.g., `%2Ftienda%2Freloj-submariner`)

**Routes that exist** (don't go hunting for ones that don't):
- `/` (home)
- `/tienda` (catalog grid)
- `/tienda/{slug}` (detail page)
- `/favoritos` (favorites list)
- `/login`, `/register`
- `/mi-cuenta`, `/mi-cuenta/pedidos`, `/mi-cuenta/pedidos/{orderId}`
- `/checkout`

**Routes that DO NOT exist** (in case you go looking):
- `/productos/{id}` — does NOT exist. Detail page is `/tienda/{slug}`. Don't waste time hunting for it.

**Network expectations** (in DevTools Network tab):
- Anonymous heart tap: NO API call (the prompt appears client-side; server is not consulted because we already know the user is anon)
- Authenticated heart tap: `PUT /api/favorites` (add) or `PUT /api/favorites` (remove — same endpoint, different payload) returning 200

**Console expectations**:
- Zero errors during the P0 tests
- React `act(...)` warnings are non-blocking (carried SUGGESTION from sdd-verify v3)