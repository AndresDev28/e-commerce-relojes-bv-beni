import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/constants'

/**
 * POST /api/orders/:orderId/request-cancellation
 * 
 * Requests cancellation for a specific order.
 * Verifies JWT and ownership before allowing the update.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const authHeader = request.headers.get('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const jwtToken = authHeader.replace('Bearer ', '')
        const { orderId } = await params
        const body = await request.json()
        const { reason } = body

        if (!reason || typeof reason !== 'string') {
            return NextResponse.json(
                { error: 'Cancellation reason is required' },
                { status: 400 }
            )
        }

        // 1. Validate ownership and get the internal Strapi documentId
        const orderDetailsUrl = `${API_URL}/api/orders?filters[orderId][$eq]=${orderId}&populate=*`
        const orderDetailsResponse = await fetch(orderDetailsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwtToken}`,
            },
        })

        if (!orderDetailsResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to find order' },
                { status: 500 }
            )
        }

        const orderData = await orderDetailsResponse.json()
        if (!orderData.data || orderData.data.length === 0) {
            return NextResponse.json(
                { error: 'Order not found or unauthorized' },
                { status: 404 }
            )
        }

        const order = orderData.data[0]
        const currentStatus = order.orderStatus || order.attributes?.orderStatus

        // Orders can only be cancelled if they are pending, paid, or processing
        if (!['pending', 'paid', 'processing'].includes(currentStatus)) {
            return NextResponse.json(
                { error: `Cannot cancel an order with status: ${currentStatus}` },
                { status: 400 }
            )
        }

        const documentId = order.documentId || order.id

        // 2. Request cancellation by updating the orderStatus
        const updateResponse = await fetch(`${API_URL}/api/orders/${documentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({
                data: {
                    orderStatus: 'cancellation_requested',
                    statusChangeNote: reason
                }
            })
        })

        if (!updateResponse.ok) {
            const errorBody = await updateResponse.json()
            console.error('❌ Failed to update order in Strapi:', errorBody)
            return NextResponse.json(
                { error: 'Failed to submit cancellation request to backend' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, message: 'Cancellation requested successfully' })
    } catch (error) {
        console.error('❌ Error in cancellation request:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
