'use client'

import { useState } from 'react'
import { X, Mail, Megaphone, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  enrollmentIds: string[]
}

type Channel = 'email' | 'portal'

const field =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function EnrollmentEmailModal({ onClose, enrollmentIds }: Props) {
  const router = useRouter()
  const [channel, setChannel] = useState<Channel>('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  async function send() {
    if (!body.trim()) {
      setError('Message body is required.')
      return
    }
    setSending(true)
    setError('')
    setResult('')
    try {
      const res = await fetch('/api/enrollments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentIds, subject, body, channel }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setResult(
        channel === 'email'
          ? `Sent to ${json.recipientCount ?? 0} family/families`
          : 'Announcement logged',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Message {enrollmentIds.length} Enrollment{enrollmentIds.length === 1 ? '' : 's'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setChannel('email')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                channel === 'email'
                  ? 'border-studio-500 bg-studio-50 text-studio-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Mail size={15} /> Email
            </button>
            <button
              onClick={() => setChannel('portal')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                channel === 'portal'
                  ? 'border-studio-500 bg-studio-50 text-studio-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Megaphone size={15} /> Portal
            </button>
          </div>

          <p className="text-xs text-gray-400">
            {channel === 'email'
              ? 'Emails every guardian linked to the selected enrollments (deduplicated).'
              : 'Logs an announcement record without sending email.'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={field}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className={field + ' resize-none'}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          {result && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              {result}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
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
    </div>
  )
}
