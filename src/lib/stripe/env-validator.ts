/**
 * [PAY-22] Environment Variable Validator
 * Ticket: AND-31
 *
 * This utility validates that environment variables are correctly
 * configured for each environment (development, staging, production).
 *
 * It helps prevent common mistakes like:
 * - Using live keys in development
 * - Using test keys in production
 * - Missing required environment variables
 * - Misconfigured HTTPS settings
 */

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  environment: 'development' | 'production' | 'test'
}

export interface EnvValidationIssue {
  level: 'error' | 'warning'
  message: string
  suggestion?: string
}

/**
 * Validates environment configuration for Stripe and related services
 *
 * @returns Validation result with errors and warnings
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const env = process.env.NODE_ENV || 'development'

  // ================================================================
  // 1. Validate Stripe Publishable Key
  // ================================================================
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!publishableKey) {
    errors.push(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. ' +
        'Please configure it in your .env.local file.'
    )
  } else {
    // Check for placeholder values FIRST (before format validation)
    if (publishableKey.includes('your_publishable_key_here')) {
      errors.push(
        'Stripe publishable key is still set to placeholder value. ' +
          'Get your real key from https://dashboard.stripe.com/apikeys'
      )
    } else {
      // Check format (only if not a placeholder)
      if (!/^pk_(test|live)_/.test(publishableKey)) {
        errors.push(
          `Invalid Stripe publishable key format: ${publishableKey}. ` +
            'Must start with "pk_test_" or "pk_live_".'
        )
      }

      // Check environment mismatch
      if (env === 'development' && publishableKey.startsWith('pk_live_')) {
        errors.push(
          '⚠️ DANGER: Using LIVE Stripe key in development! ' +
            'This can process real payments. Use pk_test_* keys instead.'
        )
      }

      if (env === 'production' && publishableKey.startsWith('pk_test_')) {
        errors.push(
          '⚠️ DANGER: Using TEST Stripe key in production! ' +
            'Payments will not be processed. Use pk_live_* keys instead.'
        )
      }
    }
  }

  // ================================================================
  // 2. Validate Stripe Secret Key (if accessible - only in server)
  // ================================================================
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (typeof window === 'undefined') {
    // Server-side only
    if (!secretKey) {
      warnings.push(
        'STRIPE_SECRET_KEY is not set. ' +
          'This is required for server-side payment processing.'
      )
    } else {
      // Check for placeholder values FIRST (before format validation)
      if (secretKey.includes('your_secret_key_here')) {
        errors.push(
          'Stripe secret key is still set to placeholder value. ' +
            'Get your real key from https://dashboard.stripe.com/apikeys'
        )
      } else {
        // Check format (only if not a placeholder)
        if (!/^sk_(test|live)_/.test(secretKey)) {
          errors.push(
            'Invalid Stripe secret key format. ' +
              'Must start with "sk_test_" or "sk_live_".'
          )
        }

        // Check environment mismatch
        if (env === 'development' && secretKey.startsWith('sk_live_')) {
          errors.push(
            '🚨 CRITICAL: Using LIVE Stripe secret key in development! ' +
              'This is extremely dangerous. Use sk_test_* keys instead.'
          )
        }

        if (env === 'production' && secretKey.startsWith('sk_test_')) {
          errors.push(
            '🚨 CRITICAL: Using TEST Stripe secret key in production! ' +
              'Payments will not work. Use sk_live_* keys instead.'
          )
        }

        // Check key consistency
        if (
          publishableKey &&
          !publishableKey.includes('your_publishable_key_here') &&
          ((publishableKey.startsWith('pk_test_') && secretKey.startsWith('sk_live_')) ||
            (publishableKey.startsWith('pk_live_') && secretKey.startsWith('sk_test_')))
        ) {
          errors.push(
            '⚠️ KEY MISMATCH: Publishable and secret keys are from different environments! ' +
              'Both must be test keys or both must be live keys.'
          )
        }
      }
    }
  }

  // ================================================================
  // 3. Validate NEXT_PUBLIC_ prefix usage
  // ================================================================
  // Check if someone accidentally exposed secret key with NEXT_PUBLIC_
  const publicSecretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY

  if (publicSecretKey) {
    errors.push(
      '🚨 SECURITY BREACH: STRIPE_SECRET_KEY has NEXT_PUBLIC_ prefix! ' +
        'This exposes your secret key to the browser. Remove NEXT_PUBLIC_ prefix immediately ' +
        'and rotate your keys at https://dashboard.stripe.com/apikeys'
    )
  }

  // ================================================================
  // 4. Validate API URLs
  // ================================================================
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL

  if (!strapiUrl) {
    warnings.push(
      'NEXT_PUBLIC_STRAPI_API_URL is not set. ' +
        'API calls will fail unless configured.'
    )
  } else {
    // Check HTTPS in production
    if (env === 'production' && !strapiUrl.startsWith('https://')) {
      errors.push(
        '⚠️ SECURITY: STRAPI_API_URL must use HTTPS in production. ' +
          `Current: ${strapiUrl}`
      )
    }

    // Warn about localhost in production
    if (env === 'production' && strapiUrl.includes('localhost')) {
      errors.push(
        '⚠️ CONFIG ERROR: Using localhost URL in production. ' +
          'Update NEXT_PUBLIC_STRAPI_API_URL to your production API URL.'
      )
    }
  }

  // ================================================================
  // 5. Environment-specific recommendations
  // ================================================================
  if (env === 'production') {
    // Production-specific checks
    if (!publishableKey?.startsWith('pk_live_')) {
      warnings.push(
        'Production environment should use live Stripe keys (pk_live_*).'
      )
    }
  }

  if (env === 'development') {
    // Development-specific recommendations
    if (publishableKey?.startsWith('pk_live_')) {
      warnings.push(
        'Development environment should use test Stripe keys (pk_test_*).'
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: env as 'development' | 'production' | 'test',
  }
}

/**
 * Validates and logs environment configuration issues
 * Should be called during application startup
 *
 * @param throwOnError - If true, throws an error when validation fails
 */
