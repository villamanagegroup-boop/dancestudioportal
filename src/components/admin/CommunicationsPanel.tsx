'use client'

import { useState } from 'react'
import { formatDate, cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Communication {
  id: string
  subject: string | null
  body: string
  comm_type: string
  target_all: boolean
  sent_at: string | null
  created_at: string
  sender: { first_name: string; last_name: string } | null
}

interface Props {
  communications: Communication[]
  classes: { id: string; name: string }[]
}

export default function CommunicationsPanel({ communications, classes }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    subject: '',
    body: '',
    comm_type: 'email',
    target_all: true,
    target_class_id: '',
    scheduled_for: '',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'announcement', ...form }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to send')
      }
      setForm({ subject: '', body: '', comm_type: 'email', target_all: true, target_class_id: '', scheduled_for: '' })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compose */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Compose Message</h2>
        </div>
        <form onSubmit={handleSend} className="p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
            <div className="flex gap-3 mb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.target_all}
                  onChange={() => setForm(f => ({ ...f, target_all: true, target_class_id: '' }))}
                  className="text-studio-600"
                />
                All Families
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!form.target_all}
                  onChange={() => setForm(f => ({ ...f, target_all: false }))}
                  className="text-studio-600"
                />
                Specific Class
              </label>
            </div>
            {!form.target_all && (
              <select
                value={form.target_class_id}
                onChange={e => setForm(f => ({ ...f, target_class_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
              >
                <option value="">Select class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.comm_type}
              onChange={e => setForm(f => ({ ...f, comm_type: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
            >
              <option value="email">Email</option>
              <option value="announcement">Announcement</option>
              <option value="reminder">Reminder</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              required
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule For (optional)</label>
            <input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* Sent history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Sent History</h2>
        </div>
        {communications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No messages sent yet</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {communications.map(comm => (
              <div key={comm.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{comm.subject ?? '(no subject)'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{comm.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {comm.sender ? `${comm.sender.first_name} ${comm.sender.last_name}` : 'System'} · {formatDate(comm.created_at)}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full flex-shrink-0',
                    comm.sent_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {comm.sent_at ? 'Sent' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
