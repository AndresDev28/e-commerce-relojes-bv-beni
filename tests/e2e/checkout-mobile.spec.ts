
import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_AUTH_RESPONSE, MOCK_USER } from './utils/mocks';

// Usamos viewport de móvil sobre Chromium para evitar dependencias de WebKit en este entorno
test.use({
    viewport: { width: 390, height: 844 }, // iPhone 13 size
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
});

test.describe('Mobile Checkout Flow', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        // Pre-aceptar cookies para evitar intercepciones
        await page.addInitScript(() => {
            window.localStorage.setItem('bv-beni-cookie-consent', JSON.stringify({ essential: true, analytics: true }));
        });

        // Mocking API calls
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

        await page.route('**/api/create-payment-intent', async (route) => {
            await route.fulfill({ json: { clientSecret: 'pi_mock_mobile_secret' } });
        });
    });

    test('Should be able to add to cart and start checkout on mobile', async ({ page }) => {
        // 1. Navegar a la tienda
        await page.goto('/tienda');
        await page.waitForLoadState('load');

        await expect(page.locator('h2').first()).toContainText('Todos los relojes');

        // 2. Añadir al carrito desde la tarjeta
        const firstProduct = page.locator('.group').filter({ hasText: 'Classic Chronograph' }).first();
        await expect(firstProduct).toBeVisible();
        await firstProduct.getByRole('button', { name: /carrito/i }).click();

        // 3. Ir al carrito usando el icono del navbar
        await page.locator('header a[href="/carrito"]').click();

        // 4. Iniciar Sesión (redirigido)
        await expect(page).toHaveURL(/.*\/login/);

        // Esperar a que el formulario sea visible
        const loginBtn = page.locator('button:has-text("Iniciar sesión")');
        await expect(loginBtn).toBeVisible({ timeout: 15000 });

        await page.fill('input[id="Identifier"]', 'jdoe@example.com');
        await page.fill('input[id="password"]', 'password111');
        await loginBtn.click();

        // 5. Volver al carrito tras login (que redirige a mi-cuenta)
        await expect(page).toHaveURL(/.*\/mi-cuenta/, { timeout: 20000 });
        await page.goto('/carrito');

        // 6. Checkout
        await page.waitForSelector('text=Continuar con el pago', { state: 'visible' });
        await page.click('text=Continuar con el pago');
        await expect(page).toHaveURL(/.*\/checkout/);
        await expect(page.locator('text=Resumen del pedido')).toBeVisible();
    });
});
