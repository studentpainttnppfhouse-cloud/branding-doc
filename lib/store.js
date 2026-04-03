const fs   = require('fs')
const path = require('path')

const DATA_DIR    = path.join(__dirname, '..', '.data')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const MEDIA_DIR   = path.join(DATA_DIR, 'media')

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR,  { recursive: true })
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true })
}

function readOrders() {
  ensureDirs()
  if (!fs.existsSync(ORDERS_FILE)) return []
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8')) } catch { return [] }
}

function writeOrders(orders) {
  ensureDirs()
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2))
}

function getAllOrders()     { return readOrders() }
function getOrderById(id)   { return readOrders().find(o => o.id === id) || null }

function upsertOrder(order) {
  const orders = readOrders()
  const idx    = orders.findIndex(o => o.id === order.id)
  if (idx >= 0) orders[idx] = { ...orders[idx], ...order }
  else orders.push(order)
  writeOrders(orders)
  return order
}

function deleteOrder(id) {
  writeOrders(readOrders().filter(o => o.id !== id))
}

function updateOrderStatus(id, status) {
  const orders = readOrders()
  const order  = orders.find(o => o.id === id)
  if (!order) return null
  order.status    = status
  order.updatedAt = new Date().toISOString()
  writeOrders(orders)
  return order
}

function addMediaToOrder(orderId, media) {
  const orders = readOrders()
  const order  = orders.find(o => o.id === orderId)
  if (!order) return null
  if (!order.media) order.media = []
  order.media.push(media)
  order.mediaCount = order.media.length
  if (order.status === 'pending') {
    order.status    = 'recorded'
    order.updatedAt = new Date().toISOString()
  }
  writeOrders(orders)
  return order
}

function removeMediaFromOrder(orderId, mediaId) {
  const orders = readOrders()
  const order  = orders.find(o => o.id === orderId)
  if (!order || !order.media) return
  order.media      = order.media.filter(m => m.id !== mediaId)
  order.mediaCount = order.media.length
  if (order.mediaCount === 0 && order.status === 'recorded') order.status = 'pending'
  writeOrders(orders)
  return order
}

function getMediaDir() { ensureDirs(); return MEDIA_DIR }

function formatBytes(bytes) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

module.exports = {
  getAllOrders, getOrderById, upsertOrder, deleteOrder,
  updateOrderStatus, addMediaToOrder, removeMediaFromOrder,
  getMediaDir, formatBytes,
}
