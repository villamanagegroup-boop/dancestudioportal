'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Copy, Ban, Trash2, Archive } from 'lucide-react'
import type { CalItem, CalKind } from '@/lib/calendar'

// Collection endpoint per kind — POST to clone, PATCH/DELETE {base}/{id} to cancel.
const API: Record<CalKind, string> = {
  class: '/api/classes',
  event: '/api/calendar-events',
  camp: '/api/camps',
  party: '/api/parties',
  booking: '/api/bookings',
}

// Field whose value gets " (copy)" appended on duplicate.
const NAME_KEY: Record<CalKind, string> = {
  class: 'name', camp: 'name', event: 'title', booking: 'title', party: 'contact_name',
}

// How "Cancel" behaves per kind (archive vs. status vs. delete).
const CANCEL: Record<CalKind, { method: 'PATCH' | 'DELETE'; body?: Record<string, unknown>; label: string; confirm: string; danger?: boolean }> = {
  class: { method: 'PATCH', body: { active: false }, label: 'Archive', confirm: 'Archive this class? It will stop appearing on the calendar.' },
  camp: { method: 'PATCH', body: { active: false }, label: 'Archive', confirm: 'Archive this camp? It will stop appearing on the calendar.' },
  party: { method: 'PATCH', body: { status: 'cancelled' }, label: 'Cancel event', confirm: 'Mark this event as cancelled?' },
  booking: { method: 'PATCH', body: { status: 'cancelled' }, label: 'Cancel booking', confirm: 'Mark this booking as cancelled?' },
  event: { method: 'DELETE', label: 'Delete', confirm: 'Delete this calendar entry? This cannot be undone.', danger: true },
}

// Build a clean insert body: drop id/timestamps and any joined relation objects.
function cloneBody(raw: any, nameKey: string) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k === 'id' || k === 'created_at' || k === 'updated_at') continue
    if (v !== null && typeof v === 'object') continue // strip room/instructor/class_type joins
    out[k] = v
  }
  if (nameKey && typeof out[nameKey] === 'string') out[nameKey] = `${out[nameKey]} (copy)`
  return out
}

interface Props {
  item: CalItem
  onEdit: (item: CalItem) => void
  /** visual tone — light sits on colored event blocks, dark on white month cells */
  tone?: 'light' | 'dark'
}

export default function CalItemActions({ item, onEdit, tone = 'dark' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      const t = e.target as Node
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) setOpen(false)
    }
    function onScrollOrResize() { setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpen(true)
  }

  async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Action failed')
      }
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    send(API[item.kind], 'POST', cloneBody(item.raw, NAME_KEY[item.kind]))
  }

  function onCancel(e: React.MouseEvent) {
    e.stopPropagation()
    const cfg = CANCEL[item.kind]
    if (!confirm(cfg.confirm)) return
    send(`${API[item.kind]}/${item.sourceId}`, cfg.method, cfg.body)
  }

  function onEditClick(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    onEdit(item)
  }

  const cancelCfg = CANCEL[item.kind]
  const CancelIcon = cancelCfg.method === 'DELETE' ? Trash2 : cancelCfg.label.startsWith('Archive') ? Archive : Ban

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label="Item actions"
        className={`shrink-0 rounded p-0.5 transition-colors disabled:opacity-50 ${
          tone === 'light' ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
      >
        <MoreVertical size={tone === 'light' ? 13 : 14} />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 1000 }}
          className="w-40 rounded-lg border border-gray-100 bg-white shadow-lg py-1"
        >
          <button type="button" onClick={onEditClick} disabled={busy} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Pencil size={14} /> Edit
          </button>
          <button type="button" onClick={onDuplicate} disabled={busy} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Copy size={14} /> Duplicate
          </button>
          <button type="button" onClick={onCancel} disabled={busy} className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 disabled:opacity-50 ${cancelCfg.danger ? 'text-red-600' : 'text-gray-700 hover:text-red-600'}`}>
            <CancelIcon size={14} /> {cancelCfg.label}
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
