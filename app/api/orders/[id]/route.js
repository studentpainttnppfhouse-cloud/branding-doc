import { NextResponse } from 'next/server'
import { getOrderById, deleteOrder, upsertOrder } from '@/lib/store'

export async function GET(request, { params }) {
  const order = getOrderById(params.id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ order })
}

export async function PATCH(request, { params }) {
  const order = getOrderById(params.id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json()
  const updated = upsertOrder({ ...order, ...body, updatedAt: new Date().toISOString() })
  return NextResponse.json({ order: updated })
}

export async function DELETE(request, { params }) {
  deleteOrder(params.id)
  return NextResponse.json({ success: true })
}
