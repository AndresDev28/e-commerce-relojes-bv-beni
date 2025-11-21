/**
 * [PAY-23] HTTPS Protocol Validator
 *
 * This module validates that the application is running with HTTPS protocol
 * in production environments, which is critical for:
 *
 * 1. PCI DSS Compliance - Required for processing payments
 * 2. Data Protection - Prevents man-in-the-middle attacks
 * 3. User Trust - Browsers mark HTTP sites as "Not Secure"
 * 4. SEO - Google penalizes non-HTTPS sites
 *
 * LEARNING: What is HTTPS?
 * ========================
 * HTTPS = HTTP + TLS/SSL encryption
 *
 * - HTTP sends data in plain text (anyone can read it)
 * - HTTPS encrypts data with TLS (only sender/receiver can read it)
 *
 * Example of the danger:
 * - User enters credit card on HTTP site
 * - Attacker on same WiFi network intercepts the request
 * - Attacker reads credit card number in plain text
 *
 * With HTTPS:
 * - User enters credit card on HTTPS site
 * - Data is encrypted before leaving user's browser
 * - Attacker sees only gibberish even if intercepted
 *
 * LEARNING: What is a Man-in-the-Middle (MITM) attack?
 * ====================================================
 *
 * Scenario without HTTPS:
 *
 *   [User's Browser] --HTTP--> [Attacker] --HTTP--> [Server]
 *                                   ↓
 *                           Reads all data!
 *
 * Scenario with HTTPS:
 *
 *   [User's Browser] --HTTPS--> [Attacker] --HTTPS--> [Server]
 *                                    ↓
 *                          Sees encrypted gibberish
 *
 * The attacker cannot:
 * - Read the data (it's encrypted)
 * - Modify the data (tampering detected)
 * - Impersonate the server (certificate verification)
 */

export interface HttpsValidationResult {
  isSecure: boolean
  errors: string[]
  warnings: string[]
  protocol: 'https' | 'http' | 'unknown'
  environment: 'development' | 'production' | 'test'
}

/**
 * Validates that the application is running with HTTPS protocol
 *
 * LEARNING: Why do we check typeof window === 'undefined'?
 * ========================================================
 *
 * Next.js runs code in TWO places:
 * 1. Server (Node.js) - No window object, no protocol concept
 * 2. Browser (Client) - Has window object, has protocol
 *
 * The protocol (http/https) only matters in the browser because
 * that's where users access the site. The server always talks
 * to clients via HTTP/HTTPS regardless of its own environment.
 *
 * @returns Validation result with security status
 */
export function validateHttpsProtocol(): HttpsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Determine current environment
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test'

  // ================================================================
  // SERVER-SIDE EXECUTION
  // ================================================================
  // If running on server (Node.js), we can't check the protocol
  // because there's no window.location. This is OK because:
  // - The server doesn't serve the app directly to users
  // - Vercel/hosting handles HTTPS at the edge
  // - Client-side check will catch any issues
  if (typeof window === 'undefined') {
    return {
      isSecure: true, // Assume secure on server
      errors: [],
      warnings: [],
      protocol: 'unknown',
      environment: env,
    }
  }

  // ================================================================
  // CLIENT-SIDE EXECUTION (Browser)
  // ================================================================

  // LEARNING: window.location.protocol
  // ==================================
  // This tells us how the user accessed our site:
  // - 'https:' = Secure connection ✅
  // - 'http:' = Insecure connection ❌
  // - 'file:' = Local file (development only)
  const protocol = window.location.protocol
  const isHttps = protocol === 'https:'
  const isHttp = protocol === 'http:'

  // ================================================================
  // PRODUCTION VALIDATION (Critical)
  // ================================================================

  if (env === 'production') {
    if (isHttp) {
      errors.push(
        '🚨 CRITICAL SECURITY VIOLATION: Application is running on HTTP in production!\n\n' +
        'This is EXTREMELY DANGEROUS because:\n' +
        '1. Payment data can be intercepted (violates PCI DSS)\n' +
        '2. User credentials can be stolen\n' +
        '3. Browsers will show "Not Secure" warning\n' +
        '4. Google will penalize SEO rankings\n\n' +
        'IMMEDIATE ACTION REQUIRED:\n' +
        '- Configure your hosting to force HTTPS redirect\n' +
        '- Verify SSL certificate is active\n' +
        '- Never process payments on HTTP'
      )
    }

    if (!isHttps && !isHttp) {
      warnings.push(
        `⚠️ Unknown protocol detected: ${protocol}\n` +
        'Expected "https:" in production environment.'
      )
    }
  }

  // ================================================================
  // DEVELOPMENT VALIDATION (Educational)
  // ================================================================

  if (env === 'development') {
    if (isHttp) {
      warnings.push(
        'ℹ️ Running on HTTP in development mode.\n\n' +
        'This is OK for local development, but remember:\n' +
        '- Always use HTTPS in production\n' +
        '- Test with HTTPS locally before deploying\n' +
        '- Some Stripe features require HTTPS even in test mode\n\n' +
        'To test with HTTPS locally:\n' +
        '1. Use ngrok: https://ngrok.com\n' +
        '2. Use mkcert for local SSL: https://github.com/FiloSottile/mkcert\n' +
        '3. Deploy to Vercel preview for testing'
      )
    }
  }

  // ================================================================
  // RETURN VALIDATION RESULT
  // ================================================================

  return {
    isSecure: isHttps,
    errors,
    warnings,
    protocol: isHttps ? 'https' : isHttp ? 'http' : 'unknown',
    environment: env,
  }
}

