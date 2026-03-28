import { NextResponse } from 'next/server'
import { getAllOrders } from '@/lib/store'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const limit  = Number(searchParams.get('limit') || 0)
  let orders = getAllOrders()
  if (limit > 0) orders = orders.slice(-limit).reverse()
  else orders = [...orders].reverse()
  return NextResponse.json({ orders })
}
