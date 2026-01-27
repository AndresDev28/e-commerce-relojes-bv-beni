import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    // Configuración global de coverage (fuera de projects)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'next/',
        '.storybook/',
        '**/*.config.{js,ts}',
        '**/*.stories.{ts,tsx}',
        'src/stories/**',
        '**/*.d.ts',
      ],
    },
    projects: [
      // Proyecto 1: Tests de Storybook (existente)
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
      // Proyecto 2: Tests unitarios (existente)
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          globals: true,
          css: true,
          include: ['src/**/__tests__/**/*.{test,spec}.{js,ts,tsx}'],
        },
      },
      // Proyecto 3: Tests de integración (NUEVO)
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          setupFiles: ['./test/integration/helpers/setup.ts'],
          globals: true,
          include: ['test/integration/**/*.{test,spec}.{js,ts}'],
          testTimeout: 30000, // 30s para tests de integración
          hookTimeout: 60000, // 60s para beforeAll/afterAll
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
})
