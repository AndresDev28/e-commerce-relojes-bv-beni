import { defineConfig, devices } from '@playwright/test';

/**
 * Select the Next.js web server command based on environment.
 *
 * - CI runs (process.env.CI truthy): boot the production server with
 *   `npm run start` against the pre-built `.next/` directory that the CI
 *   job produces via `npm run build`. This avoids the fresh-first-compile
 *   and dev-bootstrap flake modes observed on the e2e lane (F7).
 * - Local runs: continue to use `npm run dev` so the developer ergonomics
 *   stay unchanged.
 */
const nextServerCommand = process.env.CI ? 'npm run start' : 'npm run dev';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',

        /* Take screenshots on failure */
        screenshot: 'only-on-failure',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

        /*
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        */

        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
    ],

    /* Run Next.js and the Strapi mock before starting the tests.
       - The Next.js entry uses `nextServerCommand` (declared at module
         top) so CI boots the production server against the pre-built
         `.next/` while local runs stay on the dev server.
       - The mock listens on the standard Strapi port (:1337) so the dev
         CSP connect-src whitelist and the .env.local
         NEXT_PUBLIC_STRAPI_API_URL default keep working — no env
         overrides are needed. Readiness for the Next entry is checked
         against a static asset because `/` returns a 500 while Strapi is
         unreachable (server-side fetch fails). */
    webServer: [
        {
            command: nextServerCommand,
            url: 'http://localhost:3000/favicon.svg',
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
        {
            command: 'MOCK_STRAPI_PORT=1337 node tests/e2e/mock-strapi-server.mjs',
            url: 'http://localhost:1337/health',
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
        },
    ],
});
