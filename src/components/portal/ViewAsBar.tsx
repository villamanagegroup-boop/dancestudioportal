'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'

interface Person {
  id: string
  label: string
}

interface Props {
  kind: 'g' | 'i'
  people: Person[]
  currentId: string | null
}

export default function ViewAsBar({ kind, people, currentId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function pick(id: string) {
    setBusy(true)
    try {
      await fetch('/api/portal/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const noun = kind === 'g' ? 'family' : 'instructor'

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className={`${kind === 'g' ? 'max-w-5xl' : 'max-w-4xl'} mx-auto px-4 py-2 flex items-center gap-2 flex-wrap`}>
        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <Eye size={14} /> Preview mode
        </span>
        <span className="text-xs text-amber-700">— viewing as a {noun}:</span>
        {people.length === 0 ? (
          <span className="text-xs text-amber-700">no {noun} accounts found</span>
        ) : (
          <select
            value={currentId ?? ''}
            disabled={busy}
            onChange={e => pick(e.target.value)}
            className="text-xs rounded-lg border border-amber-300 bg-white px-2 py-1 text-amber-900 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          >
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
