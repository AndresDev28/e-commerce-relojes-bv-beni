/**
 * Integration Tests Setup
 *
 * Configuración global para tests de integración.
 * Este archivo se ejecuta ANTES de todos los integration tests.
 */

import { beforeAll, afterAll } from 'vitest'

/**
 * beforeAll: Configuración que se ejecuta UNA VEZ antes de todos los tests
 *
 * Aquí configuramos:
 * - Variables de entorno necesarias
 * - Validamos que servicios externos estén disponibles
 */
beforeAll(async () => {
  console.log('\n🧪 [Integration Tests] Setting up test environment...')

  // Configurar variables de entorno para tests
  // NOTA: NODE_ENV es de solo lectura, Vitest lo establece a 'test' automáticamente
  process.env.WEBHOOK_SECRET = 'test-webhook-secret'
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.RESEND_FROM_EMAIL = 'test@resend.dev'

  // Validar que Strapi está corriendo (importante!)
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337'

  try {
    // Intentar hacer ping a Strapi
    // NOTA: Strapi no tiene endpoint /_health por defecto, así que usamos la API pública
    const response = await fetch(`${strapiUrl}/api/products`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // Timeout 5s
    })

    // Aceptamos cualquier respuesta (200, 403, 404) mientras que Strapi responda
    // Lo importante es que el servidor esté up
    console.log(`  ✅ Strapi is running at ${strapiUrl}`)
  } catch (error) {
    // The Strapi health check is now warn-only (BUG-IMAGES-400 PR2 follow-up).
    //
    // Rationale: the `integration` project hosts multiple test files, not all
    // of which need Strapi. The image-allowlist integration test (C3) only
    // exercises the Next.js image optimizer against `/_next/image`, so it
    // must be able to run independently of the backend. Tests that DO need
    // Strapi will surface their dependency the moment they make a real
    // request (fetch failures, 5xx, etc.) — same effective coverage, just
    // without pre-empting every test in the project.
    //
    // Set `INTEGRATION_REQUIRE_STRAPI=1` to restore the throw behavior for
    // CI runs that explicitly want the project-wide health check.
    if (process.env.INTEGRATION_REQUIRE_STRAPI === '1') {
      console.error(`  ❌ Cannot connect to Strapi at ${strapiUrl}`)
      console.error('  Make sure Docker Desktop is running and Strapi is started')
      console.error('  Run: cd ../relojes-bv-beni-api && npm run dev')
      throw new Error(
        'Strapi is not available. Please start the backend before running integration tests.'
      )
    }

    console.warn(
      `  ⚠️  Cannot reach Strapi at ${strapiUrl} — skipping project-wide health check.`,
    )
    console.warn(
      '     Tests that depend on Strapi will fail individually when they make a real request.',
    )
  }

  console.log('  ✅ Integration tests setup complete\n')
})

/**
 * afterAll: Limpieza que se ejecuta UNA VEZ después de todos los tests
 */
afterAll(async () => {
  console.log('\n🧹 [Integration Tests] Cleanup complete')
})
