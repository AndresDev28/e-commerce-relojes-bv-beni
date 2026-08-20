
import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_ORDER, MOCK_USER } from './utils/mocks';

test.describe('Checkout Happy Path', () => {
    test.beforeEach(async ({ page }) => {
        // Mocking API calls to Strapi
        await page.route('**/api/products*', async (route) => {
            await route.fulfill({ json: { data: MOCK_PRODUCTS, meta: { pagination: { total: 2 } } } });
        });

        await page.route('**/api/categories*', async (route) => {
            await route.fulfill({ json: { data: [{ id: 1, name: 'Luxury', slug: 'luxury' }] } });
        });

        // Session is conditional on the bv_session cookie, mirroring the real
        // route: anonymous before login, authenticated after.
        await page.route('**/api/auth/session', async (route) => {
            const cookie = route.request().headers()['cookie'] || '';
            if (cookie.includes('bv_session=')) {
                await route.fulfill({ json: { user: MOCK_USER } });
            } else {
                await route.fulfill({ json: { user: null } });
            }
        });

        // Login must emit the cookie explicitly; route.fulfill() does not set one.
        await page.route('**/api/auth/login', async (route) => {
            await route.fulfill({
                status: 200,
                headers: { 'Set-Cookie': 'bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax' },
                json: { user: MOCK_USER },
            });
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

        // Tras login vuelve al destino de ?redirect (/carrito)
        await expect(page).toHaveURL(/.*\/carrito/, { timeout: 15000 });

        // Recarga dura: verifica que la cookie de sesion sobrevive la navegacion
        await page.goto('/carrito');
        await expect(page.locator('text=Classic Chronograph')).toBeVisible();

        // 5. Continuar con el pago
        await page.click('text=Continuar con el pago');
        await expect(page).toHaveURL(/.*\/checkout/);

        // 6. Validar llegada a checkout
        await expect(page.locator('text=Resumen del pedido')).toBeVisible();
    });
});
