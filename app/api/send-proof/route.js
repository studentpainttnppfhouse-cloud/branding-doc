import { NextResponse } from 'next/server'
import { getOrderById, updateOrderStatus } from '@/lib/store'
import { sendProofEmail } from '@/lib/email'

export async function POST(request) {
  try {
    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const order = getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (!order.customerEmail) {
      return NextResponse.json({ error: 'Order has no customer email address' }, { status: 400 })
    }
    if (!order.media || order.media.length === 0) {
      return NextResponse.json({ error: 'No media recorded for this order yet' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const result  = await sendProofEmail({ order, mediaList: order.media, baseUrl })

    // Mark order as sent
    updateOrderStatus(orderId, 'sent')

    return NextResponse.json({
      success:   true,
      messageId: result.messageId,
      sentTo:    order.customerEmail,
    })
  } catch (err) {
    console.error('Send proof error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
