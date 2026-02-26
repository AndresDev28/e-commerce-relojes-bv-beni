/**
 * [ORD-20] API Route: Send Order Email
 * 
 * POST /api/send-order-email
 * 
 * Sends email notifications to customers when order status changes.
 * Called by Strapi lifecycle hooks via webhook.
 * 
 * Authentication: X-Webhook-Secret header (shared with Strapi)
 * 
 * ARCHITECTURE DECISION (ORD-20):
 * ================================
 * - Strapi lifecycle hook detects order status change
 * - Strapi calls this endpoint with order data
 * - Next.js validates webhook secret
 * - Next.js sends email via Resend
 * - Error in email sending does NOT block order update
 *   (log error, return 200 to Strapi)
 * 
 * WHY THIS APPROACH:
 * - Centralized email logic in Next.js
 * - React Email templates (ORD-21) ✅ IMPLEMENTED
 * - Better error handling and retry logic
 * - Email failure doesn't break order workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import { RESEND_CONFIG } from '@/lib/email/config'
import { OrderStatus } from '@/types'
import type { CartItem } from '@/types'
import { OrderStatusEmail, EMAIL_SUBJECTS } from '@/emails/templates'
import { renderEmailToHtml } from '@/emails/utils'

/**
 * Request body structure from Strapi webhook
 */
interface SendOrderEmailRequest {
  orderId: string
  customerEmail: string
  customerName?: string
  orderStatus: OrderStatus
  orderData: {
    items: CartItem[]
    subtotal: number
    shipping: number
    total: number
    createdAt?: string
  }
  previousOrderStatus?: OrderStatus
  statusChangeNote?: string | null
}

/**
 * Validates webhook secret for authentication
 * Ensures the request comes from our Strapi backend
 */
function validateWebhookSecret(request: NextRequest): boolean {
  const webhookSecret = request.headers.get('x-webhook-secret')

  if (!webhookSecret) {
    console.error('❌ Missing X-Webhook-Secret header')
    return false
  }

  if (webhookSecret !== RESEND_CONFIG.webhookSecret) {
    console.error('❌ Invalid webhook secret')
    return false
  }

  return true
}


/** 
 * Generates email subject based on order status 
 * Uses EMAIL_SUBJECT from OrderStatusEmail template 
*/
function getEmailSubject(orderId: string, status: OrderStatus): string {
  return `${EMAIL_SUBJECTS[status]} - ${orderId}`
}

/**
 * POST /api/send-order-email
 * 
 * Sends order status change notification email
 */
export async function POST(request: NextRequest) {
  console.log('\n📧 [EMAIL API] Received request to send order email')

  try {
    // 1. Validate webhook secret
    if (!validateWebhookSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook secret' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    let body: SendOrderEmailRequest
    try {
      body = await request.json()
    } catch (error) {
      console.error('❌ Failed to parse request body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // 3. Validate required fields
    const { orderId, customerEmail, orderStatus, orderData, previousOrderStatus, statusChangeNote } = body

    if (!orderId || !customerEmail || !orderStatus || !orderData) {
      console.error('❌ Missing required fields:', { orderId, customerEmail, orderStatus, hasOrderData: !!orderData })
      return NextResponse.json(
        { error: 'Missing required fields: orderId, customerEmail, orderStatus, orderData' },
        { status: 400 }
      )
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      console.error('❌ Invalid email format:', customerEmail)
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 5. Validate order status
    if (!Object.values(OrderStatus).includes(orderStatus)) {
      console.error('❌ Invalid order status:', orderStatus)
      return NextResponse.json(
        { error: 'Invalid order status' },
        { status: 400 }
      )
    }

    console.log(`✅ Request validated for order ${orderId}`)

    const isCancellationRejection = previousOrderStatus === 'cancellation_requested' &&
      (orderStatus === 'processing' || orderStatus === 'paid' || orderStatus === 'pending')

    // 6. Generate email content
    const subject = isCancellationRejection
      ? `Solicitud de cancelación rechazada - ${orderId}`
      : getEmailSubject(orderId, orderStatus)

    const html = await renderEmailToHtml(
      OrderStatusEmail({
        orderId,
        customerName: body.customerName,
        orderStatus,
        orderData,
        isCancellationRejection,
        statusChangeNote,
      })
    )

    // 7. Send email
    console.log(`📤 Sending email to ${customerEmail}...`)
    const result = await sendEmail({
      to: customerEmail,
      subject,
      html,
      tags: [
        { name: 'category', value: 'order-status' },
        { name: 'orderId', value: orderId },
        { name: 'status', value: orderStatus },
      ],
    })

    // 8. Handle result
    if (result.success) {
      console.log(`✅ Email sent successfully (ID: ${result.emailId})`)
      return NextResponse.json({
        success: true,
        emailId: result.emailId,
        message: `Email sent to ${customerEmail}`,
      })
    } else {
      // IMPORTANT (ORD-20 Decision): Log error but return 200
      // This prevents Strapi lifecycle hook from failing
      console.error(`❌ Email sending failed for order ${orderId}:`, result.error)
      console.log('⚠️  Returning success to Strapi (order update should not be blocked)')

      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Email sending failed, but order was updated successfully',
      }, { status: 200 }) // ⚠️ 200, not 500!
    }

  } catch (error) {
    // Unexpected error
    console.error('❌ Unexpected error in send-order-email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Return 200 to prevent blocking Strapi
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Unexpected error, but order was updated successfully',
    }, { status: 200 })
  }
}
