/**
 * [ORD-20] Resend Email Client
 * 
 * Centralized email sending client with:
 * - Automatic retry logic (3 attempts)
 * - Development email override
 * - Comprehensive error handling
 * - Logging for debugging
 */

import { Resend } from 'resend'
import { RESEND_CONFIG, isDevelopment, isDevEmailActive } from './config'
import { validateAndLogResendEnv } from './env-validator'

// Validate environment on module load
validateAndLogResendEnv(true)

/**
 * Resend client instance
 * Automatically configured with API key from environment
 */
export const resend = new Resend(RESEND_CONFIG.apiKey)

/**
 * Email sending parameters
 */
export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}

/**
 * Email sending result
 */
export interface SendEmailResult {
  success: boolean
  emailId?: string
  error?: string
  attempt?: number
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculates exponential backoff delay
 * 
 * @param attempt - Current attempt number (1-based)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  const { initialDelay, maxDelay } = RESEND_CONFIG.retry
  const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay)
  return delay
}

/**
 * Determines the actual recipient email(s)
 * In development with DEV_EMAIL set, overrides to dev email
 * 
 * @param originalTo - Original recipient(s)
 * @returns Final recipient(s)
 */
function getRecipient(originalTo: string | string[]): string | string[] {
  if (isDevEmailActive && RESEND_CONFIG.devEmail) {
    console.log(`📧 [DEV MODE] Email redirected from ${originalTo} to ${RESEND_CONFIG.devEmail}`)
    return RESEND_CONFIG.devEmail
  }
  return originalTo
}

/**
 * Sends an email with retry logic
 * 
 * Features:
 * - Automatic retry on failure (exponential backoff)
 * - Development email override
 * - Detailed logging
 * - Error handling
 * 
 * @param params - Email parameters
 * @returns Send result with success status and email ID or error
 * 
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   to: 'customer@example.com',
 *   subject: 'Order Confirmation',
 *   html: '<h1>Thank you for your order!</h1>',
 * })
 * 
 * if (result.success) {
 *   console.log('Email sent:', result.emailId)
 * } else {
 *   console.error('Email failed:', result.error)
 * }
 * ```
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo, tags } = params
  const { maxAttempts } = RESEND_CONFIG.retry

  // Determine final recipient (with dev override)
  const finalRecipient = getRecipient(to)

  // Log email attempt
  console.log(`\n📧 Sending email:`)
  console.log(`  To: ${Array.isArray(finalRecipient) ? finalRecipient.join(', ') : finalRecipient}`)
  console.log(`  Subject: ${subject}`)
  console.log(`  From: ${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`)

  // Retry loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`  📤 Attempt ${attempt}/${maxAttempts}...`)

      // Send email via Resend
      const response = await resend.emails.send({
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: finalRecipient,
        subject,
        html,
        text,
        replyTo: replyTo,
        tags,
      })

      // Check for errors in response
      if (response.error) {
        throw new Error(response.error.message)
      }

      // Success
      console.log(`  ✅ Email sent successfully (ID: ${response.data?.id})`)
      return {
        success: true,
        emailId: response.data?.id,
        attempt,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`  ❌ Attempt ${attempt} failed:`, errorMessage)

      // If this was the last attempt, return failure
      if (attempt === maxAttempts) {
        console.error(`  🚫 All ${maxAttempts} attempts failed. Giving up.`)
        return {
          success: false,
          error: errorMessage,
          attempt,
        }
      }

      // Calculate delay before next attempt
      const delay = calculateBackoffDelay(attempt)
      console.log(`  ⏳ Retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: 'Max retries exceeded',
    attempt: maxAttempts,
  }
}

/**
 * Sends a test email (useful for verifying configuration)
 * 
 * @param to - Test recipient email
 * @returns Send result
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'Test Email from Relojes BV Beni',
    html: `
      <h1>Test Email</h1>
      <p>This is a test email from the Relojes BV Beni email system.</p>
      <p><strong>Environment:</strong> ${isDevelopment ? 'Development' : 'Production'}</p>
      <p><strong>From:</strong> ${RESEND_CONFIG.fromEmail}</p>
      <p><strong>Dev Override:</strong> ${isDevEmailActive ? 'Active' : 'Inactive'}</p>
      <p>If you received this, the email system is working correctly!</p>
    `,
    text: 'This is a test email from Relojes BV Beni email system.',
  })
}

/**
 * Validates email format
 * 
 * @param email - Email to validate
 * @returns True if valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
