import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS } from './utils/mocks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * E2E test for TC-11: anonymous user navigates directly to /favoritos and
 * should see the empty state (NOT be redirected to home).
 *
 * The /favoritos route had a layout.tsx wrapping with <ProtectedRoute> which
 * redirected anonymous users to '/' (home). The page itself already handles
 * the anonymous case with a friendly empty state ("Aún no tienes favoritos"),
 * so the redirect was unnecessary and broke the UX.
 *
 * This test locks in the regression: anonymous users should stay on /favoritos
 * and see the empty state that encourages them to log in or explore.
 */
test.describe('Favorites Page accessibility for anonymous users (UXW-01 TC-11)', () => {
    test.beforeEach(async ({ page }) => {
        // Mock products API (page may indirectly need it).
        await page.route('**/api/products*', async (route) => {
            await route.fulfill({
                json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } },
            });
        });

        await page.route('**/api/categories*', async (route) => {
            await route.fulfill({
                json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] },
            });
        });

        // Anonymous user: /api/users/me returns 401.
        await page.route('**/api/users/me', async (route) => {
            await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        });

        // /api/favorites returns 401 for anonymous (consistent with no auth).
        await page.route('**/api/favorites*', async (route) => {
            await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        });
    });

    test('anonymous user navigating directly to /favoritos sees the empty state (no redirect)', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/favoritos`);
        await page.waitForLoadState('networkidle');

        // We should stay on /favoritos, NOT be redirected to home.
        await expect(page).toHaveURL(/\/favoritos$/);

        // The empty state should be visible.
        await expect(
            page.getByRole('heading', { name: /aún no tienes favoritos/i })
        ).toBeVisible({ timeout: 5000 });

        // The encouraging CTA should be visible.
        await expect(
            page.getByRole('button', { name: /explorar relojes/i })
        ).toBeVisible();
    });

    test('anonymous user can click "Explorar Relojes" from empty state and reach /tienda', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/favoritos`);
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/\/favoritos$/);

        const cta = page.getByRole('button', { name: /explorar relojes/i });
        await expect(cta).toBeVisible();
        await cta.click();

        await expect(page).toHaveURL(/\/tienda/);
    });
});
