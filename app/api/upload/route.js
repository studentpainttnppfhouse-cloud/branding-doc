import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { addMediaToOrder, getMediaDir, formatBytes } from '@/lib/store'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file    = formData.get('file')
    const orderId = formData.get('orderId')
    const kind    = formData.get('kind') || 'video'   // 'video' | 'image'

    if (!file || !orderId) {
      return NextResponse.json({ error: 'file and orderId are required' }, { status: 400 })
    }

    const mediaDir  = getMediaDir()
    const mediaId   = uuidv4()
    const ext       = kind === 'video' ? 'webm' : 'jpg'
    const filename  = `${orderId}-${mediaId}.${ext}`
    const filePath  = path.join(mediaDir, filename)
    const mimeType  = kind === 'video' ? 'video/webm' : 'image/jpeg'

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    const stats = fs.statSync(filePath)
    const media = {
      id:        mediaId,
      orderId,
      kind,
      filename,
      mimeType,
      size:      stats.size,
      sizeLabel: formatBytes(stats.size),
      url:       `/api/media/${filename}`,
      createdAt: new Date().toISOString(),
    }

    addMediaToOrder(orderId, media)
    return NextResponse.json({ media })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
