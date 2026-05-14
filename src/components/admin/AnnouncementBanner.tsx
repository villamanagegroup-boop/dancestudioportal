import { Megaphone } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AdminNote } from './AdminNotesPanel'

export default function AnnouncementBanner({ notes }: { notes: AdminNote[] }) {
  if (notes.length === 0) return null
  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-700">
        <Megaphone size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide">Admin announcement{sorted.length > 1 ? 's' : ''}</span>
      </div>
      <ul className="space-y-1.5">
        {sorted.map(n => (
          <li key={n.id} className="text-sm text-amber-900">
            <span className="whitespace-pre-wrap">{n.body}</span>
            <span className="ml-2 text-xs text-amber-700/70">— {formatDate(n.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
