# QA Test Plan — {CHANGE_TITLE}

> **Perspective**: external QA tester (no code knowledge beyond what the spec says)
> **Goal**: verify that the change delivers on its requirements and doesn't break adjacent features
> **Author**: {name}
> **Branch**: `frontend/{TICKET-ID}-{slug}` @ {commit-sha}
> **Last updated**: YYYY-MM-DD

---

## 0. Pre-flight checklist (BEFORE running tests)

Before touching any test case, confirm the environment is ready. If any of these fail, fix them first — testing on a broken environment produces misleading results.

- [ ] **Backend is running**: `cd ../e-commerce-relojes-bv-beni-api && npm run dev` (or remote Strapi URL configured in `.env`)
- [ ] **Frontend is running on this branch**: `npm run dev`. Confirm you're on the change branch (`git branch --show-current`).
- [ ] **Dependencies are fresh**: `rm -rf .next && npm ci` if you haven't run the branch before (Next.js caches are sneaky)
- [ ] **Database has data**: navigate to `http://localhost:3000/tienda` and confirm the grid renders multiple cards
- [ ] **Browser is ready**:
  - Chrome/Firefox with DevTools open (Network + Console + Accessibility tabs visible)
  - One **incognito/anonymous** profile (clean, no logged-in user)
  - One **authenticated** profile (logged in with a test user — create one at `/register` if needed)
- [ ] **Screen reader available** (optional but recommended for UX changes): macOS VoiceOver (`Cmd+F5`), NVDA on Windows, or `orca` on Linux

---

## 1. Critical scenarios (P0 — these are the bug fix itself)

### TC-01 — {Critical scenario 1}

> **Why this matters**: {one-line context for what this test proves}

- [ ] **Precondition**: {state of the system before the test}
- [ ] **Step 1**: {action}
- [ ] **Step 2**: {action}
- [ ] **Expected**:
  - {state change 1}
  - {state change 2}
- [ ] **PASS / FAIL**: _______

**Notes**: {anything the tester should watch for, or context for the next test case}

---

### TC-02 — {Critical scenario 2}

...

---

## 2. UX correctness scenarios (P1 — design decisions validation)

### TC-## — {UX scenario}

> **Why this matters**: {link to the design decision being validated}

- [ ] **Precondition**: ...
- [ ] **Step 1**: ...
- [ ] **Expected**: ...
- [ ] **PASS / FAIL**: _______

---

## 3. Edge cases (P2 — defensive checks)

### TC-## — {Edge case}

- [ ] **Precondition**: ...
- [ ] **Step 1**: ...
- [ ] **Expected**: ...
- [ ] **PASS / FAIL**: _______

---

## 4. Regression sweep (P2 — make sure nothing else broke)

Quick smoke tests on adjacent features. These don't need exhaustive coverage; just confirm nothing visibly regressed.

- [ ] TC-## — Home page (`/`) loads, hero banner renders
- [ ] TC-## — Add an item to the cart from `/tienda/{slug}` — cart icon shows count
- [ ] TC-## — Navigate to checkout as authenticated — checkout flow starts
- [ ] TC-## — Visit `/mi-cuenta` as authenticated — account dashboard loads
- [ ] TC-## — Log out from header — returns to anon state, no stale auth prompts anywhere

---

## 5. Reporting

When you finish testing, report results in this format:

```markdown
## {TICKET} QA Report

**Tester**: {name}
**Date**: YYYY-MM-DD
**Branch**: frontend/{TICKET-ID}-{slug} @ {commit-sha}
**Environment**: {local dev / staging / etc}

### Results

| TC ID | Status | Notes |
|-------|--------|-------|
| TC-01 | ✅ PASS / ❌ FAIL | {observation} |
| TC-02 | ✅ PASS / ❌ FAIL | {observation} |
| ... | ... | ... |

### Summary

- P0 results: X/Y passed
- P1 results: X/Y passed
- P2 results: X/Y passed
- Known debt confirmed: YES / NO (list which TCs)

### Blockers (if any)

{list of issues that block merge}

### Recommended action

- ✅ READY TO MERGE
- ⚠️ MERGE WITH MINOR FOLLOW-UPS (list them)
- ❌ BLOCK MERGE (list blocking issues)
```

---

## 6. Quick reference

**The exact prompt text** (if applicable):
> "{exact text}"

**The exact URL shapes** (if applicable):
- Path 1: `/exact/url?shape`
- Path 2: `/other/{param}`

**Routes that exist** (don't go hunting for ones that don't):
- `/route1`
- `/route2`

**Routes that DO NOT exist** (in case you go looking):
- `/non-existent-route` — does NOT exist. Don't waste time hunting for it.

**Network expectations** (in DevTools Network tab):
- Action 1: `{method} {endpoint}` returning `{status}`
- Action 2: `{method} {endpoint}` returning `{status}`

**Console expectations**:
- Zero errors during the P0 tests
- {list known warnings that are OK to ignore}
