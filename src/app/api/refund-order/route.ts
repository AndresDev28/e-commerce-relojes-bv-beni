import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe/server'
import Stripe from 'stripe'

/**
 * POST /api/refund-order
 *
 * Processes a refund in Stripe.
 * Triggered by Strapi Webhook after an order cancellation.
 *
 * SECURITY:
 * 1. Webhook Secret Validation (x-strapi-secret)
 * 2. Server-side only (Secret Key)
 * 3. Trace ID for logging
 */

interface RefundRequestBody {
    paymentIntentId: string
    amount: number
    orderId: string
}

export async function POST(request: NextRequest) {
    const traceId = request.headers.get('x-trace-id') || crypto.randomUUID()

    try {
        // ================================================================
        // 1. SECURITY: Webhook Secret Validation
        // ================================================================
        const strapiSecret = request.headers.get('x-strapi-secret')
        const localSecret = process.env.STRAPI_WEBHOOK_SECRET

        if (!localSecret) {
            console.error(`[${traceId}] ❌ STRAPI_WEBHOOK_SECRET not configured`)
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        if (strapiSecret !== localSecret) {
            console.warn(`[${traceId}] ⚠️ Unauthorized refund attempt. Secret mismatch.`)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // ================================================================
        // 2. PARSE REQUEST
        // ================================================================
        const body: RefundRequestBody = await request.json()
        const { paymentIntentId, amount, orderId } = body

        if (!paymentIntentId || !amount || !orderId) {
            return NextResponse.json(
                { error: 'Missing required fields: paymentIntentId, amount, orderId' },
                { status: 400 }
            )
        }

        console.log(`[${traceId}] 🔄 Processing refund for order ${orderId}, Amount: ${amount}€`)

        // ================================================================
        // 3. EXECUTE STRIPE REFUND
        // ================================================================
        const stripe = getStripeServer()

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(amount * 100), // Stripe expects cents
            reason: 'requested_by_customer',
            metadata: {
                orderId,
                traceId,
            },
        })

        console.log(`[${traceId}] ✅ Refund processed successfully: ${refund.id}`)

        return NextResponse.json({
            success: true,
            refundId: refund.id,
            status: refund.status,
        })

    } catch (error) {
        console.error(`[${traceId}] ❌ Error processing refund:`, error)

        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
                {
                    error: 'Stripe API Error',
                    message: error.message,
                    code: error.code
                },
                { status: error.statusCode || 500 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
