/**
 * Tests para configuración de Stripe
 *
 * [PAY-01] Instalar y configurar Stripe SDK
 * Ticket: AND-10
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Stripe } from '@stripe/stripe-js'

// Mock de loadStripe ANTES de importar los módulos
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => {
    // Crear un mock simple de Stripe
    const mockStripe: Partial<Stripe> = {
      _apiKey: 'pk_test_mock',
    }
    return Promise.resolve(mockStripe as Stripe)
  }),
}))

// Importar DESPUÉS del mock
import {
  getStripePublishableKey,
  isTestMode,
  getStripeEnvironment,
} from '@/lib/stripe/config'
import {
  getStripe,
  resetStripeInstance,
  isStripeLoaded,
} from '@/lib/stripe/client'

describe('[PAY-01] Stripe Configuration', () => {
  // Limpiar después de cada test
  afterEach(() => {
    vi.unstubAllEnvs()
    resetStripeInstance()
  })

  describe('Stripe Publishable Key', () => {
    /**
     * Test 1: Verificar que la clave pública existe
     */
    it('should have a publishable key defined', () => {
      // ARRANGE
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')

      // ACT
      const publishableKey = getStripePublishableKey()

      // ASSERT
      expect(publishableKey).toBeDefined()
      expect(publishableKey).toMatch(/^pk_(test|live)_/)
    })

    /**
     * Test 2: La clave debe ser de test en desarrollo
     */
    it('should use test key in development environment', () => {
      // ARRANGE
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')

      // ACT
      const key = getStripePublishableKey()

      // ASSERT
      expect(key).toMatch(/^pk_test_/)
    })

    /**
     * Test 3: Lanzar error si no hay clave configurada
     */
    it('should throw error if publishable key is not configured', () => {
      // ARRANGE
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', undefined)

      // ACT & ASSERT
      expect(() => {
        getStripePublishableKey()
      }).toThrow('Stripe publishable key is not configured')
    })

    /**
     * Test 4: Validar formato de clave pública
     */
    it('should validate publishable key format', () => {
      // ARRANGE
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'invalid_key_123')

      // ACT & ASSERT
      expect(() => {
        getStripePublishableKey()
      }).toThrow(/Invalid Stripe publishable key format/)
    })
  })

  describe('Stripe Client Initialization', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')
    })

    /**
     * Test 5: Crear instancia de Stripe correctamente
     */
    it('should create Stripe instance with correct key', async () => {
      // ACT
      const stripe = await getStripe()

      // ASSERT
      expect(stripe).toBeDefined()
      expect(stripe).not.toBeNull()
    })

    /**
     * Test 6: Reutilizar la misma instancia (Singleton)
     */
    it('should return the same Stripe instance on multiple calls', async () => {
      // ACT
      const stripe1 = await getStripe()
      const stripe2 = await getStripe()

      // ASSERT
      expect(stripe1).toBe(stripe2)
    })

    /**
     * Test 7: isStripeLoaded verifica correctamente
     */
    it('should verify if Stripe is loaded', async () => {
      // ARRANGE
      resetStripeInstance()

      // ACT & ASSERT: Antes de cargar
      let loaded = await isStripeLoaded()
      expect(loaded).toBe(false)

      // Cargar Stripe
      await getStripe()

      // ACT & ASSERT: Después de cargar
      loaded = await isStripeLoaded()
      expect(loaded).toBe(true)
    })
  })

  describe('Test Mode Detection', () => {
    /**
     * Test 8: Detectar modo test correctamente
     */
    it('should detect test mode from test key', () => {
      // ARRANGE
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123456789')

      // ACT
      const testMode = isTestMode()
      const environment = getStripeEnvironment()

      // ASSERT
      expect(testMode).toBe(true)
      expect(environment).toBe('test')
    })

    /**
     * Test 9: Detectar modo live correctamente
     *
     * Nota: En desarrollo, solo permitimos claves de test
     * Este test verifica que la FUNCIÓN detecta correctamente,
     * pero el getStripePublishableKey() lanzaría error en dev real
     */
    it('should detect live mode from live key', () => {
      // ARRANGE: Simular entorno de producción
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_live_123456789')

      // ACT
      const testMode = isTestMode()
      const environment = getStripeEnvironment()

      // ASSERT
      expect(testMode).toBe(false)
      expect(environment).toBe('live')
    })
  })

  describe('Security', () => {
    /**
     * Test 10: No exponer clave secreta
     */
    it('should not expose secret key in client-side code', async () => {
      // ARRANGE & ACT
      const configModule = await import('@/lib/stripe/config')

      // ASSERT
      expect(configModule).not.toHaveProperty('getStripeSecretKey')
      expect(configModule).not.toHaveProperty('secretKey')
    })
  })
})

/**
 * ============================================
 * CAMBIOS REALIZADOS:
 * ============================================
 *
 * 1. ✅ Agregado vi.mock('@stripe/stripe-js')
 *    - Evita llamadas HTTP reales
 *    - Previene timeouts
 *
 * 2. ✅ Test 9 fijado con NODE_ENV='production'
 *    - En dev solo permite pk_test_
 *    - En prod permite pk_live_
 *
 * 3. ✅ Mock colocado ANTES de imports
 *    - Critical: vi.mock debe ir primero
 *
 * 4. ✅ Todos los tests deberían pasar ahora
 */
