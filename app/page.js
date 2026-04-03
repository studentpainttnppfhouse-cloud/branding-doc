'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, recorded: 0, sent: 0 })
  const [recent, setRecent] = useState([])

  useEffect(() => {
    fetch('/api/orders?limit=5')
      .then(r => r.json())
      .then(data => {
        const orders = data.orders || []
        setRecent(orders)
        setStats({
          total:    orders.length,
          pending:  orders.filter(o => o.status === 'pending').length,
          recorded: orders.filter(o => o.status === 'recorded').length,
          sent:     orders.filter(o => o.status === 'sent').length,
        })
      })
      .catch(() => {})
  }, [])

  const statCards = [
    { label: 'Total Orders',  value: stats.total,    color: 'bg-blue-50 text-blue-700',   icon: '📦' },
    { label: 'Pending Proof', value: stats.pending,  color: 'bg-yellow-50 text-yellow-700', icon: '⏳' },
    { label: 'Recorded',      value: stats.recorded, color: 'bg-purple-50 text-purple-700', icon: '🎬' },
    { label: 'Sent to Customer', value: stats.sent,  color: 'bg-green-50 text-green-700',  icon: '✅' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Delivery Proof Dashboard</h1>
        <p className="text-gray-500 mt-1">Record and send pre-delivery evidence for each Shopify order</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map(s => (
          <div key={s.label} className={`card p-5 ${s.color}`}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm mt-1 font-medium opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <Link href="/import" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
            <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Import Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Upload Shopify CSV or sync via API</p>
        </Link>

        <Link href="/orders" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">View Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Browse all orders and their proof status</p>
        </Link>

        <Link href="/orders?filter=pending" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.867V17a1 1 0 01-1.447.894L15 15M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Record Proof</h3>
          <p className="text-sm text-gray-500 mt-1">Start recording for pending orders</p>
        </Link>
      </div>

      {/* Recent orders */}
      {recent.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-sm text-brand-600 hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {recent.map(order => (
              <li key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <span className="font-medium text-gray-900">{order.orderNumber || order.id}</span>
                  <span className="ml-3 text-sm text-gray-500">{order.customerName} &middot; {order.customerEmail}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <Link href={`/record/${order.id}`} className="btn-primary text-sm py-1">
                    Record
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:  'badge bg-yellow-100 text-yellow-700',
    recorded: 'badge bg-purple-100 text-purple-700',
    sent:     'badge bg-green-100 text-green-700',
  }
  return <span className={map[status] || 'badge bg-gray-100 text-gray-600'}>{status}</span>
}
