import './globals.css'

export const metadata = {
  title: 'Delivery Proof System',
  description: 'Pre-delivery video & image proof for Shopify orders',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 sticky top-0 z-50">
          <a href="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.867V17a1 1 0 01-1.447.894L15 15M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            DeliveryProof
          </a>
          <div className="flex items-center gap-4 ml-4">
            <a href="/" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">Dashboard</a>
            <a href="/orders" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">Orders</a>
            <a href="/import" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">Import</a>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  )
}
