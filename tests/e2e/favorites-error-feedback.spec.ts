import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS } from './utils/mocks';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * E2E test for TC-14: error feedback when the favorites API fails.
 *
 * QA tester reported: "Después de cerrar Strapi al clicar en icno de favorito
 * no hace nada, no rompe nada pero no aparece ningún error". The root cause
 * is that FavoritesContext captures the error in state but ProductCard /
 * ProductDetailClient never read it, so the error was silently swallowed.
 *
 * The fix: display an ErrorMessage (role="alert", aria-live="assertive")
 * inside the product card when the API fails. This test mocks the API to
 * fail so the test can be deterministic without actually stopping Strapi.
 */
test.describe('Favorites error feedback when API fails (UXW-01 TC-14)', () => {
    test('shows an error message when PUT /api/favorites fails, then clears on retry', async ({
        page,
    }) => {
        // Mock user as authenticated.
        let callCount = 0;
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

        // Mock the PUT /api/favorites to fail on the first call, succeed on
        // the second. This simulates "Strapi goes down briefly then recovers".
        await page.route('**/api/favorites', async (route) => {
            if (route.request().method() === 'PUT') {
                callCount++;
                if (callCount === 1) {
                    // First attempt: server error (simulates Strapi down).
                    await route.fulfill({
                        status: 503,
                        json: { error: 'Service Unavailable' },
                    });
                } else {
                    // Second attempt: success.
                    await route.fulfill({ json: { success: true } });
                }
            } else {
                // GET: empty favorites list.
                await route.fulfill({ json: { favorites: [] } });
            }
        });

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

        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const firstCard = page.locator('.group').first();
        await expect(firstCard).toBeVisible({ timeout: 10000 });

        // Tap the heart — this triggers the failing PUT.
        await firstCard.getByRole('button', { name: /favoritos/i }).click();

        // The error message should appear inside the card.
        const errorAlert = firstCard.getByRole('alert');
        await expect(errorAlert).toBeVisible({ timeout: 5000 });
        await expect(errorAlert).toContainText(/no se pudieron actualizar tus favoritos/i);

        // The error should be marked as alert/assertive for screen readers.
        await expect(errorAlert).toHaveAttribute('aria-live', 'assertive');

        // The user can retry — click the heart again. This should clear the
        // error and the second PUT succeeds.
        await firstCard.getByRole('button', { name: /favoritos/i }).click();

        // The error should disappear (error clears on next successful mutation).
        await expect(firstCard.getByRole('alert')).not.toBeVisible();

        // Two PUTs were made total (one failed, one succeeded).
        expect(callCount).toBe(2);
    });

    test('error message has a dismiss button that closes the error', async ({ page }) => {
        // Mock user as authenticated.
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

        // Mock PUT to always fail.
        await page.route('**/api/favorites', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 503,
                    json: { error: 'Service Unavailable' },
                });
            } else {
                await route.fulfill({ json: { favorites: [] } });
            }
        });

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

        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const firstCard = page.locator('.group').first();
        await expect(firstCard).toBeVisible({ timeout: 10000 });

        await firstCard.getByRole('button', { name: /favoritos/i }).click();

        const errorAlert = firstCard.getByRole('alert');
        await expect(errorAlert).toBeVisible({ timeout: 5000 });

        // Click the dismiss (X) button.
        await firstCard.getByRole('button', { name: /cerrar mensaje/i }).click();

        // The error should disappear.
        await expect(errorAlert).not.toBeVisible();
    });
});
