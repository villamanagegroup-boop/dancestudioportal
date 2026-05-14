'use client'

import { useState } from 'react'
import { Send, Mail } from 'lucide-react'

interface Props {
  partyId: string
  contactEmail: string | null
  contactName: string
}

const field = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

export default function PartyCommsTab({ partyId, contactEmail, contactName }: Props) {
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
      const res = await fetch(`/api/parties/${partyId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to send')
      setResult(`Sent to ${json.sentTo}`)
      setSubject('')
      setBody('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-2xl">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Email the Contact</h2>
      </div>
      <div className="p-5 space-y-4">
        {contactEmail ? (
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <Mail size={14} /> {contactName} · <span className="text-gray-700">{contactEmail}</span>
          </p>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            No contact email on file — add one in the Overview tab to send messages.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} className={field} placeholder="Booking confirmation, reminder…" />
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
            disabled={sending || !contactEmail}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50"
          >
            <Send size={14} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
