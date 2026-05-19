'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/Portal'

type Props = {
  invoiceId: string
  amount: number
  description: string
}

export default function PayInvoiceModal({ invoiceId, amount, description }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, amount, promoCode: promoCode.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Payment failed')
        return
      }
      if (data.comped) {
        setMessage(`Invoice comped via ${promoCode.toUpperCase()}. Marking paid…`)
        setTimeout(() => {
          setOpen(false)
          router.refresh()
        }, 1200)
        return
      }
      setMessage(
        data.promo
          ? `Promo applied (${data.promo.percent ?? '$' + data.promo.amountOff} off). Card entry coming soon — charge of $${data.amount.toFixed(2)} pending.`
          : 'Card entry coming soon — payment intent created.'
      )
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium"
        style={{ color: 'var(--grad-1)' }}
      >
        Pay →
      </button>

      {open && (
        <Portal>
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 12, padding: 24,
              maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pay invoice</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
              {description} · ${amount.toFixed(2)}
            </p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Promo code (optional)
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value)}
              placeholder="ADMIN100"
              disabled={submitting}
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 14, marginBottom: 16,
              }}
            />

            {error && (
              <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>
            )}
            {message && (
              <p style={{ fontSize: 13, color: '#059669', marginBottom: 12 }}>{message}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 500,
                  background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 14, fontWeight: 600,
                  background: 'var(--grad-1, #4f46e5)', color: 'white',
                  border: 'none', borderRadius: 6, cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? 'Processing…' : 'Pay'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  )
}
