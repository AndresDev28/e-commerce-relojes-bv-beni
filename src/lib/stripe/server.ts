import Stripe from 'stripe'

/**
 * Stripe Server-side SDK Initializer (Singleton Pattern)
 *
 * Why singleton implementation?
 * - Avoid multiple connections and instantiation across different routes
 * - Consistent configuration (API version)
 * - Safe environment variable access at runtime
 */

let stripeInstance: Stripe | null = null

/**
 * Get Stripe instance with lazy initialization
 *
 * Pattern ensures:
 * - Environment variables are read at runtime (fixes Next.js build issues)
 * - Build succeeds even without env vars
 * - Consistent Stripe API Version
 */
export function getStripeServer(): Stripe {
    if (stripeInstance) {
        return stripeInstance
    }

    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured. Check your environment variables.')
    }

    // Format validation matches env-validator.ts logic
    if (!/^sk_(test|live)_/.test(secretKey)) {
        throw new Error('Invalid STRIPE_SECRET_KEY format. Must start with sk_test_ or sk_live_.')
    }

    stripeInstance = new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover', // Consistent with project standard
        appInfo: {
            name: 'BV-Beni-Ecommerce',
            version: '0.1.0',
        },
    })

    return stripeInstance
}
