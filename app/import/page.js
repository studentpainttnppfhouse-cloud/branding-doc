'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const router = useRouter()
  const fileRef = useRef()
  const [tab, setTab] = useState('csv')           // 'csv' | 'shopify'
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)    // parsed rows before saving
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [shopifyConfig, setShopifyConfig] = useState({ storeUrl: '', accessToken: '' })

  // ── CSV ─────────────────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return
    const text = await file.text()
    const Papa = (await import('papaparse')).default
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    setPreview({ rows: parsed.data, fields: parsed.meta.fields })
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function submitCSV() {
    if (!preview) return
    setImporting(true)
    try {
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'csv', rows: preview.rows }),
      })
      const data = await res.json()
      setResult(data)
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }

  // ── Shopify API ──────────────────────────────────────────────────────────────
  async function syncShopify() {
    setImporting(true)
    try {
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'shopify', ...shopifyConfig }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Orders</h1>
      <p className="text-gray-500 mb-8">Pull orders from Shopify to begin recording delivery proofs</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-8">
        {['csv', 'shopify'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'csv' ? '📄 CSV Upload' : '🛍️ Shopify API'}
          </button>
        ))}
      </div>

      {/* Result banner */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <span>{result.error ? `Error: ${result.error}` : `✓ Imported ${result.imported} orders successfully`}</span>
          <div className="flex gap-2">
            <button onClick={() => { setResult(null) }} className="text-sm underline">Dismiss</button>
            {!result.error && (
              <button onClick={() => router.push('/orders')} className="text-sm underline">View Orders →</button>
            )}
          </div>
        </div>
      )}

      {/* CSV Tab */}
      {tab === 'csv' && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}
          >
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600 font-medium">Drop your Shopify orders CSV here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* CSV format hint */}
          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-sm font-medium text-blue-700 mb-2">Expected CSV columns</p>
            <div className="flex flex-wrap gap-2">
              {['Name', 'Email', 'Financial Status', 'Fulfillment Status', 'Total', 'Lineitem name', 'Phone'].map(col => (
                <span key={col} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">{col}</span>
              ))}
            </div>
            <p className="text-xs text-blue-500 mt-2">These match the default Shopify admin &rarr; Orders &rarr; Export CSV format</p>
          </div>

          {/* Preview table */}
          {preview && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-medium text-gray-800">{preview.rows.length} orders detected</span>
                <button onClick={() => setPreview(null)} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Order', 'Customer', 'Email', 'Total', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-mono text-xs">{row['Name'] || row['Order'] || row['order_number'] || `#${i + 1}`}</td>
                        <td className="px-4 py-2">{row['Billing Name'] || row['Customer Name'] || row['billing_name'] || '—'}</td>
                        <td className="px-4 py-2 text-gray-500">{row['Email'] || row['email'] || '—'}</td>
                        <td className="px-4 py-2">{row['Total'] || row['total_price'] || '—'}</td>
                        <td className="px-4 py-2">{row['Financial Status'] || row['financial_status'] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 10 && (
                  <p className="px-4 py-2 text-xs text-gray-400">…and {preview.rows.length - 10} more rows</p>
                )}
              </div>
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <button onClick={submitCSV} disabled={importing} className="btn-primary">
                  {importing ? 'Importing…' : `Import ${preview.rows.length} Orders`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shopify API Tab */}
      {tab === 'shopify' && (
        <div className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
            <input
              type="text"
              placeholder="your-store.myshopify.com"
              value={shopifyConfig.storeUrl}
              onChange={e => setShopifyConfig(c => ({ ...c, storeUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin API Access Token</label>
            <input
              type="password"
              placeholder="shpat_xxxxxxxxxxxxxxxx"
              value={shopifyConfig.accessToken}
              onChange={e => setShopifyConfig(c => ({ ...c, accessToken: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Get this from Shopify Admin → Apps → Develop apps → API credentials
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fulfillment Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="unfulfilled">Unfulfilled (awaiting dispatch)</option>
              <option value="partial">Partially fulfilled</option>
              <option value="any">All orders</option>
            </select>
          </div>
          <button
            onClick={syncShopify}
            disabled={importing || !shopifyConfig.storeUrl || !shopifyConfig.accessToken}
            className="btn-primary"
          >
            {importing ? 'Syncing…' : '🔄 Sync Orders from Shopify'}
          </button>
        </div>
      )}
    </div>
  )
}
