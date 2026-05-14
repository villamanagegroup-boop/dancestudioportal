'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, Download, FileText, Music, Shirt, File } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ClassFile } from '@/components/admin/ClassDetail'

interface Props {
  classId: string
  files: ClassFile[]
}

const CATEGORIES = [
  { key: 'costume', label: 'Costume', icon: <Shirt size={15} /> },
  { key: 'music', label: 'Music', icon: <Music size={15} /> },
  { key: 'document', label: 'Document', icon: <FileText size={15} /> },
  { key: 'other', label: 'Other', icon: <File size={15} /> },
]

function iconFor(category: string) {
  return CATEGORIES.find(c => c.key === category)?.icon ?? <File size={15} />
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ClassFilesTab({ classId, files }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('document')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', category)
      const res = await fetch(`/api/classes/${classId}/files`, { method: 'POST', body: fd })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Upload failed')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(fileId: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/classes/${classId}/files/${fileId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Delete failed')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900 mr-auto">Files</h2>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 cursor-pointer disabled:opacity-50">
          <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload'}
          <input ref={inputRef} type="file" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {files.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          No files yet — upload costumes, music, or documents for this class.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-gray-400">{iconFor(f.category)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">
                  <span className="capitalize">{f.category}</span>
                  {f.size_bytes ? ` · ${fmtSize(f.size_bytes)}` : ''} · {formatDate(f.created_at)}
                </p>
              </div>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-studio-600 hover:bg-gray-100"
                  aria-label="Download"
                >
                  <Download size={15} />
                </a>
              )}
              <button
                onClick={() => remove(f.id, f.name)}
                disabled={busy}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label="Delete file"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
