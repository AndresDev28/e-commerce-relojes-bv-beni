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
 * - React Email templates (ORD-21)
 * - Better error handling and retry logic
 * - Email failure doesn't break order workflow
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import { RESEND_CONFIG } from '@/lib/email/config'
import { OrderStatus, ORDER_STATUS_CONFIG } from '@/types'
import type { CartItem } from '@/types'
import { formatPrice } from '@/utils'

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
 * Generates email HTML for order status change
 * 
 * NOTE: For ORD-20, using simple HTML template
 * TODO [ORD-21]: Replace with React Email templates
 */
function generateOrderEmailHTML(data: SendOrderEmailRequest): string {
  const { orderId, customerName, orderStatus, orderData } = data
  const statusConfig = ORDER_STATUS_CONFIG[orderStatus]

  // Format items list
  const itemsHTML = orderData.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            ${item.name} x ${item.quantity}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
            ${formatPrice(item.price * item.quantity)}
          </td>
        </tr>
      `
    )
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Actualización de Pedido - ${orderId}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Relojes BV Beni</h1>
          <p style="color: #666; margin: 5px 0;">Tu tienda de relojes de confianza</p>
        </div>

        <!-- Status Badge -->
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 32px; margin-bottom: 10px;">${statusConfig.icon}</div>
          <h2 style="color: #1e293b; margin: 0 0 10px 0;">Estado del Pedido: ${statusConfig.label}</h2>
          <p style="color: #64748b; margin: 0;">${statusConfig.description}</p>
        </div>

        <!-- Greeting -->
        <p>Hola${customerName ? ` ${customerName}` : ''},</p>
        <p>Te informamos que tu pedido <strong>${orderId}</strong> ha sido actualizado.</p>

        <!-- Order Details -->
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b;">Detalles del Pedido</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: left;">Producto</th>
                <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 8px; padding-top: 16px; font-weight: 500;">Subtotal</td>
                <td style="padding: 8px; padding-top: 16px; text-align: right;">${formatPrice(orderData.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">Envío</td>
                <td style="padding: 8px; text-align: right;">
                  ${orderData.shipping === 0 ? '<span style="color: #16a34a;">Gratis</span>' : formatPrice(orderData.shipping)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px; padding-top: 8px; font-weight: 700; font-size: 18px; color: #2563eb;">Total</td>
                <td style="padding: 8px; padding-top: 8px; text-align: right; font-weight: 700; font-size: 18px; color: #2563eb;">${formatPrice(orderData.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Next Steps -->
        ${generateNextStepsHTML(orderStatus)}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
          <p style="margin: 5px 0;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p style="margin: 5px 0;">
            <a href="mailto:pedidos@relojesbvbeni.com" style="color: #2563eb; text-decoration: none;">pedidos@relojesbvbeni.com</a>
          </p>
          <p style="margin: 20px 0 5px 0;">© ${new Date().getFullYear()} Relojes BV Beni. Todos los derechos reservados.</p>
        </div>

      </body>
    </html>
  `
}

/**
 * Generates "Next Steps" section based on order status
 */
function generateNextStepsHTML(status: OrderStatus): string {
  const nextSteps: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #92400e;">⏳ Esperando confirmación de pago</h4>
        <p style="margin: 0; color: #78350f;">Tu pago está siendo procesado. Te avisaremos cuando se confirme.</p>
      </div>
    `,
    [OrderStatus.PAID]: `
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #1e40af;">✅ Pago confirmado</h4>
        <p style="margin: 0; color: #1e3a8a;">Hemos recibido tu pago correctamente. Pronto comenzaremos a preparar tu pedido.</p>
      </div>
    `,
    [OrderStatus.PROCESSING]: `
      <div style="background: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #854d0e;">📦 Preparando tu pedido</h4>
        <p style="margin: 0; color: #713f12;">Estamos empaquetando tus productos con el máximo cuidado. Te avisaremos cuando salga de nuestras instalaciones.</p>
      </div>
    `,
    [OrderStatus.SHIPPED]: `
      <div style="background: #fed7aa; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #9a3412;">🚚 Tu pedido está en camino</h4>
        <p style="margin: 0; color: #7c2d12;">Tu pedido ha salido de nuestras instalaciones y está en ruta. Deberías recibirlo en 3-4 días laborables.</p>
      </div>
    `,
    [OrderStatus.DELIVERED]: `
      <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #065f46;">🎉 ¡Pedido entregado!</h4>
        <p style="margin: 0; color: #064e3b;">Esperamos que disfrutes de tu compra. Si tienes algún problema, no dudes en contactarnos.</p>
      </div>
    `,
    [OrderStatus.CANCELLED]: `
      <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #991b1b;">❌ Pedido cancelado</h4>
        <p style="margin: 0; color: #7f1d1d;">Tu pedido ha sido cancelado. Si no solicitaste esta cancelación, por favor contacta con nosotros.</p>
      </div>
    `,
    [OrderStatus.REFUNDED]: `
      <div style="background: #f3e8ff; border-left: 4px solid #a855f7; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 10px 0; color: #6b21a8;">↩ Reembolso procesado</h4>
        <p style="margin: 0; color: #581c87;">Tu reembolso ha sido procesado. El dinero debería aparecer en tu cuenta en 5-10 días laborables.</p>
      </div>
    `,
  }

  return nextSteps[status] || ''
}

/**
 * Generates email subject based on order status
 */
function getEmailSubject(orderId: string, status: OrderStatus): string {
  const statusConfig = ORDER_STATUS_CONFIG[status]
  return `${statusConfig.icon} Actualización de Pedido ${orderId} - ${statusConfig.label}`
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
    const { orderId, customerEmail, orderStatus, orderData } = body

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

    // 6. Generate email content
    const subject = getEmailSubject(orderId, orderStatus)
    const html = generateOrderEmailHTML(body)

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
