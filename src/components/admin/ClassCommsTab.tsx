'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Mail, Megaphone, MessageCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ClassComm } from '@/components/admin/ClassDetail'

interface Props {
  classId: string
  communications: ClassComm[]
}

type Channel = 'email' | 'portal' | 'sms'

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function ClassCommsTab({ classId, communications }: Props) {
  const router = useRouter()
  const [channel, setChannel] = useState<Channel>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  async function send() {
    if (!body.trim()) {
      setError('Message body is required')
      return
    }
    setSending(true)
    setError('')
    setResult('')
    try {
      const res = await fetch(`/api/classes/${classId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, subject, body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setResult(
        channel === 'email'
          ? `Sent to ${json.recipientCount ?? 0} recipient(s)`
          : 'Announcement posted to the portal',
      )
      setSubject('')
      setBody('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const channels: { key: Channel; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { key: 'email', label: 'Email guardians', icon: <Mail size={15} /> },
    { key: 'portal', label: 'Portal announcement', icon: <Megaphone size={15} /> },
    { key: 'sms', label: 'SMS (not configured)', icon: <MessageCircle size={15} />, disabled: true },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Composer */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Message the Class</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {channels.map(c => (
              <button
                key={c.key}
                onClick={() => !c.disabled && setChannel(c.key)}
                disabled={c.disabled}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  channel === c.key
                    ? 'border-studio-500 bg-studio-50 text-studio-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                } ${c.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {channel !== 'sms' && (
            <p className="text-xs text-gray-400">
              {channel === 'email'
                ? 'Emails every guardian of an actively enrolled student.'
                : 'Posts an announcement visible to enrolled families in their portal.'}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className={field} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className={field + ' resize-none'} />
          </div>

          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {result && <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{result}</div>}

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
            >
              <Send size={14} /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">History</h2>
        </div>
        {communications.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nothing sent yet</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[28rem] overflow-y-auto">
            {communications.map(c => (
              <div key={c.id} className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                    {c.comm_type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{c.subject ?? '(no subject)'}</span>
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(c.sent_at ?? c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
