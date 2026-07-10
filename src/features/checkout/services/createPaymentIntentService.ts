import { NextResponse } from 'next/server'
import { calculateShipping } from '@/lib/constants/shipping'
import { getStripeServer } from '@/lib/stripe/server'
import type { CartItem } from '@/types'

export interface CreatePaymentIntentInput {
  items: CartItem[]
}

export async function createPaymentIntentService(params: {
  jwtToken: string
  traceId: string
  input: CreatePaymentIntentInput
}): Promise<
  { data: { clientSecret: string; amount: number } } | { error: NextResponse }
> {
  const { jwtToken, traceId, input } = params
  const { items } = input

  let subtotal: number
  try {
    subtotal = items.reduce((sum, item) => {
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
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Los productos del pedido no son válidos.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const shipping = calculateShipping(subtotal)
  const total = subtotal + shipping

  if (total <= 0 || total > 1000000) {
    return {
      error: NextResponse.json(
        { error: 'El importe total no es válido.' },
        { status: 400, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL
  if (STRAPI_URL) {
    for (const item of items) {
      try {
        const productRes = await fetch(
          `${STRAPI_URL}/api/products?filters[id][$eq]=${item.id}&fields[0]=stock&fields[1]=name`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              'X-Trace-Id': traceId,
            },
          }
        )

        if (productRes.ok) {
          const productData = await productRes.json()
          const product = productData.data?.[0]

          if (product) {
            const availableStock = product.stock ?? 0
            if (availableStock < item.quantity) {
              return {
                error: NextResponse.json(
                  {
                    error: `No hay suficiente stock para "${item.name}". Disponible: ${availableStock}, Solicitado: ${item.quantity}`,
                    code: 'INSUFFICIENT_STOCK',
                  },
                  { status: 400, headers: { 'X-Trace-Id': traceId } }
                ),
              }
            }
          }
        }
      } catch {
        return {
          error: NextResponse.json(
            { error: 'No se pudo verificar el stock del producto.' },
            { status: 502, headers: { 'X-Trace-Id': traceId } }
          ),
        }
      }
    }
  }

  const stripe = getStripeServer()
  let paymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      expand: ['latest_charge.payment_method_details'],
      metadata: {
        itemsCount: items.length.toString(),
        subtotal: subtotal.toString(),
        shipping: shipping.toString(),
      },
    })
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Error en el procesamiento del pago. Inténtalo de nuevo.' },
        { status: 500, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  if (!paymentIntent.client_secret) {
    return {
      error: NextResponse.json(
        { error: 'Error en el procesamiento del pago. Inténtalo de nuevo.' },
        { status: 500, headers: { 'X-Trace-Id': traceId } }
      ),
    }
  }

  return {
    data: {
      clientSecret: paymentIntent.client_secret,
      amount: total,
    },
  }
}
