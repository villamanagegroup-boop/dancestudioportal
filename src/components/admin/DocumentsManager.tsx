'use client'

import { useEffect, useState } from 'react'
import { Upload, Download, Trash2, FileText, Loader2, AlertCircle } from 'lucide-react'

interface Doc {
  id: string
  name: string
  category: string
  description: string | null
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  uploaded_by: { first_name: string; last_name: string } | null
}

const CATEGORIES = ['general', 'contract', 'legal', 'branding', 'finance', 'import', 'other']

function formatBytes(n: number | null) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DocumentsManager() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin-documents')
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Failed to load')
      else setDocs(data.documents)
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this document permanently?')) return
    const res = await fetch('/api/admin-documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) load()
    else {
      const data = await res.json()
      setError(data.error ?? 'Delete failed')
    }
  }

  const filtered = filterCat === 'all' ? docs : docs.filter(d => d.category === filterCat)

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <select
          value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button
          type="button" onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
        >
          <Upload size={16} /> Upload document
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 14, color: '#666' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', border: '1px dashed #d1d5db', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <FileText size={32} style={{ color: '#9ca3af', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 14, color: '#6b7280' }}>No documents {filterCat !== 'all' && `in ${filterCat}`} yet.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.map((doc, idx) => (
            <div key={doc.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px auto',
              alignItems: 'center', gap: 12, padding: '12px 16px',
              borderTop: idx === 0 ? 'none' : '1px solid #f3f4f6',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{doc.name}</p>
                {doc.description && (
                  <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{doc.description}</p>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                background: '#f3f4f6', color: '#374151', textTransform: 'capitalize', width: 'fit-content',
              }}>
                {doc.category}
              </span>
              <span style={{ fontSize: 12, color: '#666' }}>{formatBytes(doc.file_size)}</span>
              <span style={{ fontSize: 12, color: '#666' }}>{formatDate(doc.uploaded_at)}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <a href={`/api/admin-documents/${doc.id}/download`} target="_blank" rel="noopener"
                  style={{ padding: 6, borderRadius: 6, background: 'transparent', border: '1px solid #d1d5db', display: 'flex' }}>
                  <Download size={14} />
                </a>
                <button type="button" onClick={() => handleDelete(doc.id)}
                  style={{ padding: 6, borderRadius: 6, background: 'transparent', border: '1px solid #fecaca', color: '#dc2626', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />}
    </div>
  )
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Pick a file'); return }
    setSubmitting(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name || file.name)
      fd.append('category', category)
      fd.append('description', description)
      const res = await fetch('/api/admin-documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Upload failed'); setSubmitting(false); return }
      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
      setSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={() => !submitting && onClose()}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Upload document</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>File</label>
            <input type="file" onChange={e => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''))
            }} required disabled={submitting} style={{ fontSize: 13 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={submitting}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} disabled={submitting}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={submitting} rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }} />
          </div>
          {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={submitting}
              style={{ padding: '8px 14px', fontSize: 14, fontWeight: 500, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{ padding: '8px 14px', fontSize: 14, fontWeight: 600, background: 'var(--grad-1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6 }}>
              {submitting ? <Loader2 size={14} className="animate-spin inline" /> : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
