'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, Trash2, Megaphone, StickyNote, Eye, EyeOff } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

export interface AdminNote {
  id: string
  body: string
  pinned: boolean
  kind: 'note' | 'announcement'
  visibility?: 'admin' | 'parent'
  created_at: string
  author?: { first_name: string; last_name: string } | null
}

interface Props {
  /** REST base, e.g. /api/families/abc or /api/students/abc */
  apiBase: string
  notes: AdminNote[]
  subjectLabel: string
  /** When true, show admin/parent visibility toggle */
  supportsVisibility?: boolean
}

export default function AdminNotesPanel({ apiBase, notes, subjectLabel, supportsVisibility }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [kind, setKind] = useState<'note' | 'announcement'>('note')
  const [visibility, setVisibility] = useState<'admin' | 'parent'>('admin')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    await fetch(`${apiBase}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, pinned, kind, visibility }),
    })
    setBody(''); setPinned(false); setKind('note'); setVisibility('admin'); setBusy(false)
    router.refresh()
  }

  async function toggleVisibility(n: AdminNote) {
    const next = n.visibility === 'parent' ? 'admin' : 'parent'
    await fetch(`${apiBase}/notes/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: next }),
    })
    router.refresh()
  }

  async function del(noteId: string) {
    if (!confirm('Delete this entry?')) return
    await fetch(`${apiBase}/notes/${noteId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function togglePin(n: AdminNote) {
    await fetch(`${apiBase}/notes/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !n.pinned }),
    })
    router.refresh()
  }

  async function toggleKind(n: AdminNote) {
    const next = n.kind === 'announcement' ? 'note' : 'announcement'
    await fetch(`${apiBase}/notes/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: next }),
    })
    router.refresh()
  }

  const announcements = notes.filter(n => n.kind === 'announcement')
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
  const regular = notes.filter(n => n.kind !== 'announcement')
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="space-y-2 p-4 rounded-xl border border-gray-100 bg-gray-50">
        <textarea
          value={body} onChange={e => setBody(e.target.value)} rows={3}
          placeholder={`Private admin entry about this ${subjectLabel}…`}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-studio-500 bg-white"
        />
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
            <button type="button" onClick={() => setKind('note')}
              className={cn('px-2.5 py-1 rounded flex items-center gap-1', kind === 'note' ? 'bg-studio-100 text-studio-700' : 'text-gray-500 hover:text-gray-700')}>
              <StickyNote size={12} /> Note
            </button>
            <button type="button" onClick={() => setKind('announcement')}
              className={cn('px-2.5 py-1 rounded flex items-center gap-1', kind === 'announcement' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700')}>
              <Megaphone size={12} /> Announcement
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded text-studio-600 focus:ring-studio-500" />
            Pin to top
          </label>
          {supportsVisibility && (
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
              <button type="button" onClick={() => setVisibility('admin')}
                className={cn('px-2.5 py-1 rounded flex items-center gap-1', visibility === 'admin' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:text-gray-700')}>
                <EyeOff size={12} /> Admin only
              </button>
              <button type="button" onClick={() => setVisibility('parent')}
                className={cn('px-2.5 py-1 rounded flex items-center gap-1', visibility === 'parent' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700')}>
                <Eye size={12} /> Visible in parent portal
              </button>
            </div>
          )}
          <button type="submit" disabled={busy || !body.trim()} className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-studio-600 text-white hover:bg-studio-700 disabled:opacity-50">
            {busy ? 'Saving...' : `Add ${kind}`}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {kind === 'announcement'
            ? `Announcements show as a banner above this ${subjectLabel}'s page so admins see them first.`
            : `Notes are private to admins and shown below.`}
        </p>
      </form>

      {announcements.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Megaphone size={12} /> Announcements
          </h3>
          <div className="space-y-2">
            {announcements.map(n => (
              <NoteCard key={n.id} note={n} accent="amber" onPin={togglePin} onKind={toggleKind} onDelete={del} onVisibility={supportsVisibility ? toggleVisibility : undefined} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <StickyNote size={12} /> Notes
        </h3>
        {regular.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {regular.map(n => (
              <NoteCard key={n.id} note={n} accent="gray" onPin={togglePin} onKind={toggleKind} onDelete={del} onVisibility={supportsVisibility ? toggleVisibility : undefined} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({
  note, accent, onPin, onKind, onDelete, onVisibility,
}: {
  note: AdminNote
  accent: 'amber' | 'gray'
  onPin: (n: AdminNote) => void
  onKind: (n: AdminNote) => void
  onDelete: (id: string) => void
  onVisibility?: (n: AdminNote) => void
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      note.pinned && accent === 'amber' ? 'bg-amber-100 border-amber-300' :
      note.pinned ? 'bg-yellow-50 border-yellow-200' :
      accent === 'amber' ? 'bg-amber-50 border-amber-200' :
      'bg-gray-50 border-gray-100'
    )}>
      <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.body}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span>{note.author ? `${note.author.first_name} ${note.author.last_name}` : 'Admin'} · {formatDate(note.created_at)}</span>
          {note.visibility === 'parent' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"><Eye size={10} /> parent-visible</span>}
        </span>
        <div className="flex gap-2">
          {onVisibility && (
            <button onClick={() => onVisibility(note)}
              className={cn('hover:text-blue-700', note.visibility === 'parent' ? 'text-blue-600' : 'text-gray-400')}
              title={note.visibility === 'parent' ? 'Hide from parent portal' : 'Show in parent portal'}>
              {note.visibility === 'parent' ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          )}
          <button onClick={() => onKind(note)}
            className={cn('hover:text-amber-700', note.kind === 'announcement' ? 'text-amber-600' : 'text-gray-400')}
            title={note.kind === 'announcement' ? 'Demote to note' : 'Promote to announcement'}>
            <Megaphone size={13} />
          </button>
          <button onClick={() => onPin(note)}
            className={cn('hover:text-studio-700', note.pinned ? 'text-studio-600' : 'text-gray-400')}
            title={note.pinned ? 'Unpin' : 'Pin'}>
            <Pin size={13} />
          </button>
          <button onClick={() => onDelete(note.id)} className="text-gray-400 hover:text-red-500" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
