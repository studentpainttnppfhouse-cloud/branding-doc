import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getMediaDir } from '@/lib/store'

export async function GET(request, { params }) {
  const { filename } = params
  // Prevent path traversal
  const safe = path.basename(filename)
  const filePath = path.join(getMediaDir(), safe)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ext = path.extname(safe).toLowerCase()
  const mimeMap = {
    '.webm': 'video/webm',
    '.mp4':  'video/mp4',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
  }
  const contentType = mimeMap[ext] || 'application/octet-stream'

  const buffer = fs.readFileSync(filePath)
  return new Response(buffer, {
    headers: {
      'Content-Type':        contentType,
      'Content-Length':      String(buffer.length),
      'Cache-Control':       'private, max-age=3600',
      'Content-Disposition': `inline; filename="${safe}"`,
    },
  })
}
