'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RecordPage() {
  const { orderId } = useParams()
  const router = useRouter()

  const videoRef     = useRef(null)   // live preview
  const canvasRef    = useRef(null)   // snapshot helper
  const streamRef    = useRef(null)
  const recorderRef  = useRef(null)
  const chunksRef    = useRef([])

  const [order, setOrder]           = useState(null)
  const [mediaList, setMediaList]   = useState([])
  const [recording, setRecording]   = useState(false)
  const [camReady, setCamReady]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [sending, setSending]       = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [mode, setMode]             = useState('camera') // 'camera' | 'screen'
  const [timer, setTimer]           = useState(0)
  const timerRef = useRef(null)

  // ── Load order ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data.order)
        setMediaList(data.order?.media || [])
      })
      .catch(() => {})
  }, [orderId])

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const constraints = mode === 'screen'
        ? { video: true, audio: true }
        : { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }

      let stream
      if (mode === 'screen') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        const micStream    = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
        if (micStream) {
          const ctx   = new AudioContext()
          const dest  = ctx.createMediaStreamDestination()
          const tracks = [...screenStream.getVideoTracks()]
          if (micStream) micStream.getAudioTracks().forEach(t => { ctx.createMediaStreamSource(new MediaStream([t])).connect(dest) })
          stream = new MediaStream([...tracks, ...dest.stream.getAudioTracks()])
        } else {
          stream = screenStream
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamReady(true)
    } catch (err) {
      setCameraError(err.message || 'Camera access denied')
    }
  }, [mode])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamReady(false)
    setRecording(false)
    clearInterval(timerRef.current)
    setTimer(0)
  }

  // cleanup on unmount
  useEffect(() => () => stopCamera(), [])

  // ── Record ─────────────────────────────────────────────────────────────────
  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    recorderRef.current = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorderRef.current.onstop = () => saveRecording()
    recorderRef.current.start(1000)
    setRecording(true)
    setTimer(0)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  async function saveRecording() {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    await uploadMedia(blob, 'video/webm', 'video')
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────
  function takeSnapshot() {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    c.width  = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob(blob => uploadMedia(blob, 'image/jpeg', 'image'), 'image/jpeg', 0.92)
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadMedia(blob, mimeType, kind) {
    setUploading(true)
    try {
      const ext  = kind === 'video' ? 'webm' : 'jpg'
      const form = new FormData()
      form.append('file', blob, `${kind}-${Date.now()}.${ext}`)
      form.append('orderId', orderId)
      form.append('kind', kind)

      const res  = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.media) {
        setMediaList(prev => [...prev, data.media])
      }
    } finally {
      setUploading(false)
    }
  }

  async function deleteMedia(mediaId) {
    await fetch(`/api/upload/${mediaId}`, { method: 'DELETE' })
    setMediaList(prev => prev.filter(m => m.id !== mediaId))
  }

  // ── Send proof ─────────────────────────────────────────────────────────────
  async function sendProof() {
    setSending(true)
    try {
      const res = await fetch('/api/send-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Proof sent to ${order.customerEmail}!`)
        router.push('/orders')
      } else {
        alert(data.error || 'Send failed')
      }
    } finally {
      setSending(false)
    }
  }

  function formatTimer(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  if (!order) return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Loading order…</div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/orders')} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Recording Studio</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-8">Order {order.orderNumber} — {order.customerName}</p>
        </div>
        {mediaList.length > 0 && (
          <button
            onClick={sendProof}
            disabled={sending}
            className="btn-primary"
          >
            {sending ? 'Sending…' : `📧 Send Proof to ${order.customerEmail}`}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {[{ id: 'camera', label: '📷 Camera' }, { id: 'screen', label: '🖥️ Screen + Camera' }].map(m => (
              <button key={m.id} onClick={() => { stopCamera(); setMode(m.id) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${mode === m.id ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Video preview */}
          <div className="card bg-black rounded-xl overflow-hidden relative aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {!camReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                {cameraError
                  ? <><span className="text-red-400 text-sm mb-3">{cameraError}</span><button onClick={startCamera} className="btn-primary text-sm">Retry</button></>
                  : <button onClick={startCamera} className="btn-primary text-lg px-6 py-3">▶ Start Camera</button>
                }
              </div>
            )}
            {recording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                REC {formatTimer(timer)}
              </div>
            )}
            {uploading && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm">
                Uploading…
              </div>
            )}
          </div>

          {/* Controls */}
          {camReady && (
            <div className="flex items-center gap-3 flex-wrap">
              {!recording
                ? <button onClick={startRecording} className="btn-primary bg-red-600 hover:bg-red-700">
                    <span className="w-3 h-3 rounded-full bg-white" /> Start Recording
                  </button>
                : <button onClick={stopRecording} className="btn-primary bg-red-600 hover:bg-red-700">
                    <span className="w-3 h-3 bg-white" /> Stop Recording
                  </button>
              }
              <button onClick={takeSnapshot} disabled={recording} className="btn-secondary">
                📸 Take Photo
              </button>
              <button onClick={stopCamera} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Right panel: order info + media */}
        <div className="space-y-4">
          {/* Order info */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Order Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Order</dt>
                <dd className="font-mono font-medium">{order.orderNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Customer</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-brand-600 truncate max-w-[160px]">{order.customerEmail}</dd>
              </div>
              {order.customerPhone && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd>{order.customerPhone}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Total</dt>
                <dd className="font-medium">{order.total}</dd>
              </div>
            </dl>
            {order.lineItems && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Items</p>
                <p className="text-sm text-gray-700">{order.lineItems}</p>
              </div>
            )}
          </div>

          {/* Media gallery */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Captured Media</h3>
              <span className="badge bg-gray-100 text-gray-600">{mediaList.length}</span>
            </div>
            {mediaList.length === 0 ? (
              <p className="text-sm text-gray-400">No media yet. Start recording or take a photo.</p>
            ) : (
              <ul className="space-y-2">
                {mediaList.map(media => (
                  <li key={media.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                      {media.kind === 'video' ? '🎬' : '📸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{media.filename}</p>
                      <p className="text-xs text-gray-400">{media.kind} · {media.sizeLabel}</p>
                    </div>
                    <div className="flex gap-1">
                      <a href={media.url} target="_blank" rel="noreferrer"
                        className="text-gray-400 hover:text-brand-600 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <button onClick={() => deleteMedia(media.id)}
                        className="text-gray-400 hover:text-red-500 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tips */}
          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2">Recording Tips</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li>Show the product, packaging, and any seals</li>
              <li>Clearly display the order number / label</li>
              <li>Capture all items in the order</li>
              <li>Good lighting improves video quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
