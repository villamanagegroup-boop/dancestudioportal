'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Pin, Megaphone, StickyNote, GraduationCap, Home } from 'lucide-react'

export interface InboxNote {
  id: string
  body: string
  pinned: boolean
  kind: 'note' | 'announcement'
  created_at: string
  source: 'student' | 'family'
  personName: string
  href: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const chip = (active: boolean) => ({
  background: active ? 'var(--ink-1)' : 'rgba(20,24,80,0.06)',
  color: active ? '#fff' : 'var(--ink-2)',
})

export default function NotesInbox({ notes }: { notes: InboxNote[] }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | 'note' | 'announcement'>('all')
  const [source, setSource] = useState<'all' | 'student' | 'family'>('all')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return notes.filter(n => {
      if (kind !== 'all' && n.kind !== kind) return false
      if (source !== 'all' && n.source !== source) return false
      if (needle && !(`${n.personName} ${n.body}`.toLowerCase().includes(needle))) return false
      return true
    })
  }, [notes, q, kind, source])

  return (
    <div>
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-2.5 px-3.5 py-2 max-w-md" style={{ borderRadius: 999, background: 'rgba(255,255,255,0.65)', border: '1px solid var(--line)' }}>
          <Search size={16} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search notes…" className="flex-1 bg-transparent outline-none border-0 text-sm" style={{ color: 'var(--ink-1)' }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'note', 'announcement'] as const).map(k => (
            <button key={k} onClick={() => setKind(k)} className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize" style={chip(kind === k)}>
              {k === 'all' ? 'All kinds' : k === 'note' ? 'Notes' : 'Announcements'}
            </button>
          ))}
          <span className="w-px self-stretch mx-1" style={{ background: 'var(--line)' }} />
          {(['all', 'student', 'family'] as const).map(s => (
            <button key={s} onClick={() => setSource(s)} className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize" style={chip(source === s)}>
              {s === 'all' ? 'Everyone' : s === 'student' ? 'Students' : 'Families'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No notes match.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <Link
              key={`${n.source}-${n.id}`}
              href={n.href}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-1">
                {n.source === 'student'
                  ? <GraduationCap size={14} className="text-gray-400" />
                  : <Home size={14} className="text-gray-400" />}
                <span className="text-sm font-medium text-gray-900">{n.personName}</span>
                {n.kind === 'announcement'
                  ? <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"><Megaphone size={10} /> Announcement</span>
                  : <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"><StickyNote size={10} /> Note</span>}
                {n.pinned && <Pin size={12} className="text-studio-600" />}
                <span className="ml-auto text-xs text-gray-400">{relTime(n.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">{n.body}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
