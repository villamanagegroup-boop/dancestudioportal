'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'parent' | 'instructor'

type Props = {
  role: Role
  onClose: () => void
}

const LABELS: Record<Role, { title: string; subtitle: string; submit: string }> = {
  parent: {
    title: 'Invite family',
    subtitle: 'Sends a one-time signup link. The parent sets their own password and completes their profile.',
    submit: 'Send invite',
  },
  instructor: {
    title: 'Invite instructor',
    subtitle: 'Sends a one-time signup link. The instructor sets their own password.',
    submit: 'Send invite',
  },
}

export default function InviteAccountModal({ role, onClose }: Props) {
  const router = useRouter()
  const labels = LABELS[role]
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ emailed: boolean; acceptUrl: string; warning?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const metadata: Record<string, unknown> = {}
      if (role === 'parent' && phone.trim()) metadata.phone = phone.trim()

      const res = await fetch('/api/account-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          metadata,
        }),
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
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{labels.title}</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>{labels.subtitle}</p>

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
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)} disabled={submitting}
                placeholder={role === 'parent' ? 'parent@example.com' : 'instructor@example.com'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
              />
            </div>
            {role === 'parent' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Phone <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)} disabled={submitting}
                  placeholder="(555) 555-5555"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
                />
              </div>
            )}

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
                {submitting ? 'Sending…' : labels.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
