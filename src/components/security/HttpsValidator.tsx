/**
 * [PAY-23] HTTPS Validator Component
 *
 * This component validates HTTPS on mount and shows warnings if needed.
 * It's meant to be used in the root layout to check security on app startup.
 *
 * LEARNING: Why a React component for validation?
 * ===============================================
 *
 * We could just call validateAndLogHttps() directly, but wrapping it
 * in a component gives us:
 *
 * 1. React lifecycle (useEffect runs after mount)
 * 2. Can show UI warnings to users
 * 3. Can prevent rendering if insecure
 * 4. Better integration with Next.js
 */

'use client'

import { useEffect, useState } from 'react'
import { validateHttpsProtocol, type HttpsValidationResult } from '@/lib/security/https-validator'

interface HttpsValidatorProps {
  /**
   * If true, shows a banner when HTTPS validation fails
   * Default: true in production, false in development
   */
  showWarnings?: boolean

  /**
   * If true, prevents rendering children when insecure in production
   * Default: false (just warns, doesn't block)
   */
  blockInsecure?: boolean

  /**
   * Children to render when validation passes
   */
  children: React.ReactNode
}

/**
 * HTTPS Validator Component
 *
 * Usage in app/layout.tsx:
 *
 * ```typescript
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <HttpsValidator showWarnings={true}>
 *           {children}
 *         </HttpsValidator>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function HttpsValidator({
  showWarnings = process.env.NODE_ENV === 'production',
  blockInsecure = false,
  children,
}: HttpsValidatorProps) {
  const [validation, setValidation] = useState<HttpsValidationResult | null>(null)

  useEffect(() => {
    // LEARNING: Why useEffect?
    // =======================
    // - Runs only in browser (not during SSR)
    // - Runs after component mounts
    // - Perfect for checking window.location.protocol

    const result = validateHttpsProtocol()
    setValidation(result)

    // Log to console
    if (result.errors.length > 0) {
      console.error('🚨 HTTPS Validation Errors:', result.errors)
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ HTTPS Warnings:', result.warnings)
    }

    if (result.isSecure) {
      console.log('✅ HTTPS validation passed')
    }
  }, [])

  // Still loading (SSR or first render)
  if (!validation) {
    return <>{children}</>
  }

  // CRITICAL: Block rendering if insecure in production and blockInsecure is true
  if (blockInsecure && validation.environment === 'production' && !validation.isSecure) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#dc2626',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        zIndex: 9999,
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          🚨 Security Error
        </h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '600px', textAlign: 'center' }}>
          This application cannot run on an insecure connection.
          Please access the site using HTTPS.
        </p>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>
          Protocol: {validation.protocol}
        </p>
      </div>
    )
  }

  // Show warning banner if configured
  if (showWarnings && validation.errors.length > 0) {
    return (
      <>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '0.75rem',
          textAlign: 'center',
          zIndex: 1000,
          fontSize: '0.875rem',
        }}>
          ⚠️ Insecure connection detected. This site should be accessed via HTTPS.
        </div>
        <div style={{ marginTop: '40px' }}>
          {children}
        </div>
      </>
    )
  }

  // All good, render normally
  return <>{children}</>
}
