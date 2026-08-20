# Delta for Test-Infra Cookie-Session

## Purpose

Codify test-infra requirements for closing the 14 legacy-auth e2e failure events (C3 class, #1608). Test-infra only — production byte-identical — but specs MUST use cookie-session mock conventions and preserve all existing invariants.

## ADDED Requirements

### Requirement: Legacy-auth e2e mocks use cookie-session pattern

E2e specs MUST mock the modern cookie-session endpoints (`/api/auth/session`, `/api/auth/login`). They MUST NOT mock legacy Strapi-direct endpoints (`/api/users/me`, `/api/auth/local`) or write `localStorage.setItem('jwt', token)`.

#### Scenario: Bucket A swap closes C3 events

- GIVEN `cancellation-flow.spec.ts`, `empty-states.spec.ts`, `order-tracking.spec.ts` failed 8 C3 events
- WHEN swapped to `/api/auth/session`
- THEN those specs pass on chromium AND firefox

#### Scenario: Bucket A' payment-errors test 2 unroutes session

- GIVEN test 2 cleared `localStorage.jwt` to simulate anonymous state
- WHEN replaced with `page.unroute('**/api/auth/session')`
- THEN the real route returns `{ user: null }` and test 2 passes on both browsers

#### Scenario: Bucket B checkout mocks login AND session

- GIVEN `checkout-happy-path.spec.ts` and `checkout-mobile.spec.ts` failed 4 C3 events
- WHEN both `/api/auth/login` AND `/api/auth/session` are mocked
- THEN both specs pass on both browsers (route.fulfill does not emit Set-Cookie)

### Requirement: Vitest and Storybook invariants preserved

The vitest suite MUST remain at 949/949 passing. The Storybook project MUST remain at 20/20 passing.

#### Scenario: Vitest unit/integration gate

- WHEN `npx vitest run --maxWorkers=2` runs
- THEN 949/949 tests pass

#### Scenario: Storybook project gate

- WHEN `npx vitest run --maxWorkers=2 --project storybook` runs
- THEN 20/20 tests pass

### Requirement: Capability delta is zero

Production code MUST remain byte-identical. No new env vars, runtime flags, or external machinery.

#### Scenario: Production diff is empty

- WHEN `git diff main -- 'src/' 'next.config.*' 'middleware.*' 'package.json'` is inspected
- THEN the diff is empty

#### Scenario: No new config or flags

- WHEN `.env*`, `playwright.config.ts`, `vitest.config.ts` are inspected
- THEN no new env vars, CLI flags, or test machinery appear

### Requirement: Out-of-scope specs are not touched

`favorites-auth-prompt-a11y.spec.ts` and `favorites-anonymous-access.spec.ts` MUST NOT be modified. Their inert `/api/users/me → 401` mocks remain valid (favorites feature reads from `/api/auth/session`).

#### Scenario: X-bucket specs unchanged

- WHEN the PR is opened
- THEN those files show zero diff against main

### Requirement: Bucket B mocks cover both login and session routes

Checkout specs that exercise the login form MUST mock BOTH `/api/auth/login` (the POST) AND `/api/auth/session` (the GET after submit; `route.fulfill({ json })` does not emit `Set-Cookie`).

#### Scenario: Login-only mock fails post-login session check

- GIVEN only `/api/auth/login` is mocked
- WHEN the form submits
- THEN the spec fails on the post-login session check

#### Scenario: Both mocks make checkout pass

- GIVEN both endpoints are mocked with the `MOCK_USER` payload
- WHEN the form submits and the session check fires
- THEN both checkout specs pass on chromium AND firefox

### Requirement: Quality gates exit cleanly

`npx tsc --noEmit`, `npm run lint`, and the sdd-verify verdict MUST all succeed without warnings.

#### Scenario: All quality gates pass

- WHEN `npx tsc --noEmit`, `npm run lint`, and sdd-verify run
- THEN all three exit with status 0 and the verify verdict is `PASS` (not `pass_with_warnings`)

### Requirement: uxw01 chromium flake is documented but out of scope

The uxw01 TC-15 chromium-only `networkidle` timeout (1 baseline deviation event) MUST be named `BUG-E2E-UXW01-CHROMIUM-FLAKE` and excluded from this change's acceptance criteria.

#### Scenario: Flake is documented and excluded

- GIVEN the explore baseline surfaced 43/15 (1 extra event from 44/14)
- WHEN the proposal and verify-report are written
- THEN the chromium-only flake is referenced as `BUG-E2E-UXW01-CHROMIUM-FLAKE`
- AND it does not count against the 14-event closure target
