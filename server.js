require('dotenv').config({ path: '.env.local' })

const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { v4: uuidv4 } = require('uuid')

const {
  getAllOrders, getOrderById, upsertOrder, deleteOrder,
  updateOrderStatus, addMediaToOrder, removeMediaFromOrder,
  getMediaDir, formatBytes,
} = require('./lib/store')
const { normalizeShopifyCSV, fetchShopifyOrders } = require('./lib/shopify')
const { sendProofEmail } = require('./lib/email')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))  // serve HTML pages

// Multer – store uploads in .data/media
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, getMediaDir()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.webm' : '.jpg')
      cb(null, `${uuidv4()}${ext}`)
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },  // 500 MB
})

// ── Orders ────────────────────────────────────────────────────────────────────
app.get('/api/orders', (_req, res) => {
  const orders = getAllOrders().reverse()
  res.json({ orders })
})

app.get('/api/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  res.json({ order })
})

app.patch('/api/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  const updated = upsertOrder({ ...order, ...req.body, updatedAt: new Date().toISOString() })
  res.json({ order: updated })
})

app.delete('/api/orders/:id', (req, res) => {
  deleteOrder(req.params.id)
  res.json({ success: true })
})

// ── Import ────────────────────────────────────────────────────────────────────
app.post('/api/orders/import', async (req, res) => {
  try {
    const { source } = req.body
    let normalized = []

    if (source === 'csv') {
      const { rows } = req.body
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' })
      normalized = normalizeShopifyCSV(rows)

    } else if (source === 'shopify') {
      const { storeUrl, accessToken } = req.body
      if (!storeUrl || !accessToken) return res.status(400).json({ error: 'storeUrl and accessToken required' })
      normalized = await fetchShopifyOrders({ storeUrl, accessToken })

    } else {
      return res.status(400).json({ error: 'source must be "csv" or "shopify"' })
    }

    const existing = new Set(getAllOrders().map(o => o.orderNumber).filter(Boolean))
    let imported = 0
    for (const o of normalized) {
      if (o.orderNumber && existing.has(o.orderNumber)) continue
      upsertOrder({
        id:         uuidv4(),
        status:     'pending',
        media:      [],
        mediaCount: 0,
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
        ...o,
      })
      imported++
    }
    res.json({ imported, total: normalized.length })
  } catch (err) {
    console.error('Import error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Media upload ──────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    const { orderId, kind = 'video' } = req.body
    if (!orderId || !req.file) return res.status(400).json({ error: 'orderId and file required' })

    const stats  = fs.statSync(req.file.path)
    const media  = {
      id:        uuidv4(),
      orderId,
      kind,
      filename:  req.file.filename,
      mimeType:  req.file.mimetype,
      size:      stats.size,
      sizeLabel: formatBytes(stats.size),
      url:       `/api/media/${req.file.filename}`,
      createdAt: new Date().toISOString(),
    }

    addMediaToOrder(orderId, media)
    res.json({ media })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/upload/:mediaId', (req, res) => {
  const { mediaId } = req.params
  const orders = getAllOrders()
  let found = null
  for (const order of orders) {
    const m = (order.media || []).find(x => x.id === mediaId)
    if (m) { found = { order, media: m }; break }
  }
  if (!found) return res.status(404).json({ error: 'Media not found' })

  const filePath = path.join(getMediaDir(), found.media.filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  removeMediaFromOrder(found.order.id, mediaId)
  res.json({ success: true })
})

// ── Serve media files ─────────────────────────────────────────────────────────
app.get('/api/media/:filename', (req, res) => {
  const safe     = path.basename(req.params.filename)
  const filePath = path.join(getMediaDir(), safe)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })

  const ext = path.extname(safe).toLowerCase()
  const mimeMap = { '.webm':'video/webm', '.mp4':'video/mp4', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png' }
  res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.sendFile(filePath)
})

// ── Send proof email ──────────────────────────────────────────────────────────
app.post('/api/send-proof', async (req, res) => {
  try {
    const { orderId, overrideEmail } = req.body
    if (!orderId) return res.status(400).json({ error: 'orderId required' })

    let order = getOrderById(orderId)
    if (!order) return res.status(404).json({ error: 'Order not found' })

    // Save updated email if the user corrected it in the UI
    const sendTo = (overrideEmail || '').trim() || order.customerEmail
    if (!sendTo) return res.status(400).json({ error: 'No customer email address. Please enter one before sending.' })
    if (!order.media || !order.media.length) return res.status(400).json({ error: 'No media recorded yet' })

    if (overrideEmail && overrideEmail.trim() !== order.customerEmail) {
      order = upsertOrder({ ...order, customerEmail: overrideEmail.trim(), updatedAt: new Date().toISOString() })
    }

    const result = await sendProofEmail({
      order: { ...order, customerEmail: sendTo },
      mediaList: order.media,
    })

    updateOrderStatus(orderId, 'sent')
    res.json({ success: true, messageId: result.messageId, sentTo: sendTo })
  } catch (err) {
    console.error('Send proof error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  DeliveryProof running at http://localhost:${PORT}\n`)
  console.log('  Pages:')
  console.log(`    Dashboard  → http://localhost:${PORT}/index.html`)
  console.log(`    Orders     → http://localhost:${PORT}/orders.html`)
  console.log(`    Import     → http://localhost:${PORT}/import.html`)
  console.log('')
})
