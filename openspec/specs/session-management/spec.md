# Session Management Specification

## Purpose

Define secure session handling using an httpOnly cookie, a server-side session endpoint, and client-side hydration of authentication state.

## Requirements

### Requirement: JWT Stored in httpOnly Cookie

The system MUST store the Strapi JWT in a scoped, httpOnly, secure, SameSite cookie. The JWT MUST NOT be accessible to JavaScript or persisted in `localStorage`.

#### Scenario: Successful login

- GIVEN a user submits valid credentials
- WHEN the auth service returns a JWT
- THEN the JWT is set in an httpOnly cookie scoped to the application domain
- AND `localStorage` contains no JWT copy

#### Scenario: JavaScript cannot read the cookie

- GIVEN the user is authenticated
- WHEN client-side code inspects `document.cookie`
- THEN the JWT value is not present

### Requirement: Session Endpoint Returns Current User

The `/api/auth/session` route MUST return the current authenticated user derived from the httpOnly cookie JWT. The route MUST return an unauthenticated response when the cookie or JWT is absent or invalid.

#### Scenario: Active session

- GIVEN a valid JWT cookie is present
- WHEN a request is made to `/api/auth/session`
- THEN the response contains the current user object

#### Scenario: Expired or missing session

- GIVEN no JWT cookie or an invalid JWT cookie is present
- WHEN a request is made to `/api/auth/session`
- THEN the response indicates the user is not authenticated
- AND the response status is appropriate for an unauthenticated caller

### Requirement: AuthContext Hydrates from Session Route

`AuthContext` MUST hydrate the authenticated user by calling `/api/auth/session`. It MUST NOT read the JWT from `localStorage` during initialization or subsequent renders.

#### Scenario: Page load with active session

- GIVEN the browser holds a valid JWT cookie
- WHEN the application initializes
- THEN `AuthContext` fetches the user from `/api/auth/session`
- AND the authenticated state reflects the returned user

#### Scenario: Page load without session

- GIVEN the browser holds no JWT cookie
- WHEN the application initializes
- THEN `AuthContext` receives an unauthenticated response
- AND the authenticated state is set to unauthenticated

### Requirement: Logout Clears Session

The system MUST provide a logout action that clears the httpOnly session cookie and resets `AuthContext` to an unauthenticated state.

#### Scenario: User logs out

- GIVEN the user is authenticated
- WHEN the logout action is invoked
- THEN the session cookie is cleared
- AND `AuthContext` reflects an unauthenticated state
