'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InviteInstructorModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ emailed: boolean; acceptUrl: string; warning?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/instructor-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send invite')
        setSubmitting(false)
        return
      }
      setSuccess({ emailed: data.emailed, acceptUrl: data.acceptUrl, warning: data.warning })
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 12, padding: 24,
          maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Invite instructor</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          Sends a one-time signup link. The instructor sets their own password.
        </p>

        {success ? (
          <div>
            {success.emailed ? (
              <p style={{ fontSize: 14, color: '#059669', marginBottom: 12 }}>
                ✓ Invite emailed to <strong>{email}</strong>. Link expires in 7 days.
              </p>
            ) : (
              <p style={{ fontSize: 14, color: '#b45309', marginBottom: 12 }}>
                Invite created but email could not be sent. Share this link manually:
              </p>
            )}
            <input
              type="text" readOnly value={success.acceptUrl}
              onFocus={e => e.currentTarget.select()}
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 12, fontFamily: 'monospace', marginBottom: 12,
              }}
            />
            {success.warning && (
              <p style={{ fontSize: 12, color: '#b45309', marginBottom: 12 }}>{success.warning}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button" onClick={onClose}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 600,
                  background: 'var(--grad-1, #4f46e5)', color: 'white',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>First name</label>
                <input
                  type="text" required value={firstName}
                  onChange={e => setFirstName(e.target.value)} disabled={submitting}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Last name</label>
                <input
                  type="text" required value={lastName}
                  onChange={e => setLastName(e.target.value)} disabled={submitting}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)} disabled={submitting}
                placeholder="instructor@example.com"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button" onClick={onClose} disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 500,
                  background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6,
                }}
              >
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 600,
                  background: 'var(--grad-1, #4f46e5)', color: 'white',
                  border: 'none', borderRadius: 6, cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
