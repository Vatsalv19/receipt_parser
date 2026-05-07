import { useEffect, useMemo, useState } from 'react'
import './App.css'

const emptyReceipt = {
  merchant: '',
  date: '',
  items: [{ name: '', amount: '' }],
  total: '',
}

const toAmountString = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return String(value)
}

const toNumber = (value) => {
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeReceipt = (input) => {
  const items = Array.isArray(input?.items) ? input.items : []
  return {
    merchant: input?.merchant ?? '',
    date: input?.date ?? '',
    items: items.length > 0
      ? items.map((item) => ({ name: item?.name ?? '', amount: toAmountString(item?.amount ?? '') }))
      : [{ name: '', amount: '' }],
    total: toAmountString(input?.total ?? ''),
  }
}

function Logo() {
  return (
    <svg className="brand-logo" viewBox="0 0 36 36" fill="none" aria-label="Receipt Parser" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="var(--color-primary)" fillOpacity="0.12" />
      <path d="M10 8h16a2 2 0 0 1 2 2v18l-3-2-3 2-3-2-3 2-3-2-3 2V10a2 2 0 0 1 2-2z"
        stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="13" y1="14" x2="23" y2="14" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="18" x2="21" y2="18" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="22" x2="19" y2="22" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

function App() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [receipt, setReceipt] = useState(emptyReceipt)
  const [saved, setSaved] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: light)').matches)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const response = await fetch('/api/receipts')
        const payload = await response.json()
        if (!ignore && response.ok) setSaved(payload.receipts ?? [])
      } catch {
        if (!ignore) setSaved([])
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const canParse = Boolean(file) && status !== 'parsing'
  const canSave = status !== 'saving'

  const summary = useMemo(() => {
    const total = toNumber(receipt.total)
    const itemCount = receipt.items.filter((item) => item.name.trim()).length
    return `${itemCount} item${itemCount !== 1 ? 's' : ''} · ₹${total.toFixed(2)}`
  }, [receipt])

  const totalAmount = toNumber(receipt.total)

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setError('')
  }

  const handleParse = async () => {
    if (!file) return
    setStatus('parsing')
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch('/api/parse', { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.message || payload?.error || 'Parse failed')
      setReceipt(normalizeReceipt(payload.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setStatus('idle')
    }
  }

  const handleFieldChange = (field, value) =>
    setReceipt((prev) => ({ ...prev, [field]: value }))

  const handleItemChange = (index, field, value) =>
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => idx === index ? { ...item, [field]: value } : item),
    }))

  const handleAddItem = () =>
    setReceipt((prev) => ({ ...prev, items: [...prev.items, { name: '', amount: '' }] }))

  const handleRemoveItem = (index) =>
    setReceipt((prev) => {
      const nextItems = prev.items.filter((_, idx) => idx !== index)
      return { ...prev, items: nextItems.length ? nextItems : [{ name: '', amount: '' }] }
    })

  const handleSave = async () => {
    setStatus('saving')
    setError('')
    try {
      const payload = {
        merchant: receipt.merchant.trim(),
        date: receipt.date.trim(),
        items: receipt.items
          .map((item) => ({ name: item.name.trim(), amount: toNumber(item.amount) }))
          .filter((item) => item.name || item.amount),
        total: toNumber(receipt.total),
      }
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Save failed')
      setSaved((prev) => [data, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setStatus('idle')
    }
  }

  const handleSelectReceipt = async (id) => {
    if (!id) return
    setError('')
    try {
      const response = await fetch(`/api/receipts/${id}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to load receipt')
      const data = payload?.data ?? payload
      setReceipt(normalizeReceipt(data))
      setSelectedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt')
    }
  }

  const statusLabel = status === 'idle' ? 'Ready' : status === 'parsing' ? 'Parsing' : 'Saving'

  return (
    <div className="ui">
      <header className="topbar">
        <div className="topbar-brand">
          <Logo />
          <div>
            <div className="brand-name">Receipt Parser</div>
            <div className="brand-tagline">AI-powered extraction</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="topbar-summary">{summary}</span>
          <span className={`status-chip status-${status}`}>{statusLabel}</span>
        </div>
      </header>

      <section className="metrics">
        <div className="metric-card">
          <span className="metric-label">Saved receipts</span>
          <span className="metric-value">{saved.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Line items</span>
          <span className="metric-value">{receipt.items.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Current total</span>
          <span className="metric-value">₹{totalAmount.toFixed(2)}</span>
        </div>
      </section>

      <main className="workgrid">
        <section className="panel upload-panel">
          <div className="panel-head">
            <div><h2>Upload</h2><p>JPG or PNG, up to 10 MB</p></div>
            <span className="panel-num">01</span>
          </div>
          <div className="panel-body">
            <label className="dropzone">
              <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
              <span className="dropzone-icon">🧾</span>
              <span className="dropzone-title">{file ? file.name : 'Choose receipt image'}</span>
              <span className="dropzone-sub">Drag & drop or click to browse</span>
            </label>
            <button className="btn primary" onClick={handleParse} disabled={!canParse}>
              {status === 'parsing' ? 'Extracting…' : 'Extract data'}
            </button>
            {error && <div className="banner error">⚠ {error}</div>}
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-head">
            <div><h2>Preview</h2><p>Verify image before parsing</p></div>
            <span className="panel-num">02</span>
          </div>
          <div className="preview-wrap">
            {previewUrl
              ? <img src={previewUrl} alt="Receipt preview" />
              : <div className="preview-empty">No image selected</div>}
          </div>
        </section>

        <section className="panel editor-panel">
          <div className="panel-head">
            <div><h2>Extracted data</h2><p>Review and correct before saving</p></div>
            <span className="panel-num">03</span>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Merchant</span>
              <input value={receipt.merchant} onChange={(e) => handleFieldChange('merchant', e.target.value)} placeholder="Merchant name" />
            </label>
            <label className="field">
              <span>Date</span>
              <input value={receipt.date} onChange={(e) => handleFieldChange('date', e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
            <label className="field full">
              <span>Total amount</span>
              <input value={receipt.total} onChange={(e) => handleFieldChange('total', e.target.value)} placeholder="0.00" />
            </label>
          </div>
          <div className="items-panel">
            <div className="items-head">
              <h3>Line items</h3>
              <button className="btn ghost" onClick={handleAddItem}>+ Add item</button>
            </div>
            <div className="items-table">
              <div className="items-row header">
                <span>Description</span><span>Amount</span><span />
              </div>
              {receipt.items.map((item, index) => (
                <div className="items-row" key={`item-${index}`}>
                  <input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="Item name" />
                  <input value={item.amount} onChange={(e) => handleItemChange(index, 'amount', e.target.value)} placeholder="0.00" />
                  <button className="btn danger" onClick={() => handleRemoveItem(index)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-footer">
            <button className="btn primary wide" onClick={handleSave} disabled={!canSave}>
              {status === 'saving' ? 'Saving…' : 'Save receipt'}
            </button>
          </div>
        </section>

        <section className="panel history-panel">
          <div className="panel-head">
            <div><h2>Recent receipts</h2><p>Click a record to load it</p></div>
            <span className="panel-num">04</span>
          </div>
          <div className="history-list">
            {saved.length === 0 ? (
              <div className="history-empty">No saved receipts yet</div>
            ) : (
              saved.map((entry) => (
                <button key={entry.id}
                  className={`history-item${selectedId === entry.id ? ' is-selected' : ''}`}
                  onClick={() => handleSelectReceipt(entry.id)}>
                  <div className="history-item-info">
                    <div className="history-title">{entry.data?.merchant || 'Unknown merchant'}</div>
                    <div className="history-meta">{entry.data?.date || 'No date'}</div>
                  </div>
                  <div className="history-value">₹{toNumber(entry.data?.total).toFixed(2)}</div>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App