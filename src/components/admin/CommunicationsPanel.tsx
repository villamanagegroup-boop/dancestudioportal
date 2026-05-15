'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Search, Plus, Mail, Megaphone, Bell, MessageSquare, Send, Trash2,
  Clock, Users, CheckCircle2, Inbox,
} from 'lucide-react'
import ComposeMessageModal from '@/components/forms/ComposeMessageModal'

interface Communication {
  id: string
  subject: string | null
  body: string
  comm_type: string
  target_type: string | null
  target_all: boolean
  sent_at: string | null
  scheduled_for: string | null
  created_at: string
  recipient_count: number
  sender: { first_name: string; last_name: string } | null
  target_class: { name: string } | null
  target_guardian: { first_name: string; last_name: string } | null
  target_instructor: { first_name: string; last_name: string } | null
}

interface RecipientRow {
  id: string
  delivered_at: string | null
  opened_at: string | null
  error: string | null
  guardian: { first_name: string; last_name: string; email: string } | null
}

interface Props {
  communications: Communication[]
  classes: { id: string; name: string }[]
  guardians: { id: string; first_name: string; last_name: string }[]
  instructors: { id: string; first_name: string; last_name: string }[]
}

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  email: { label: 'Email', icon: Mail, cls: 'bg-blue-100 text-blue-700' },
  announcement: { label: 'Announcement', icon: Megaphone, cls: 'bg-purple-100 text-purple-700' },
  reminder: { label: 'Reminder', icon: Bell, cls: 'bg-amber-100 text-amber-700' },
  sms: { label: 'SMS', icon: MessageSquare, cls: 'bg-gray-100 text-gray-600' },
}

function channelMeta(t: string) {
  return CHANNEL_META[t] ?? { label: t, icon: Mail, cls: 'bg-gray-100 text-gray-600' }
}

function audienceLabel(c: Communication) {
  switch (c.target_type) {
    case 'all_families': return 'All Families'
    case 'all_staff': return 'All Staff'
    case 'everyone': return 'Everyone'
    case 'class': return c.target_class ? `Class · ${c.target_class.name}` : 'A class'
    case 'family': return c.target_guardian ? `Family · ${c.target_guardian.first_name} ${c.target_guardian.last_name}` : 'A family'
    case 'staff_member': return c.target_instructor ? `Staff · ${c.target_instructor.first_name} ${c.target_instructor.last_name}` : 'A staff member'
    default: return c.target_all ? 'All Families' : 'Selected recipients'
  }
}

