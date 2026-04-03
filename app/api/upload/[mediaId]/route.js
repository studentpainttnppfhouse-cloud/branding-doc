import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAllOrders, removeMediaFromOrder, getMediaDir } from '@/lib/store'

export async function DELETE(request, { params }) {
  const { mediaId } = params
  const orders = getAllOrders()

  let found = null
  for (const order of orders) {
    const media = (order.media || []).find(m => m.id === mediaId)
    if (media) { found = { order, media }; break }
  }

  if (!found) return NextResponse.json({ error: 'Media not found' }, { status: 404 })

  // Delete file from disk
  const filePath = path.join(getMediaDir(), found.media.filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  removeMediaFromOrder(found.order.id, mediaId)
  return NextResponse.json({ success: true })
}
