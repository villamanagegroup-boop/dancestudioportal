'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload, Trash2, FileText, Inbox, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Doc {
  id: string
  title: string
  document_type: string
  description: string | null
  source: string
  signed_at: string | null
}

export default function PortalDocuments({ shared, own }: { shared: Doc[]; own: Doc[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('document_type', 'general')
      const res = await fetch('/api/portal/documents', { method: 'POST', body: fd })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Upload failed') }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this document?')) return
    setBusy(id); setError('')
    try {
      const res = await fetch(`/api/portal/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Could not remove') }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  function Row({ d, canDelete }: { d: Doc; canDelete: boolean }) {
    return (
      <div className="tl-row no-lead">
        <div className="tl-main">
          <div className="t flex items-center gap-2"><FileText size={14} style={{ color: 'var(--ink-3)' }} /> {d.title}</div>
          <div className="s">
            {d.description ? d.description : d.document_type?.replace(/_/g, ' ')}
            {d.signed_at && <> · {formatDate(d.signed_at)}</>}
          </div>
        </div>
        <div className="tl-trail flex items-center gap-1.5">
          <a
            href={`/api/portal/documents/${d.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
          >
            <Download size={13} /> Download
          </a>
          {canDelete && (
            <button
              onClick={() => remove(d.id)}
              disabled={busy === d.id}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label="Remove document"
            >
              {busy === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Shared by the studio */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Shared with you</h2>
          <span className="text-xs text-gray-400">{shared.length}</span>
        </div>
        {shared.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>The studio hasn&apos;t shared any documents with you yet.</p>
        ) : (
          <div className="tight-list">
            {shared.map(d => <Row key={d.id} d={d} canDelete={false} />)}
          </div>
        )}
      </section>

      {/* Your uploads */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Your uploads</h2>
          <label className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 cursor-pointer">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Upload a document'}
            <input ref={inputRef} type="file" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
        </div>
        {own.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center rounded-xl border border-dashed border-gray-200">
            <Inbox size={26} className="text-gray-300" />
            <p className="muted" style={{ fontSize: 13 }}>Nothing uploaded yet. Add forms, doctor&apos;s notes, or anything the studio asks for.</p>
          </div>
        ) : (
          <div className="tight-list">
            {own.map(d => <Row key={d.id} d={d} canDelete />)}
          </div>
        )}
      </section>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
