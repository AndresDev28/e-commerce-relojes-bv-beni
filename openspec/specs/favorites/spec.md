# Favorites Specification

## Purpose

Define the favorite-interaction contract: anonymous vs. authenticated heart behavior, sign-in feedback, and the server authorization contract.

## Requirements

### Requirement: Anonymous Favorite Action Surfaces Visible Feedback

When an anonymous user activates any favorite mutation (`addToFavorites`, `removeFromFavorites`, `clearFavorites`), the system MUST surface visible feedback explaining that sign-in is required. The feedback MUST NOT be silent and MUST expose a sign-in action. It MUST use non-alert accessibility semantics (`role="status"`, `aria-live="polite"`) — not `role="alert"`.

#### Scenario: Heart tap on grid

- GIVEN an unauthenticated visitor is on `/tienda`
- WHEN the user activates the heart on a product card
- THEN a visible prompt appears explaining that sign-in is required
- AND the prompt exposes a navigation action to `/login`

#### Scenario: Heart tap on detail page

- GIVEN an unauthenticated visitor is on `/tienda/{slug}`
- WHEN the user activates the heart
- THEN the prompt appears next to the heart and no API call is sent

### Requirement: Login Redirect Preserves Origin

When the anonymous user accepts the sign-in action, the system MUST navigate to `/login?redirect={currentPath}`. The `currentPath` MUST be the path active when the heart was tapped.

#### Scenario: Sign-in from grid vs detail

- GIVEN an unauthenticated user on `/tienda` or `/tienda/{slug}`
- WHEN the user accepts the sign-in action
- THEN the browser navigates to `/login?redirect={currentPath}` matching that location

### Requirement: Authenticated Favorite Mutation Persists

When an authenticated user activates a favorite mutation, the system MUST persist the change via `/api/favorites` and update local state. Adding a non-favorited product MUST add it; removing a favorited product MUST remove it. `clearFavorites` MUST empty the server list.

#### Scenario: Authed user adds a product

- GIVEN an authenticated user with empty favorites
- WHEN the user taps the heart on a product card
- THEN the product appears at the top of the favorites list
- AND a `PUT /api/favorites` request is sent with the updated list

#### Scenario: Authed user removes a favorited product

- GIVEN an authenticated user with the product already favorited
- WHEN the user taps the heart
- THEN the product is removed locally and a `PUT /api/favorites` request is sent

#### Scenario: Re-tap is a no-op

- GIVEN an authenticated user with the product already favorited
- WHEN the user taps the heart via the add path again
- THEN no duplicate is appended and no redundant PUT is sent

### Requirement: `isFavorite` Contract for Anonymous Users

`isFavorite(productId)` MUST return `false` for any product ID when the user is unauthenticated. It MUST NOT throw and MUST NOT return `undefined`. The favorites list state MUST be `[]` for anonymous users.

#### Scenario: Anonymous and empty-list authed reads

- GIVEN an unauthenticated user OR an authed user with empty favorites
- WHEN `isFavorite('any-product-id')` is called
- THEN it returns `false`

### Requirement: Server Authorization Contract

The `/api/favorites` endpoint MUST reject unauthenticated mutation requests with a 401 response and MUST NOT mutate server state. This contract is independent of client behavior.

#### Scenario: Unauthenticated PUT

- GIVEN no valid session cookie is present
- WHEN a PUT request is sent to `/api/favorites`
- THEN the response status is 401 and the favorites list is not modified

#### Scenario: Authenticated PUT

- GIVEN a valid session cookie
- WHEN a PUT request is sent with a valid list
- THEN the response status is 200 and the list is persisted

### Requirement: Test Coverage for Favorites

`FavoritesContext`, the `useFavorites` hook, and `FavoriteItemRow` MUST have automated test coverage for both authenticated and anonymous paths. Anonymous-path tests MUST assert visible feedback (no silent return). The suite MUST run with `npx vitest run --maxWorkers=2`.

#### Scenario: Context, hook, and row tests cover both states

- GIVEN the test suite executes
- WHEN the three test files are collected
- THEN each covers both paths
- AND the anonymous-path tests assert visible feedback (not silent return)
