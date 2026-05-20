'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PayPalScriptProvider, PayPalButtons,
  PayPalCardFieldsProvider, PayPalNameField, PayPalNumberField,
  PayPalExpiryField, PayPalCVVField, usePayPalCardFields,
} from '@paypal/react-paypal-js'
import { Trash2 } from 'lucide-react'
import Portal from '@/components/Portal'

type Props = {
  invoiceId: string
  amount: number
  description: string
}

type SavedMethod = { id: string; card_brand: string | null; last_four: string | null; is_default: boolean }

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export default function PayInvoiceModal({ invoiceId, amount, description }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedMethod[]>([])
  const [saveCard, setSaveCard] = useState(true)

  useEffect(() => {
    if (!open) return
    fetch('/api/paypal/payment-methods').then(async r => {
      const d = await r.json()
      if (r.ok) setSaved(d.methods ?? [])
    }).catch(() => {})
  }, [open])

  function close() {
    setOpen(false); setPromoCode(''); setMessage(null); setError(null); setSubmitting(false)
  }

  function onPaid(msg: string) {
    setMessage(msg)
    setTimeout(() => { close(); router.refresh() }, 1200)
  }

  async function captureOrder(orderId: string) {
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, invoiceId }),
    })
    const out = await res.json()
    if (!res.ok) { setError(out.error ?? 'Capture failed'); return false }
    return true
  }

  async function payWithSaved(methodId: string) {
    setSubmitting(true); setError(null); setMessage(null)
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, savedMethodId: methodId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not start payment'); return }
      if (await captureOrder(data.orderId)) onPaid('Payment received! Marking paid…')
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteSaved(methodId: string) {
    if (!confirm('Remove this saved card?')) return
    await fetch('/api/paypal/payment-methods', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: methodId }),
    })
    setSaved(s => s.filter(m => m.id !== methodId))
  }

  async function applyPromo() {
    setSubmitting(true); setError(null); setMessage(null)
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, amount, promoCode: promoCode.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      if (data.comped) { onPaid(`Comped via ${promoCode.toUpperCase()}. Marking paid…`); return }
      setError('That code doesn’t cover the full amount. Use PayPal or a card below to pay the balance.')
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151' }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium" style={{ color: 'var(--grad-1)' }}>
        Pay →
      </button>

      {open && (
        <Portal>
          <div role="dialog" aria-modal="true"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => !submitting && close()}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 440, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '92vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pay invoice</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>{description} · ${amount.toFixed(2)}</p>

              {!PAYPAL_CLIENT_ID ? (
                <p style={{ fontSize: 13, color: '#b45309', marginBottom: 16 }}>
                  PayPal isn&apos;t configured yet (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).
                </p>
              ) : (
                <PayPalScriptProvider options={{
                  clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture',
                  components: 'buttons,card-fields',
                }}>
                  {/* Saved cards */}
                  {saved.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Saved cards</label>
                      {saved.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6 }}>
                          <span style={{ flex: 1, fontSize: 13 }}>
                            {m.card_brand ?? 'Card'} •••• {m.last_four ?? '????'}
                            {m.is_default && <span style={{ color: '#059669', fontSize: 11, marginLeft: 6 }}>default</span>}
                          </span>
                          <button type="button" disabled={submitting} onClick={() => payWithSaved(m.id)}
                            style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', background: 'var(--grad-1,#4f46e5)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            Pay ${amount.toFixed(2)}
                          </button>
                          <button type="button" onClick={() => deleteSaved(m.id)} title="Remove"
                            style={{ padding: 5, background: 'transparent', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #e5e7eb', margin: '14px 0' }} />
                    </div>
                  )}

                  {/* PayPal button */}
                  <label style={labelStyle}>Pay with PayPal</label>
                  <div style={{ marginBottom: 16 }}>
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                      disabled={submitting}
                      createOrder={async () => {
                        setError(null)
                        const res = await fetch('/api/paypal/create-order', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ invoiceId }),
                        })
                        const data = await res.json()
                        if (!res.ok) { setError(data.error ?? 'Could not start PayPal'); throw new Error(data.error) }
                        return data.orderId
                      }}
                      onApprove={async (data) => { await captureOrder(data.orderID) && onPaid('Payment received! Marking paid…') }}
                      onError={() => setError('PayPal error. Please try again.')}
                    />
                  </div>

                  {/* Card fields */}
                  <label style={labelStyle}>Or pay by card</label>
                  <CardFieldsBlock
                    invoiceId={invoiceId}
                    saveCard={saveCard}
                    setSaveCard={setSaveCard}
                    setError={setError}
                    onPaid={() => onPaid('Payment received! Marking paid…')}
                    captureOrder={captureOrder}
                  />
                </PayPalScriptProvider>
              )}

              <div style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />

              {/* Promo */}
              <label style={labelStyle}>Promo code (optional)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="ADMIN100" disabled={submitting}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
                <button type="button" onClick={applyPromo} disabled={submitting || !promoCode.trim()}
                  style={{ padding: '8px 14px', fontSize: 14, fontWeight: 600, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>
                  Apply
                </button>
              </div>

              {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</p>}
              {message && <p style={{ fontSize: 13, color: '#059669', marginBottom: 12 }}>{message}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={close} disabled={submitting}
                  style={{ padding: '8px 14px', fontSize: 14, fontWeight: 500, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6 }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}

// Card fields must live inside PayPalCardFieldsProvider; the submit button uses the hook.
function CardFieldsBlock({ invoiceId, saveCard, setSaveCard, setError, onPaid, captureOrder }: {
  invoiceId: string
  saveCard: boolean
  setSaveCard: (v: boolean) => void
  setError: (v: string | null) => void
  onPaid: () => void
  captureOrder: (orderId: string) => Promise<boolean>
}) {
  const inputStyle = {
    border: '1px solid #d1d5db', borderRadius: 6, padding: '2px 10px', minHeight: 38, marginBottom: 8,
  } as React.CSSProperties

  return (
    <PayPalCardFieldsProvider
      createOrder={async () => {
        setError(null)
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId, saveCard }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Could not start card payment'); throw new Error(data.error) }
        return data.orderId
      }}
      onApprove={async (data) => { (await captureOrder(data.orderID)) && onPaid() }}
      onError={() => setError('Card payment error. Check the details and try again.')}
    >
      <PayPalNameField style={{ input: { 'font-size': '14px' } }} />
      <div style={inputStyle}><PayPalNumberField /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalExpiryField /></div>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalCVVField /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '4px 0 12px' }}>
        <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
        Save this card for future payments
      </label>
      <CardSubmitButton setError={setError} />
    </PayPalCardFieldsProvider>
  )
}

function CardSubmitButton({ setError }: { setError: (v: string | null) => void }) {
  const { cardFieldsForm } = usePayPalCardFields()
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!cardFieldsForm) return
    const state = await cardFieldsForm.getState()
    if (!state.isFormValid) { setError('Please complete all card fields.'); return }
    setBusy(true); setError(null)
    try {
      await cardFieldsForm.submit()
    } catch {
      setError('Could not submit card. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" onClick={submit} disabled={busy}
      style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 600, background: 'var(--grad-1,#4f46e5)', color: 'white', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Processing…' : 'Pay by card'}
    </button>
  )
}
