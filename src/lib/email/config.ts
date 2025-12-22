/**
 * [ORD-20] Resend Email Service Configuration
 * 
 * Centralized configuration for email notifications
 */

/**
 * Resend configuration object
 * 
 * Environment variables required:
 * - RESEND_API_KEY: API key from Resend dashboard
 * - RESEND_FROM_EMAIL: Email address to send from (verified domain or onboarding@resend.dev)
 * - DEV_EMAIL: (Optional) Override recipient in development
 * - WEBHOOK_SECRET: Shared secret for Strapi webhook authentication
 */
export const RESEND_CONFIG = {
  /**
   * Resend API key
   * Format: re_xxxxxxxxxxxxx
   * Get from: https://resend.com/api-keys
   */
  apiKey: process.env.RESEND_API_KEY,

  /**
   * From email address
   * Development: onboarding@resend.dev
   * Production: pedidos@relojesbvbeni.com (must be verified)
   */
  fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',

  /**
   * From name displayed in email client
   */
  fromName: 'Relojes BV Beni',

  /**
   * Development email override
   * If set, all emails will be sent to this address instead of customers
   * Useful for testing without spamming real users
   */
  devEmail: process.env.DEV_EMAIL,

  /**
   * Webhook secret for authentication
   * Shared between Strapi and Next.js
   * Generate with: openssl rand -base64 32
   */
  webhookSecret: process.env.WEBHOOK_SECRET,

  /**
   * Retry configuration
   */
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
  },
} as const

/**
 * Check if running in development mode
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Check if development email override is active
 */
export const isDevEmailActive = isDevelopment && !!RESEND_CONFIG.devEmail
