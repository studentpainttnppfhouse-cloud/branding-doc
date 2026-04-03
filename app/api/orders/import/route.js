import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { upsertOrder, getAllOrders } from '@/lib/store'
import { normalizeShopifyCSV, fetchShopifyOrders } from '@/lib/shopify'

export async function POST(request) {
  try {
    const body = await request.json()
    const { source } = body

    let normalizedOrders = []

    if (source === 'csv') {
      const { rows } = body
      if (!rows || !Array.isArray(rows)) {
        return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
      }
      normalizedOrders = normalizeShopifyCSV(rows)

    } else if (source === 'shopify') {
      const { storeUrl, accessToken } = body
      if (!storeUrl || !accessToken) {
        return NextResponse.json({ error: 'storeUrl and accessToken are required' }, { status: 400 })
      }
      normalizedOrders = await fetchShopifyOrders({ storeUrl, accessToken })

    } else {
      return NextResponse.json({ error: 'Invalid source. Use "csv" or "shopify"' }, { status: 400 })
    }

    const existing = getAllOrders()
    const existingOrderNumbers = new Set(existing.map(o => o.orderNumber))

    let imported = 0
    for (const o of normalizedOrders) {
      // Skip duplicates (by orderNumber)
      if (o.orderNumber && existingOrderNumbers.has(o.orderNumber)) continue

      upsertOrder({
        id:          uuidv4(),
        status:      'pending',
        media:       [],
        mediaCount:  0,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
        ...o,
      })
      imported++
    }

    return NextResponse.json({ imported, total: normalizedOrders.length })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
