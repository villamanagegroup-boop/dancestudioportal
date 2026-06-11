'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Send, Download, Archive, ArchiveRestore, X, Loader2,
  CheckCircle2, XCircle, Clock, ScrollText,
} from 'lucide-react'

interface Policy {
  id: string
  name: string
  body: string | null
  category: string | null
  required: boolean
  active: boolean
  version: number
  slug: string | null
  stats: { accepted: number; denied: number; pending: number }
}

interface Draft {
  id?: string
  name: string
  category: string
  body: string
  required: boolean
  active: boolean
  bumpVersion: boolean
}

const EMPTY: Draft = { name: '', category: '', body: '', required: true, active: true, bumpVersion: false }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'policy'
}

export default function PoliciesManager({ policies, totalFamilies }: { policies: Policy[]; totalFamilies: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Draft | null>(null)
  const [sending, setSending] = useState<Policy | null>(null)
  const [busy, setBusy] = useState(false)

  function openNew() { setEditing({ ...EMPTY }) }
  function openEdit(p: Policy) {
    setEditing({ id: p.id, name: p.name, category: p.category ?? '', body: p.body ?? '', required: p.required, active: p.active, bumpVersion: false })
  }

  async function save() {
    if (!editing) return
    if (!editing.name.trim()) return
    setBusy(true)
    const isNew = !editing.id
    const url = isNew ? '/api/policies' : `/api/policies/${editing.id}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editing.name, category: editing.category, body: editing.body,
        required: editing.required, active: editing.active,
        bumpVersion: !isNew && editing.bumpVersion,
      }),
    })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? 'Save failed'); return }
    setEditing(null)
    router.refresh()
  }

  async function archive(p: Policy) {
    setBusy(true)
    if (p.active) {
      await fetch(`/api/policies/${p.id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/policies/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) })
    }
    setBusy(false)
    router.refresh()
  }

  function download(p: Policy) {
    const bar = '='.repeat(Math.min(60, p.name.length))
    const text = `${p.name}\n${bar}\nCapital Core Dance Studio — version ${p.version}\n\n${p.body ?? ''}\n`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${p.slug || slugify(p.name)}-v${p.version}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="glass glass-page min-h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Manage</p>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
            {policies.filter(p => p.active).length} active · {totalFamilies} families on file
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
          <Plus size={16} /> New policy
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <ScrollText size={32} className="text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No policies yet</p>
          <button onClick={openNew} className="text-sm text-studio-600 hover:underline">Create your first policy</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {policies.map(p => (
            <div key={p.id} className={`rounded-xl border p-4 ${p.active ? 'border-gray-150 bg-white' : 'border-gray-150 bg-gray-50/70 opacity-75'}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">v{p.version}</span>
                    {p.category && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">{p.category}</span>}
                    {p.required
                      ? <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Required</span>
                      : <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>}
                    {!p.active && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">Archived</span>}
                  </div>
                  {p.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-2xl">{p.body}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 size={13} /> {p.stats.accepted} accepted</span>
                    <span className="inline-flex items-center gap-1 text-red-500"><XCircle size={13} /> {p.stats.denied} denied</span>
                    <span className="inline-flex items-center gap-1 text-gray-400"><Clock size={13} /> {p.stats.pending} pending</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Pencil size={16} /></button>
                  <button onClick={() => setSending(p)} title="Send to families" className="p-1.5 rounded-lg text-gray-400 hover:text-studio-700 hover:bg-gray-100"><Send size={16} /></button>
                  <button onClick={() => download(p)} title="Download" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Download size={16} /></button>
                  <button onClick={() => archive(p)} disabled={busy} title={p.active ? 'Archive' : 'Restore'} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                    {p.active ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PolicyEditor draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} busy={busy} />
      )}
      {sending && (
        <SendModal policy={sending} totalFamilies={totalFamilies} onClose={() => setSending(null)} />
      )}
    </div>
  )
}

function PolicyEditor({ draft, setDraft, onSave, onClose, busy }: {
  draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onClose: () => void; busy: boolean
}) {
  const isNew = !draft.id
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{isNew ? 'New policy' : 'Edit policy'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Name</span>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Category</span>
              <input value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Financial, Waivers…" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Policy text</span>
            <textarea value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} rows={14} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono leading-relaxed focus:outline-none focus:border-studio-500" />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={draft.required} onChange={e => setDraft({ ...draft, required: e.target.checked })} className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} className="rounded border-gray-300 text-studio-600 focus:ring-studio-500" />
              Active (visible to families)
            </label>
            {!isNew && (
              <label className="flex items-center gap-2 text-sm text-amber-700">
                <input type="checkbox" checked={draft.bumpVersion} onChange={e => setDraft({ ...draft, bumpVersion: e.target.checked })} className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                Publish new version &amp; re-prompt families
              </label>
            )}
          </div>
          {!isNew && draft.bumpVersion && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Every family's previous acceptance becomes “outdated” and they'll be asked to accept again.
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button onClick={onSave} disabled={busy || !draft.name.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Create policy' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SendModal({ policy, totalFamilies, onClose }: { policy: Policy; totalFamilies: number; onClose: () => void }) {
  const router = useRouter()
  const [subject, setSubject] = useState(`Action needed: ${policy.name}`)
  const [message, setMessage] = useState(
    `${policy.name} is ready for your review.\n\nPlease sign in to your parent portal and open the Policies tab to read and accept it. If you have any concerns, you can deny and leave a note for our team to review.\n\nThank you,\nCapital Core Dance Studio`,
  )
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comm_type: 'email', subject, body: message, target_type: 'all_families' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error ?? 'Send failed')
      setDone(`Sent to ${j.recipientCount ?? totalFamilies} families.`)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Send to families</h2>
            <p className="text-xs text-gray-400 mt-0.5">Emails all {totalFamilies} active families with a link to review “{policy.name}”.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        {done ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle2 size={28} className="mx-auto text-green-600 mb-2" />
            <p className="text-sm text-gray-700">{done}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Subject</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Message</span>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500" />
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
              <button onClick={send} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
