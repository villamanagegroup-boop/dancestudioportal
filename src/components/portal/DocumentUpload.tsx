'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

interface Props {
  documentType: string
  title: string
}

export default function DocumentUpload({ documentType, title }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('document_type', documentType)
      fd.append('title', title)
      const res = await fetch('/api/portal/documents', { method: 'POST', body: fd })
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

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 cursor-pointer transition-colors">
        <Upload size={15} />
        {uploading ? 'Uploading…' : 'Upload'}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFile}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
