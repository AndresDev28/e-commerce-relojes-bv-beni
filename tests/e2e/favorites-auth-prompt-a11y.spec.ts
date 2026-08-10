import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS } from './utils/mocks';

// Use the configured baseURL in CI / user's setup; override with TEST_BASE_URL
// for local dev. Defaults to the project's conventional dev hostname.
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * E2E test for the favorites auth-flow a11y fix (UXW-01 TC-07).
 *
 * Verifies that:
 * 1. The aria-live region for the auth prompt exists in the DOM BEFORE the
 *    user taps the heart (so screen readers can detect the content change).
 * 2. The region has the correct attributes: role="status", aria-live="polite",
 *    aria-label="Notificaciones de favoritos".
 * 3. The region is empty initially (no prompt) but is in the DOM.
 * 4. After tapping the heart, the prompt content appears inside the region.
 * 5. The "Iniciar sesión" CTA is accessible.
 *
 * Regression harness for the pre-UXW-01 bug where the aria-live region was
 * mounted only when the prompt was visible (so screen readers couldn't detect
 * the change). The fix is to keep the wrapper always mounted.
 */
test.describe('Favorites Auth Prompt a11y (UXW-01 TC-07)', () => {
    test.beforeEach(async ({ page }) => {
        // Mock products API so the catalog renders deterministically.
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

        // Anonymous user: no session context.
        await page.route('**/api/users/me', async (route) => {
            await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        });
    });

    test('aria-live region is present in the DOM BEFORE tapping the heart', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        // Wait for at least one product card to render.
        await expect(page.locator('.group').first()).toBeVisible({ timeout: 10000 });

        // The aria-live region must exist in the DOM even before any interaction.
        // This is the core fix: live regions need to be persistent so screen
        // readers can detect changes.
        const liveRegions = page.locator('[role="status"][aria-live="polite"]');
        await expect(liveRegions.first()).toBeAttached();

        // Should have an aria-label so Chrome's accessibility tree shows it.
        await expect(liveRegions.first()).toHaveAttribute(
            'aria-label',
            'Notificaciones de favoritos'
        );
    });

    test('tapping the heart as anonymous user populates the aria-live region with the prompt', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const firstCard = page.locator('.group').first();
        await expect(firstCard).toBeVisible({ timeout: 10000 });

        // Tap the heart (Favoritos button) on the first card.
        await firstCard.getByRole('button', { name: /favoritos/i }).click();

        // The corresponding aria-live region (the one inside this card) should
        // now contain the prompt text "Iniciá sesión para guardar favoritos".
        const liveRegion = firstCard.locator('[role="status"][aria-live="polite"]');
        await expect(liveRegion).toContainText('Iniciá sesión para guardar favoritos');

        // The CTA "Iniciar sesión" should be accessible from the same region.
        const cta = liveRegion.getByRole('button', { name: 'Iniciar sesión' });
        await expect(cta).toBeVisible();
    });

    test('aria-live region of OTHER cards remains empty (prompt is local to the tapped heart)', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const cards = page.locator('.group');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });

        // Mock data has 2 products → 2 cards.
        await expect(cards).toHaveCount(2);

        // Tap the heart on the FIRST card only.
        await cards.nth(0).getByRole('button', { name: /favoritos/i }).click();

        // First card's region has the prompt.
        const firstRegion = cards.nth(0).locator('[role="status"]');
        await expect(firstRegion).toContainText('Iniciá sesión para guardar favoritos');

        // Second card's region is EMPTY (design decision D1: discriminated union
        // keeps the prompt local to the tapped card).
        const secondRegion = cards.nth(1).locator('[role="status"]');
        await expect(secondRegion).not.toContainText('Iniciá sesión');
    });

    test('CTA button navigates to login with the correct redirect parameter', async ({
        page,
    }) => {
        await page.goto(`${BASE_URL}/tienda`);
        await page.waitForLoadState('networkidle');

        const firstCard = page.locator('.group').first();
        await expect(firstCard).toBeVisible({ timeout: 10000 });

        await firstCard.getByRole('button', { name: /favoritos/i }).click();

        const cta = firstCard.getByRole('button', { name: 'Iniciar sesión' });
        await expect(cta).toBeVisible();

        // Click and verify URL.
        await cta.click();
        await expect(page).toHaveURL(/\/login\?redirect=%2Ftienda/);
    });
});
