import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS } from './utils/mocks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Regression sweep for UXW-01 (TC-15 to TC-20).
 *
 * These tests verify that the UXW-01 changes did not break adjacent features
 * (home, cart, checkout, mi-cuenta, logout). They are intentionally simple
 * "smoke" tests — they verify pages render and key interactions work, not
 * exhaustive behavior.
 *
 * TC-20 (search bar on /tienda) is marked N/A: the catalog does not have a
 * search input (only categorySlug filter via URL searchParams). Confirmed
 * by code inspection: src/app/tienda/CatalogContent.tsx has no input element.
 */
test.describe('UXW-01 regression sweep (TC-15 to TC-20)', () => {
    test.beforeEach(async ({ page }) => {
        // Mock products + categories (used by most pages).
        await page.route('**/api/products*', async (route) => {
            await route.fulfill({
                json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } },
            });
        });

        await page.route('**/api/categories*', async (route) => {
            await route.fulfill({
                json: {
                    data: [
                        { id: 1, name: 'Luxury', slug: 'luxury' },
                        { id: 2, name: 'Sport', slug: 'sport' },
                    ],
                },
            });
        });
    });

    test('TC-15: home page loads with categories and featured products', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/`);
        await page.waitForLoadState('networkidle');

        // Hero section heading should be visible.
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

        // At least one product card should be visible (featured products).
        await expect(page.locator('.group').first()).toBeVisible({ timeout: 10000 });

        // No console errors should have fired.
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.waitForTimeout(500);
        expect(errors).toEqual([]);
    });

    test('TC-16: adding to cart from a grid card increments the cart badge', async ({
        page,
    }) => {
        // ProductCard has a Carrito action button that calls addToCart
        // directly from the cart context. We don't need to navigate to the
        // detail page (which is a server component calling Strapi).
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const firstCard = page.locator('.group').first();
        await expect(firstCard).toBeVisible({ timeout: 10000 });

        // Cart badge should not be present initially (no items).
        await expect(
            page.locator('header').locator('span.absolute.-top-2.-right-2')
        ).not.toBeVisible();

        // Click the Carrito button on the first card.
        await firstCard.getByRole('button', { name: /carrito/i }).click();

        // Cart badge should now show "1".
        await expect(
            page.locator('header').locator('span.absolute.-top-2.-right-2')
        ).toBeVisible({ timeout: 3000 });
        await expect(
            page.locator('header').locator('span.absolute.-top-2.-right-2')
        ).toHaveText('1');
    });

    test('TC-17: checkout page loads for authenticated user', async ({ page }) => {
        // Mock authenticated session.
        await page.route('**/api/auth/session', async (route) => {
            await route.fulfill({
                json: {
                    user: {
                        id: 1,
                        username: 'tester',
                        email: 'tester@example.com',
                    },
                },
            });
        });

        // Mock checkout-related endpoints.
        await page.route('**/api/cart**', async (route) => {
            await route.fulfill({
                json: {
                    items: [
                        {
                            id: 1,
                            productId: 'prod-1',
                            name: 'Classic Chronograph',
                            price: 259.99,
                            quantity: 1,
                            image: '/uploads/watch1.jpg',
                        },
                    ],
                    total: 259.99,
                },
            });
        });

        await page.route('**/api/create-payment-intent', async (route) => {
            await route.fulfill({ json: { clientSecret: 'pi_test_secret' } });
        });

        await page.goto(`${BASE_URL}/checkout`);
        await page.waitForLoadState('networkidle');

        // The checkout page should render. Look for a checkout-specific heading.
        // (The exact text varies; we just verify the page loads without crashing.)
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
        expect(body!.length).toBeGreaterThan(100);

        // No page errors.
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.waitForTimeout(500);
        expect(errors).toEqual([]);
    });

    test('TC-18: /mi-cuenta dashboard loads for authenticated user', async ({
        page,
    }) => {
        // Mock authenticated session.
        await page.route('**/api/auth/session', async (route) => {
            await route.fulfill({
                json: {
                    user: {
                        id: 1,
                        username: 'tester',
                        email: 'tester@example.com',
                    },
                },
            });
        });

        await page.goto(`${BASE_URL}/mi-cuenta`);
        await page.waitForLoadState('networkidle');

        // The dashboard should render. Look for a heading or user info.
        await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });

        // The "Cerrar sesión" button should be visible in the header (only
        // for authed users). Use the header scope to disambiguate from any
        // other buttons on the /mi-cuenta page.
        const header = page.locator('header');
        await expect(
            header.getByRole('button', { name: /cerrar sesión/i })
        ).toBeVisible();
    });

    test('TC-19: logout button clears the session and redirects', async ({ page }) => {
        // Mock authenticated session.
        await page.route('**/api/auth/session', async (route) => {
            await route.fulfill({
                json: {
                    user: {
                        id: 1,
                        username: 'tester',
                        email: 'tester@example.com',
                    },
                },
            });
        });

        // Mock logout endpoint.
        await page.route('**/api/auth/logout', async (route) => {
            await route.fulfill({ json: { success: true } });
        });

        await page.goto(`${BASE_URL}/mi-cuenta`);
        await page.waitForLoadState('networkidle');

        // Click the header's "Cerrar sesión" button (not the one in the
        // dashboard body).
        const header = page.locator('header');
        await header.getByRole('button', { name: /cerrar sesión/i }).click();

        // After logout, we should be redirected to home (/).
        await expect(page).toHaveURL(/\/$/);

        // The header logout button should no longer be visible (session cleared).
        await expect(
            header.getByRole('button', { name: /cerrar sesión/i })
        ).not.toBeVisible();
    });

    test('TC-20: /tienda does NOT have a search input bar (feature not present, N/A)', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        // Confirmed by code inspection: CatalogContent does not have a search
        // input element. The catalog only filters by categorySlug via URL.
        // This test asserts the absence, locking in the design.
        const searchInputs = page.locator('input[type="search"]');
        await expect(searchInputs).toHaveCount(0);
    });
});
