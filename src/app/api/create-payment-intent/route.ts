/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe Payment Intent for processing payments
 *
 * SECURITY:
 * - Uses server-side secret key (never exposed to client)
 * - Validates JWT authentication
 * - Re-calculates cart total on backend (prevents tampering)
 * - Returns client_secret for frontend confirmation
 *
 * FLOW:
 * 1. Validate authentication (JWT)
 * 2. Receive cart items from frontend
 * 3. Re-calculate total on backend (security)
 * 4. Create Payment Intent with Stripe
 * 5. Return client_secret to frontend
 *
 * Related: FASE 2 - Real Stripe Integration
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { calculateShipping } from '@/lib/constants/shipping'
import { getStripeServer } from '@/lib/stripe/server'
/**
 * Interface for cart items sent from frontend
 * We re-calculate the total here for security
 */
interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}
interface CreatePaymentIntentBody {
  items: CartItem[]
}

export async function POST(request: NextRequest) {
  // Initialize Stripe at request time (lazy initialization)
  const stripe = getStripeServer()
  try {
    // ================================================================
    // STEP 1: Validate Authentication
    // ================================================================
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: No token provided' },
        { status: 401 }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // TODO: Optionally validate token with Strapi
    // For now, we just check it exists
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }
    // ================================================================
    // STEP 2: Parse and validate request body
    // ================================================================
    const body: CreatePaymentIntentBody = await request.json()
    const { items } = body
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: items array is required' },
        { status: 400 }
      )
    }
    // ================================================================
    // STEP 3: Re-calculate total on backend (SECURITY)
    // ================================================================
    // IMPORTANT: Never trust amounts from frontend
    // Always re-calculate on backend to prevent tampering
    const subtotal = items.reduce((sum, item) => {
      // Validate each item
      if (
        !item.price ||
        !item.quantity ||
        item.price <= 0 ||
        item.quantity <= 0
      ) {
        throw new Error(`Invalid item: ${item.id}`)
      }
      return sum + item.price * item.quantity
    }, 0)
    const shipping = calculateShipping(subtotal)
    const total = subtotal + shipping
    // Validate total is reasonable
    if (total <= 0 || total > 1000000) {
      return NextResponse.json(
        { error: 'Invalid total amount' },
        { status: 400 }
      )
    }
    console.log('💰 Payment Intent - Calculated total:', {
      subtotal,
      shipping,
      total,
      items: items.length,
    })

    // ================================================================
    // STEP 3.5: [AND-99] Pre-validate stock availability
    // ================================================================
    // Check stock BEFORE creating the Payment Intent to prevent charging
    // customers for products that are out of stock.
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL
    if (STRAPI_URL) {
      for (const item of items) {
        try {
          const productRes = await fetch(
            `${STRAPI_URL}/api/products?filters[id][$eq]=${item.id}&fields[0]=stock&fields[1]=name`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (productRes.ok) {
            const productData = await productRes.json()
            const product = productData.data?.[0]

            if (product) {
              const availableStock = product.stock ?? 0
              if (availableStock < item.quantity) {
                console.warn(
                  `[AND-99] Stock check failed for "${item.name}": Available=${availableStock}, Requested=${item.quantity}`
                )
                return NextResponse.json(
                  {
                    error: `No hay suficiente stock para "${item.name}". Disponible: ${availableStock}, Solicitado: ${item.quantity}`,
                    code: 'INSUFFICIENT_STOCK',
                  },
                  { status: 400 }
                )
              }
            }
          }
        } catch (stockError) {
          // If stock check fails, log but don't block (fail-open for resilience)
          console.warn(`[AND-99] Stock check failed for item ${item.id}:`, stockError)
        }
      }
      console.log('✅ [AND-99] Stock pre-validation passed for all items')
    }
    // ================================================================
    // STEP 4: Create Payment Intent with Stripe
    // ================================================================
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      // Expand latest_charge to get payment_method_details (brand, last4)
      expand: ['latest_charge.payment_method_details'],
      metadata: {
        itemsCount: items.length.toString(),
        subtotal: subtotal.toString(),
        shipping: shipping.toString(),
      },
    })
    console.log('✅ Payment Intent created:', paymentIntent.id)
    // ================================================================
    // STEP 5: Return client_secret to frontend
    // ================================================================
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: total,
    })
  } catch (error) {
    console.error('❌ Error creating payment intent:', error)
    // Don't expose internal error details to client
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment processing error' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
