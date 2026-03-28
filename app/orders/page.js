'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function OrdersInner() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerEmail || '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  async function sendProof(order) {
    setSending(s => ({ ...s, [order.id]: true }))
    try {
      const res = await fetch('/api/send-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sent' } : o))
      } else {
        alert(data.error || 'Failed to send proof')
      }
    } finally {
      setSending(s => ({ ...s, [order.id]: false }))
    }
  }

  async function deleteOrder(id) {
    if (!confirm('Delete this order?')) return
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
        </div>
        <Link href="/import" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import Orders
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search order, customer, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {['all', 'pending', 'recorded', 'sent'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
                ${filter === f ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-16 text-center text-gray-400">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-gray-400 mb-4">No orders found</p>
          <Link href="/import" className="btn-primary">Import from Shopify</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Order', 'Customer', 'Email / Phone', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{order.customerName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{order.customerEmail || '—'}</div>
                      {order.customerPhone && <div className="text-xs text-gray-400">{order.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={order.lineItems}>
                      {order.lineItems || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.total || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} mediaCount={order.mediaCount} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/record/${order.id}`}
                          className="btn-secondary text-xs py-1 px-2">
                          🎬 Record
                        </Link>
                        {order.status === 'recorded' && (
                          <button
                            onClick={() => sendProof(order)}
                            disabled={sending[order.id]}
                            className="btn-primary text-xs py-1 px-2">
                            {sending[order.id] ? '…' : '📧 Send'}
                          </button>
                        )}
                        {order.status === 'sent' && (
                          <span className="text-xs text-green-600 font-medium">✓ Sent</span>
                        )}
                        <button onClick={() => deleteOrder(order.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, mediaCount }) {
  const map = {
    pending:  'badge bg-yellow-100 text-yellow-700',
    recorded: 'badge bg-purple-100 text-purple-700',
    sent:     'badge bg-green-100 text-green-700',
  }
  return (
    <div className="flex flex-col gap-1">
      <span className={map[status] || 'badge bg-gray-100 text-gray-600'}>{status}</span>
      {mediaCount > 0 && <span className="text-xs text-gray-400">{mediaCount} file{mediaCount !== 1 ? 's' : ''}</span>}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading…</div>}>
      <OrdersInner />
    </Suspense>
  )
}