function dt(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-studio-600" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function CommunicationsPanel({ communications, classes, guardians, instructors }: Props) {
  const router = useRouter()
  const [showCompose, setShowCompose] = useState(false)
  const [query, setQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(communications[0]?.id ?? null)
  const [detail, setDetail] = useState<{ recipients: RecipientRow[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => {
    const sent = communications.filter(c => c.sent_at)
    const scheduled = communications.filter(c => !c.sent_at && c.scheduled_for)
    const reached = sent.reduce((s, c) => s + (c.recipient_count || 0), 0)
    return { total: communications.length, sent: sent.length, scheduled: scheduled.length, reached }
  }, [communications])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return communications.filter(c => {
      if (channelFilter && c.comm_type !== channelFilter) return false
      if (statusFilter === 'sent' && !c.sent_at) return false
      if (statusFilter === 'scheduled' && (c.sent_at || !c.scheduled_for)) return false
      if (q && !(`${c.subject ?? ''} ${c.body}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [communications, query, channelFilter, statusFilter])

  const selected = communications.find(c => c.id === selectedId) ?? null

  async function loadDetail(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/communications/${id}`)
      const json = await res.json()
      if (res.ok) setDetail({ recipients: json.recipients ?? [] })
    } finally {
      setDetailLoading(false)
    }
  }

  async function sendNow(id: string) {
    if (!confirm('Send this scheduled message now?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/communications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_now' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Permanently delete this message? Delivery records will also be removed.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/communications/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to delete')
      }
      if (selectedId === id) { setSelectedId(null); setDetail(null) }
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const selectCls = 'px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-studio-500'

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Inbox} label="Total Messages" value={String(stats.total)} />
        <StatCard icon={CheckCircle2} label="Sent" value={String(stats.sent)} />
        <StatCard icon={Clock} label="Scheduled" value={String(stats.scheduled)} />
        <StatCard icon={Users} label="Recipients Reached" value={String(stats.reached)} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search subject or message…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
          />
        </div>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className={selectCls}>
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="announcement">Announcement</option>
          <option value="reminder">Reminder</option>
          <option value="sms">SMS</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 transition-colors ml-auto"
        >
          <Plus size={16} /> Compose
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Inbox list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <Inbox size={28} className="text-gray-300" />
              <p className="text-sm text-gray-400">No messages match</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[640px] overflow-y-auto">
              {filtered.map(c => {
                const meta = channelMeta(c.comm_type)
                const isScheduled = !c.sent_at && c.scheduled_for
                return (
                  <button
                    key={c.id}
                    onClick={() => loadDetail(c.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                      selectedId === c.id && 'bg-studio-50 hover:bg-studio-50',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full', meta.cls)}>
                        <meta.icon size={11} /> {meta.label}
                      </span>
                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <Clock size={11} /> Scheduled
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{c.subject || '(no subject)'}</p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{c.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {audienceLabel(c)} · {isScheduled ? `for ${dt(c.scheduled_for)}` : dt(c.sent_at ?? c.created_at)}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          {!selected ? (
            <div className="py-24 flex flex-col items-center gap-2 text-center">
              <Mail size={28} className="text-gray-300" />
              <p className="text-sm text-gray-400">Select a message to view details</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">{selected.subject || '(no subject)'}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {audienceLabel(selected)} · {selected.recipient_count} recipient{selected.recipient_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!selected.sent_at && selected.scheduled_for && (
                    <button
                      onClick={() => sendNow(selected.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50"
                    >
                      <Send size={13} /> Send Now
                    </button>
                  )}
                  <button
                    onClick={() => remove(selected.id)}
                    disabled={busy}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Delete message"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400">Channel</span>
                    <p className="font-medium text-gray-700">{channelMeta(selected.comm_type).label}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Status</span>
                    <p className="font-medium text-gray-700">
                      {selected.sent_at ? `Sent ${dt(selected.sent_at)}` : selected.scheduled_for ? `Scheduled for ${dt(selected.scheduled_for)}` : 'Draft'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">From</span>
                    <p className="font-medium text-gray-700">
                      {selected.sender ? `${selected.sender.first_name} ${selected.sender.last_name}` : 'Studio Front Desk'}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.body}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Delivery {detail ? `(${detail.recipients.length})` : ''}
                  </p>
                  {detailLoading ? (
                    <p className="text-sm text-gray-400 py-3">Loading delivery records…</p>
                  ) : !detail || detail.recipients.length === 0 ? (
                    <p className="text-sm text-gray-400 py-3">
                      {selected.target_type === 'all_staff' || selected.target_type === 'staff_member'
                        ? 'Staff recipients are not tracked individually.'
                        : 'No per-recipient delivery records.'}
                    </p>
                  ) : (
                    <div className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {detail.recipients.map(r => (
                        <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">
                              {r.guardian ? `${r.guardian.first_name} ${r.guardian.last_name}` : 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{r.guardian?.email ?? ''}</p>
                          </div>
                          <span className={cn(
                            'text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0',
                            r.error ? 'bg-red-100 text-red-600'
                              : r.opened_at ? 'bg-green-100 text-green-700'
                                : r.delivered_at ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-500',
                          )}>
                            {r.error ? 'Failed' : r.opened_at ? 'Opened' : r.delivered_at ? 'Delivered' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <ComposeMessageModal
          onClose={() => setShowCompose(false)}
          classes={classes}
          guardians={guardians}
          instructors={instructors}
        />
      )}
    </>
  )
}
