# Login Redirect Specification

## Purpose

Define the post-authentication navigation policy: how the system consumes `?redirect=` on the sign-in and sign-up pages, enforces open-redirect and auth-loop defenses, and falls back to a safe default when the parameter is absent or invalid.

## Requirements

### Requirement: `sanitizeRedirect` Safe-Path Contract

The `sanitizeRedirect` utility SHALL accept a `string | null | undefined` and return a safe internal path. Input is untrusted. The function MUST be pure.

#### Scenario: Happy path

- GIVEN `sanitizeRedirect('/tienda')`
- WHEN called
- THEN it returns `'/tienda'`

#### Scenario: Missing or empty input

- GIVEN `sanitizeRedirect(null)`, `sanitizeRedirect(undefined)`, or `sanitizeRedirect('')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

### Requirement: Open-Redirect Rejection

`sanitizeRedirect` MUST reject any value that does not identify a same-origin internal path and MUST return `'/mi-cuenta'`.

#### Scenario: Protocol-relative and backslash variants

- GIVEN `sanitizeRedirect('//evil.com')`, `sanitizeRedirect('/\\evil.com')`, or `sanitizeRedirect('\\\\evil.com')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

#### Scenario: Absolute URL with scheme

- GIVEN `sanitizeRedirect('http://evil.com')` or `sanitizeRedirect('https://evil.com')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

#### Scenario: JavaScript or data URI

- GIVEN `sanitizeRedirect('javascript:alert(1)')` or `sanitizeRedirect('data:text/html,<script>...</script>')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

#### Scenario: Path without leading slash

- GIVEN `sanitizeRedirect('evil.com')` or `sanitizeRedirect('tienda')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

### Requirement: Auth-Page Loop Prevention

`sanitizeRedirect` MUST reject any value whose first path segment is `/login` or `/registro` (with or without trailing query or fragment).

#### Scenario: Loop to `/login` or `/registro`

- GIVEN `sanitizeRedirect('/login')`, `sanitizeRedirect('/login?redirect=/tienda')`, `sanitizeRedirect('/registro')`, or `sanitizeRedirect('/registro?foo=bar')`
- WHEN called
- THEN it returns `'/mi-cuenta'`

### Requirement: Query Strings and Fragments Preserved

Query strings and fragments SHALL be preserved verbatim in the sanitized output.

#### Scenario: Query string preserved

- GIVEN `sanitizeRedirect('/tienda?category=relojes')`
- WHEN called
- THEN it returns `'/tienda?category=relojes'`

#### Scenario: Fragment preserved

- GIVEN `sanitizeRedirect('/mi-cuenta/pedidos/abc#status')`
- WHEN called
- THEN it returns `'/mi-cuenta/pedidos/abc#status'`

### Requirement: `login` Accepts `redirectTo`

The `login` function SHALL accept an optional `redirectTo` parameter. After a successful sign-in, the navigation target SHALL be the sanitized value of `redirectTo` when provided, or `'/mi-cuenta'` when omitted.

#### Scenario: Login pushes sanitized redirect

- GIVEN `login(identifier, password, '/tienda')` is invoked
- WHEN the sign-in succeeds
- THEN the navigation target is `'/tienda'`

#### Scenario: Login rejects open-redirect and falls back

- GIVEN `login(identifier, password, '//evil.com')` is invoked
- WHEN the sign-in succeeds
- THEN the navigation target is `'/mi-cuenta'`

### Requirement: `register` Accepts `redirectTo` (Parity)

The `register` function SHALL accept an optional `redirectTo` with sanitization semantics identical to `login`.

#### Scenario: Register pushes sanitized redirect

- GIVEN `register(username, email, password, '/mi-cuenta/pedidos/123')` is invoked
- WHEN the sign-up succeeds
- THEN the navigation target is `'/mi-cuenta/pedidos/123'`

#### Scenario: Register falls back on missing redirect

- GIVEN `register(username, email, password)` is invoked without `redirectTo`
- WHEN the sign-up succeeds
- THEN the navigation target is `'/mi-cuenta'`

### Requirement: Sign-In Form Reads `?redirect=` and Passes It

The sign-in form SHALL read `?redirect=`, sanitize it, and pass the sanitized value as `redirectTo` to `login`. The browser navigation target after successful sign-in SHALL be the sanitized value.

#### Scenario: Round-trip from `/tienda`

- GIVEN an unauthenticated user navigates to `/login?redirect=/tienda`
- WHEN the user submits valid credentials
- THEN the browser lands on `/tienda`

#### Scenario: Round-trip from a detail page

- GIVEN an unauthenticated user navigates to `/login?redirect=/tienda/omega-iii`
- WHEN the user submits valid credentials
- THEN the browser lands on `/tienda/omega-iii`

### Requirement: Sign-Up Form Reads `?redirect=` and Passes It

The sign-up form SHALL mirror the sign-in form: read `?redirect=`, sanitize it, pass it as `redirectTo` to `register`, and navigate to the sanitized value on success.

#### Scenario: Round-trip from `/tienda`

- GIVEN an unauthenticated user navigates to `/registro?redirect=/tienda`
- WHEN the user submits a valid registration
- THEN the browser lands on `/tienda`

### Requirement: Authentication Context Is URL-Agnostic

The authentication context SHALL NOT read URL query parameters directly. Consuming `?redirect=` is the responsibility of the forms that call into the context.

#### Scenario: Context has no URL coupling

- GIVEN the authentication context is instantiated
- WHEN rendering or mutating
- THEN it does not access URL search parameters

## Test Mapping

| Test ID | Requirement | Layer | Description |
|---------|-------------|-------|-------------|
| TC-01 | Sign-In Form | playwright-e2e | `/login?redirect=/tienda` round-trip lands at `/tienda` |
| TC-02 | Sign-In Form | playwright-e2e | `/login?redirect=/tienda/{slug}` round-trip lands at detail |
| TC-03 | Open-Redirect Rejection | vitest-unit | `sanitizeRedirect('//evil.com')` returns `/mi-cuenta` |
| TC-04 | Open-Redirect Rejection | vitest-unit | `sanitizeRedirect('http://evil.com')` returns `/mi-cuenta` |
| TC-05 | Query Preservation | vitest-unit | `/tienda?category=foo` preserved; `login` pushes that target |
| TC-06 | Default Fallback | vitest-integration | Missing `redirectTo` → push to `/mi-cuenta` on login |
| TC-07 | Default Fallback | vitest-integration | Invalid `redirectTo` (scheme, loop) → push to `/mi-cuenta` |
| TC-08 | Register Parity | vitest-integration | `register()` honors sanitized `redirectTo`; falls back to `/mi-cuenta` |
| TC-09 | URL-Agnostic Context | vitest-integration | Existing AuthContext test suite stays green; no new `useSearchParams` mock |
