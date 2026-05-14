'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MoreVertical, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

interface Props {
  /** API endpoint for this row, e.g. `/api/students/123` */
  endpoint: string
  /** Singular noun used in confirm prompts, e.g. "student" */
  entityLabel: string
  /** Whether the row is currently archived/inactive */
  archived: boolean
  /** PATCH body that archives the row, e.g. { active: false } */
  archivePatch: Record<string, unknown>
  /** PATCH body that restores the row, e.g. { active: true } */
  restorePatch: Record<string, unknown>
}

export default function RowActions({ endpoint, entityLabel, archived, archivePatch, restorePatch }: Props) {
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
      if (
        menuRef.current && !menuRef.current.contains(t) &&
        btnRef.current && !btnRef.current.contains(t)
      ) setOpen(false)
    }
    function onScrollOrResize() {
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(true)
  }

  async function run(method: 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
    setBusy(true)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Failed to update ${entityLabel}`)
      }
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  function onArchiveToggle() {
    run('PATCH', archived ? restorePatch : archivePatch)
  }

  function onDelete() {
    if (!confirm(`Permanently delete this ${entityLabel}? This cannot be undone.`)) return
    run('DELETE')
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={busy}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        aria-label="Row actions"
      >
        <MoreVertical size={16} />
      </button>
      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 1000 }}
          className="w-44 rounded-lg border border-gray-100 bg-white shadow-lg py-1"
        >
          <button
            type="button"
            onClick={onArchiveToggle}
            disabled={busy}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {archived ? 'Restore' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
