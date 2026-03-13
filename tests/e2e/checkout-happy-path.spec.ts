
import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_AUTH_RESPONSE, MOCK_ORDER, MOCK_USER } from './utils/mocks';

test.describe('Checkout Happy Path', () => {
    test.beforeEach(async ({ page }) => {
        // Mocking API calls to Strapi
        await page.route('**/api/products*', async (route) => {
            await route.fulfill({ json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } } });
        });

        await page.route('**/api/categories*', async (route) => {
            await route.fulfill({ json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] } });
        });

        await page.route('**/api/users/me', async (route) => {
            if (route.request().headers()['authorization']) {
                await route.fulfill({ json: MOCK_USER });
            } else {
                await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
            }
        });

        await page.route('**/api/auth/local', async (route) => {
            await route.fulfill({ json: MOCK_AUTH_RESPONSE });
        });

        await page.route('**/api/orders', async (route) => {
            await route.fulfill({ json: { data: MOCK_ORDER } });
        });

        await page.route('**/api/create-payment-intent', async (route) => {
            await route.fulfill({ json: { clientSecret: 'pi_mock_123_secret_mock' } });
        });
    });

    test('Should complete purchase successfully', async ({ page }) => {
        // 1. Navegar al catálogo
        await page.goto('/tienda');
        await page.waitForLoadState('networkidle');

        const productCard = page.locator('.group').filter({ hasText: 'Classic Chronograph' });
        await expect(productCard).toBeVisible({ timeout: 10000 });

        // 2. Añadir al carrito
        await productCard.getByRole('button', { name: /carrito/i }).first().click();

        // 3. Ir a la cesta (redirige a login si no hay sesión)
        await page.locator('header a[href="/carrito"]').click();

        // Esperamos llegar a /login directamente o a través de /carrito
        await expect(page).toHaveURL(/.*\/(carrito|login)/);
        if (page.url().includes('/login')) {
            console.log('Redirected to login as expected');
        } else {
            // Si por alguna razón no redirigió instantáneamente, forzamos espera a /login
            await expect(page).toHaveURL(/.*\/login/);
        }

        // 4. Iniciar Sesión
        await page.fill('input[id="Identifier"]', 'jdoe@example.com');
        await page.fill('input[id="password"]', 'password133');
        await page.click('button:has-text("Iniciar sesión")');

        // Tras login redirige a /mi-cuenta
        await expect(page).toHaveURL(/.*\/mi-cuenta/, { timeout: 15000 });

        // Volver al carrito
        await page.goto('/carrito');
        await expect(page.locator('text=Classic Chronograph')).toBeVisible();

        // 5. Continuar con el pago
        await page.click('text=Continuar con el pago');
        await expect(page).toHaveURL(/.*\/checkout/);

        // 6. Validar llegada a checkout
        await expect(page.locator('text=Resumen del pedido')).toBeVisible();
    });
});
