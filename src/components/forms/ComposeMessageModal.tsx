'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  classes: { id: string; name: string }[]
  guardians: { id: string; first_name: string; last_name: string }[]
  instructors: { id: string; first_name: string; last_name: string }[]
}

const AUDIENCES: { value: string; label: string }[] = [
  { value: 'all_families', label: 'All Families' },
  { value: 'all_staff', label: 'All Staff' },
  { value: 'everyone', label: 'Everyone (Families + Staff)' },
  { value: 'class', label: 'A Specific Class' },
  { value: 'family', label: 'An Individual Family' },
  { value: 'staff_member', label: 'An Individual Staff Member' },
]

export default function ComposeMessageModal({ onClose, classes, guardians, instructors }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [form, setForm] = useState({
    comm_type: 'email',
    target_type: 'all_families',
    target_class_id: '',
    target_guardian_id: '',
    target_instructor_id: '',
    subject: '',
    body: '',
    scheduled_for: '',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.body.trim()) { setError('Message body is required.'); return }
    if (form.target_type === 'class' && !form.target_class_id) { setError('Select a class.'); return }
    if (form.target_type === 'family' && !form.target_guardian_id) { setError('Select a family.'); return }
    if (form.target_type === 'staff_member' && !form.target_instructor_id) { setError('Select a staff member.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Failed to send message')
      if (json.scheduled) {
        setResult(`Scheduled for ${json.recipientCount} recipient${json.recipientCount === 1 ? '' : 's'}.`)
      } else if (form.comm_type === 'announcement') {
        setResult(`Posted to the portal for ${json.recipientCount} recipient${json.recipientCount === 1 ? '' : 's'}.`)
      } else {
        setResult(`Sent — ${json.emailsSent} of ${json.recipientCount} email${json.recipientCount === 1 ? '' : 's'} delivered.`)
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-studio-500 focus:ring-1 focus:ring-studio-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Compose Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{result}</div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
              <select value={form.target_type} onChange={e => set('target_type', e.target.value)} className={inputCls}>
                {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            {form.target_type === 'class' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select value={form.target_class_id} onChange={e => set('target_class_id', e.target.value)} className={inputCls}>
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Goes to guardians of active enrollees.</p>
              </div>
            )}
            {form.target_type === 'family' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family *</label>
                <select value={form.target_guardian_id} onChange={e => set('target_guardian_id', e.target.value)} className={inputCls}>
                  <option value="">Select family…</option>
                  {guardians.map(g => <option key={g.id} value={g.id}>{g.last_name}, {g.first_name}</option>)}
                </select>
              </div>
            )}
            {form.target_type === 'staff_member' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                <select value={form.target_instructor_id} onChange={e => set('target_instructor_id', e.target.value)} className={inputCls}>
                  <option value="">Select staff member…</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.last_name}, {i.first_name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select value={form.comm_type} onChange={e => set('comm_type', e.target.value)} className={inputCls}>
                <option value="email">Email</option>
                <option value="announcement">Portal Announcement</option>
                <option value="reminder">Reminder / Alert</option>
                <option value="sms">SMS (not configured)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {form.comm_type === 'announcement'
                  ? 'Posts to the parent portal — no email is sent.'
                  : form.comm_type === 'sms'
                    ? 'SMS requires a provider to be configured.'
                    : 'Sends an email to every recipient.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} className={inputCls} placeholder="Optional but recommended" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={6} className={inputCls + ' resize-none'} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule For (optional)</label>
              <input type="datetime-local" value={form.scheduled_for} onChange={e => set('scheduled_for', e.target.value)} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Leave blank to send immediately.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
                <Send size={15} />
                {submitting ? 'Sending…' : form.scheduled_for ? 'Schedule' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
