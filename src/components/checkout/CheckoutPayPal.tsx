'use client'

import { useState } from 'react'
import {
  PayPalScriptProvider, PayPalButtons,
  PayPalCardFieldsProvider, PayPalNameField, PayPalNumberField,
  PayPalExpiryField, PayPalCVVField, usePayPalCardFields,
} from '@paypal/react-paypal-js'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

type Props = {
  /** Charge total, used for display/validation. */
  amount: number
  /** When false, the buttons/card are disabled (e.g. amount not yet valid). */
  canPay: boolean
  /** Body sent to /api/checkout/create-order. */
  createBody: () => Record<string, unknown>
  /** Extra fields merged with { orderId } for /api/checkout/capture-order. */
  captureBody: () => Record<string, unknown>
  onPaid: (amount: number) => void
  /** Called before starting an order; return false to abort (e.g. validation). */
  beforeStart?: () => boolean
}

export default function CheckoutPayPal({ amount, canPay, createBody, captureBody, onPaid, beforeStart }: Props) {
  const [error, setError] = useState<string | null>(null)

  if (!PAYPAL_CLIENT_ID) {
    return (
      <p style={{ fontSize: 13, color: '#b45309' }}>
        Payments aren&apos;t configured yet (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).
      </p>
    )
  }

  async function startOrder(): Promise<string> {
    setError(null)
    const res = await fetch('/api/checkout/create-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody()),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Could not start payment'); throw new Error(data.error) }
    return data.orderId
  }

  async function capture(orderId: string): Promise<boolean> {
    const res = await fetch('/api/checkout/capture-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...captureBody() }),
    })
    const out = await res.json()
    if (!res.ok) { setError(out.error ?? 'Payment could not be completed'); return false }
    onPaid(Number(out.amount) || amount)
    return true
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink-2)' }
  const disabled = !canPay

  return (
    <PayPalScriptProvider options={{
      clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture',
      components: 'buttons,card-fields',
    }}>
      <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
        <label style={labelStyle}>Pay with PayPal</label>
        <div style={{ marginBottom: 16 }}>
          <PayPalButtons
            forceReRender={[amount, canPay]}
            style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
            disabled={disabled}
            createOrder={async () => {
              if (beforeStart && !beforeStart()) throw new Error('Invalid')
              return startOrder()
            }}
            onApprove={async (data) => { await capture(data.orderID) }}
            onError={() => setError('PayPal error. Please try again.')}
          />
        </div>

        <label style={labelStyle}>Or pay by card</label>
        <CardFields startOrder={startOrder} capture={capture} setError={setError} beforeStart={beforeStart} />
      </div>

      {error && <p style={{ fontSize: 13, color: '#dc2626', marginTop: 12 }}>{error}</p>}
    </PayPalScriptProvider>
  )
}

function CardFields({ startOrder, capture, setError, beforeStart }: {
  startOrder: () => Promise<string>
  capture: (orderId: string) => Promise<boolean>
  setError: (v: string | null) => void
  beforeStart?: () => boolean
}) {
  const inputStyle: React.CSSProperties = {
    border: '1px solid #d1d5db', borderRadius: 8, padding: '2px 10px', minHeight: 40, marginBottom: 8, background: '#fff',
  }
  return (
    <PayPalCardFieldsProvider
      createOrder={async () => {
        if (beforeStart && !beforeStart()) throw new Error('Invalid')
        return startOrder()
      }}
      onApprove={async (data) => { await capture(data.orderID) }}
      onError={() => setError('Card payment error. Check the details and try again.')}
    >
      <PayPalNameField style={{ input: { 'font-size': '14px' } }} />
      <div style={inputStyle}><PayPalNumberField /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalExpiryField /></div>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalCVVField /></div>
      </div>
      <CardSubmit setError={setError} />
    </PayPalCardFieldsProvider>
  )
}

function CardSubmit({ setError }: { setError: (v: string | null) => void }) {
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
      style={{ width: '100%', padding: '11px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: busy ? 'wait' : 'pointer', marginTop: 4, background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
      {busy ? 'Processing…' : 'Pay by card'}
    </button>
  )
}
