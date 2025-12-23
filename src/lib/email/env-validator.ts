/**
 * [ORD-20] Resend Environment Variable Validator
 * 
 * Validates that Resend email service is correctly configured
 * for each environment (development, production)
 * 
 * Prevents common mistakes like:
 * - Missing API key
 * - Invalid API key format
 * - Missing webhook secret
 * - Invalid email addresses
 */

export interface ResendEnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  environment: 'development' | 'production' | 'test'
}

/**
 * Validates Resend environment configuration
 * 
 * @returns Validation result with errors and warnings
 */
export function validateResendEnvironment(): ResendEnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const env = process.env.NODE_ENV || 'development'

  // ================================================================
  // 1. Validate Resend API Key
  // ================================================================
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    errors.push(
      'RESEND_API_KEY is not set. ' +
        'Please configure it in your .env.local file. ' +
        'Get your key from https://resend.com/api-keys'
    )
  } else {
    // Check for placeholder value
    if (apiKey.includes('your_api_key_here')) {
      errors.push(
        'Resend API key is still set to placeholder value. ' +
          'Get your real key from https://resend.com/api-keys'
      )
    } else if (!apiKey.startsWith('re_')) {
      // Check format
      errors.push(
        `Invalid Resend API key format: ${apiKey.substring(0, 10)}... ` +
          'Must start with "re_".'
      )
    }
  }

  // ================================================================
  // 2. Validate From Email
  // ================================================================
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!fromEmail) {
    warnings.push(
      'RESEND_FROM_EMAIL is not set. Will default to "onboarding@resend.dev". ' +
        'For production, configure a verified domain.'
    )
  } else {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(fromEmail)) {
      errors.push(
        `Invalid email format for RESEND_FROM_EMAIL: ${fromEmail}`
      )
    }

    // Warn about using test domain in production
    if (env === 'production' && fromEmail.includes('resend.dev')) {
      warnings.push(
        '⚠️ Using Resend test domain (resend.dev) in production. ' +
          'Consider verifying your own domain for better deliverability.'
      )
    }

    // Warn about using custom domain in development
    if (env === 'development' && !fromEmail.includes('resend.dev')) {
      warnings.push(
        'Using custom domain in development. ' +
          'Make sure this domain is verified in Resend. ' +
          'Tip: Use onboarding@resend.dev for testing.'
      )
    }
  }

  // ================================================================
  // 3. Validate Webhook Secret
  // ================================================================
  const webhookSecret = process.env.WEBHOOK_SECRET

  if (!webhookSecret) {
    errors.push(
      'WEBHOOK_SECRET is not set. ' +
        'This is required to authenticate webhook calls from Strapi. ' +
        'Generate with: openssl rand -base64 32'
    )
  } else if (webhookSecret.includes('your_webhook_secret_here')) {
    errors.push(
      'Webhook secret is still set to placeholder value. ' +
        'Generate a random secret with: openssl rand -base64 32'
    )
  } else if (webhookSecret.length < 32) {
    warnings.push(
      'Webhook secret is shorter than recommended (< 32 characters). ' +
        'Use a longer secret for better security.'
    )
  }

  // ================================================================
  // 4. Validate Dev Email Override (optional)
  // ================================================================
  const devEmail = process.env.DEV_EMAIL

  if (devEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(devEmail)) {
      errors.push(
        `Invalid email format for DEV_EMAIL: ${devEmail}`
      )
    }

    if (env === 'production') {
      warnings.push(
        '⚠️ DEV_EMAIL is set in production environment. ' +
          'All customer emails will be sent to this address instead! ' +
          'Remove DEV_EMAIL for production deployment.'
      )
    }

    if (env === 'development') {
      console.log(`📧 Development mode: All emails will be sent to ${devEmail}`)
    }
  }

  // ================================================================
  // 5. Check for NEXT_PUBLIC_ prefix (security)
  // ================================================================
  const publicApiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY
  const publicWebhookSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET

  if (publicApiKey) {
    errors.push(
      '🚨 SECURITY BREACH: RESEND_API_KEY has NEXT_PUBLIC_ prefix! ' +
        'This exposes your API key to the browser. Remove NEXT_PUBLIC_ prefix immediately ' +
        'and rotate your key at https://resend.com/api-keys'
    )
  }

  if (publicWebhookSecret) {
    errors.push(
      '🚨 SECURITY BREACH: WEBHOOK_SECRET has NEXT_PUBLIC_ prefix! ' +
        'This exposes your webhook secret to the browser. Remove NEXT_PUBLIC_ prefix immediately ' +
        'and generate a new secret.'
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment: env as 'development' | 'production' | 'test',
  }
}

/**
 * Validates and logs Resend environment configuration
 * Should be called during application startup or when initializing email client
 * 
 * @param throwOnError - If true, throws an error when validation fails
 */
export function validateAndLogResendEnv(throwOnError = true): void {
  const result = validateResendEnvironment()

  // Log environment info
  console.log(`\n📧 Resend Email Service - Environment: ${result.environment.toUpperCase()}`)

  // Log errors
  if (result.errors.length > 0) {
    console.error('\n❌ Resend Configuration Errors:')
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`)
    })
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Resend Configuration Warnings:')
    result.warnings.forEach((warning, index) => {
      console.warn(`  ${index + 1}. ${warning}`)
    })
  }

  // Success message
  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Resend configuration is valid!\n')
  } else if (result.valid) {
    console.log('✅ Resend configuration is valid (with warnings)\n')
  } else {
    console.error('\n❌ Resend configuration has errors!\n')
  }

  // Throw if requested and validation failed
  if (throwOnError && !result.valid) {
    throw new Error(
      'Resend email service is not properly configured. Please fix the errors above.'
    )
  }
}

/**
 * Gets a safe summary of Resend configuration
 * Useful for debugging (no sensitive data exposed)
 * 
 * @returns Configuration summary
 */
export function getResendEnvSummary(): Record<string, string | boolean> {
  const apiKey = process.env.RESEND_API_KEY || 'not set'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'not set'
  const webhookSecret = process.env.WEBHOOK_SECRET || 'not set'
  const devEmail = process.env.DEV_EMAIL
  const env = process.env.NODE_ENV || 'development'

  return {
    environment: env,
    apiKeyConfigured: apiKey !== 'not set',
    apiKeyFormat: apiKey !== 'not set' ? apiKey.substring(0, 5) + '...' : 'not set',
    fromEmail: fromEmail,
    webhookSecretConfigured: webhookSecret !== 'not set',
    devEmailOverride: devEmail || 'none',
    isProduction: env === 'production',
    isDevelopment: env === 'development',
  }
}

/**
 * Checks if Resend is properly configured
 * Returns true if there are no errors
 */
export function isResendConfigured(): boolean {
  return validateResendEnvironment().valid
}