/**
 * Validates and logs HTTPS configuration
 * Should be called during application startup
 *
 * LEARNING: When to call this function?
 * ====================================
 *
 * Best practice: Call this in your root layout or app component
 * Example in app/layout.tsx:
 *
 * ```typescript
 * 'use client'
 *
 * useEffect(() => {
 *   validateAndLogHttps()
 * }, [])
 * ```
 *
 * This ensures the check runs as soon as the app loads in the browser.
 *
 * @param throwOnError - If true, throws an error in production when not HTTPS
 */
export function validateAndLogHttps(throwOnError = true): void {
  const result = validateHttpsProtocol()

  // Only log in browser
  if (typeof window === 'undefined') {
    return
  }

  // Log environment info
  console.log(`\n🔒 HTTPS Validation - ${result.environment.toUpperCase()}`)
  console.log(`Protocol: ${result.protocol}`)
  console.log(`Secure: ${result.isSecure ? '✅' : '❌'}`)

  // Log errors
  if (result.errors.length > 0) {
    console.error('\n❌ HTTPS Security Errors:')
    result.errors.forEach((error, index) => {
      console.error(`\n${index + 1}. ${error}`)
    })
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️ HTTPS Warnings:')
    result.warnings.forEach((warning, index) => {
      console.warn(`\n${index + 1}. ${warning}`)
    })
  }

  // Success message
  if (result.isSecure && result.errors.length === 0) {
    console.log('✅ HTTPS validation passed!\n')
  }

  // Throw in production if not secure
  if (throwOnError && result.environment === 'production' && !result.isSecure) {
    throw new Error(
      'HTTPS validation failed in production. Cannot process payments on insecure connection.'
    )
  }
}

/**
 * Quick check if current connection is secure
 *
 * LEARNING: Use case for this function
 * ====================================
 *
 * Use this before processing sensitive operations:
 *
 * ```typescript
 * function handlePayment() {
 *   if (!isConnectionSecure()) {
 *     alert('Cannot process payment on insecure connection')
 *     return
 *   }
 *   // Process payment...
 * }
 * ```
 *
 * @returns true if connection is HTTPS or running on server
 */
export function isConnectionSecure(): boolean {
  return validateHttpsProtocol().isSecure
}

/**
 * Gets a summary of the current security status
 * Useful for debugging and support
 *
 * @returns Safe summary without exposing sensitive info
 */
export function getSecuritySummary(): Record<string, string | boolean> {
  const result = validateHttpsProtocol()

  return {
    environment: result.environment,
    protocol: result.protocol,
    isSecure: result.isSecure,
    hasErrors: result.errors.length > 0,
    hasWarnings: result.warnings.length > 0,
    isProduction: result.environment === 'production',
    shouldEnforceHttps: result.environment === 'production',
  }
}