export function validateAndLogEnvironment(throwOnError = false): void {
  const result = validateEnvironment()

  // Log environment info
  console.log(`\n🔧 Environment: ${result.environment.toUpperCase()}`)

  // Log errors
  if (result.errors.length > 0) {
    console.error('\n❌ Environment Configuration Errors:')
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`)
    })
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Configuration Warnings:')
    result.warnings.forEach((warning, index) => {
      console.warn(`  ${index + 1}. ${warning}`)
    })
  }

  // Success message
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Environment configuration is valid!\n')
  } else if (result.valid) {
    console.log('✅ Environment configuration is valid (with warnings)\n')
  } else {
    console.error('\n❌ Environment configuration has errors!\n')
  }

  // Throw if requested
  if (throwOnError && !result.valid) {
    throw new Error(
      'Environment configuration is invalid. Please fix the errors above.'
    )
  }
}

/**
 * Gets a summary of current environment configuration
 * Useful for debugging and support
 *
 * @returns Safe summary (no secret values)
 */
export function getEnvironmentSummary(): Record<string, string | boolean> {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'not set'
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'not set'
  const env = process.env.NODE_ENV || 'development'

  return {
    environment: env,
    stripeMode: publishableKey.startsWith('pk_test_') ? 'test' : 'live',
    stripeKeyConfigured: publishableKey !== 'not set',
    stripeKeyFormat: publishableKey.substring(0, 8) + '...', // Only first 8 chars
    strapiUrlConfigured: strapiUrl !== 'not set',
    strapiUrlProtocol: strapiUrl.startsWith('https://') ? 'https' : 'http',
    isProduction: env === 'production',
    isDevelopment: env === 'development',
  }
}

/**
 * Checks if current environment is properly configured
 * Returns true if there are no errors
 */
export function isEnvironmentValid(): boolean {
  return validateEnvironment().valid
}
