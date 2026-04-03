/**
 * Shopify Admin REST API helpers
 */
export async function fetchShopifyOrders({ storeUrl, accessToken, fulfillmentStatus = 'unfulfilled', limit = 250 }) {
  const url = `https://${storeUrl}/admin/api/2024-01/orders.json?status=open&fulfillment_status=${fulfillmentStatus}&limit=${limit}`
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify API error ${res.status}: ${text}`)
  }
  const data = await res.json()
  return (data.orders || []).map(normalizeShopifyOrder)
}

function normalizeShopifyOrder(o) {
  const addr = o.billing_address || o.shipping_address || {}
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(' ')
  return {
    orderNumber:   o.name,                               // e.g. #1001
    customerName:  name || o.email?.split('@')[0] || 'Customer',
    customerEmail: o.email || '',
    customerPhone: o.phone || addr.phone || '',
    lineItems:     o.line_items?.map(li => `${li.name} ×${li.quantity}`).join(', ') || '',
    total:         `${o.currency} ${o.total_price}`,
    financialStatus: o.financial_status,
    fulfillmentStatus: o.fulfillment_status,
    rawShopifyId:  String(o.id),
  }
}

/**
 * Map Shopify CSV export columns → normalised order object.
 * Shopify CSV uses a multi-row format where line items share the same Name (order number).
 * We collapse them into one order per Name.
 */
export function normalizeShopifyCSV(rows) {
  const map = new Map()

  for (const row of rows) {
    const orderNum = row['Name'] || row['name'] || row['Order Number'] || row['order_number']
    if (!orderNum) continue

    if (!map.has(orderNum)) {
      const billingName = row['Billing Name'] || row['billing_name'] || ''
      map.set(orderNum, {
        orderNumber:   orderNum,
        customerName:  billingName || row['Customer Name'] || '',
        customerEmail: row['Email'] || row['email'] || '',
        customerPhone: row['Billing Phone'] || row['Phone'] || row['phone'] || '',
        lineItems:     [],
        total:         row['Total'] || row['total_price'] || '',
        financialStatus:    row['Financial Status'] || row['financial_status'] || '',
        fulfillmentStatus:  row['Fulfillment Status'] || row['fulfillment_status'] || '',
        shippingName:  row['Shipping Name'] || '',
        shippingAddress: [
          row['Shipping Address1'],
          row['Shipping City'],
          row['Shipping Province'],
          row['Shipping Zip'],
          row['Shipping Country'],
        ].filter(Boolean).join(', '),
      })
    }

    const item = row['Lineitem name'] || row['lineitem_name'] || row['Line: Title']
    const qty  = row['Lineitem quantity'] || row['lineitem_quantity'] || '1'
    if (item) map.get(orderNum).lineItems.push(`${item} ×${qty}`)
  }

  return Array.from(map.values()).map(o => ({
    ...o,
    lineItems: o.lineItems.join(', '),
  }))
}
