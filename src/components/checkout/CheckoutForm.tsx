'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import CheckoutPayPal from './CheckoutPayPal'
import { lineItemsTotal, type CheckoutLineItem } from '@/lib/checkout'

type Props = {
  slug: string
  studioName: string
  title: string
  description?: string | null
  lineItems: CheckoutLineItem[]
  fixedAmount: number | null
  allowCustomAmount: boolean
  minAmount?: number | null
  suggestedAmounts?: number[]
  collectContact: boolean
  requireContact: boolean
  thankYouMessage?: string | null
}

export default function CheckoutForm(props: Props) {
  const {
    slug, studioName, title, description, lineItems, fixedAmount,
    allowCustomAmount, minAmount, suggestedAmounts = [], collectContact, requireContact, thankYouMessage,
  } = props

  const [customAmount, setCustomAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [paid, setPaid] = useState<number | null>(null)

  const itemsTotal = useMemo(() => lineItemsTotal(lineItems), [lineItems])

  const amount = allowCustomAmount
    ? Math.round((Number(customAmount) || 0) * 100) / 100
    : (fixedAmount ?? itemsTotal)

  const contactOk = !requireContact || (!!email.trim() || !!name.trim())
  const amountOk = amount > 0 && (!minAmount || amount >= minAmount)
  const canPay = amountOk && contactOk

  function contact() {
    if (!collectContact) return undefined
    if (!name.trim() && !email.trim() && !phone.trim()) return undefined
    return { name, email, phone, marketingOptIn: optIn }
  }

  if (paid != null) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 4px' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
          <Check size={28} color="#fff" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 6 }}>Payment received</h2>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 8 }}>
          ${paid.toFixed(2)} to {studioName}
        </p>
        <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
          {thankYouMessage || 'Thank you! A confirmation has been sent by PayPal.'}
        </p>
      </div>
    )
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 10, background: '#fff',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink-2)' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-1)', marginBottom: description ? 4 : 14 }}>{title}</h1>
      {description && <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 16 }}>{description}</p>}

      {/* Order summary */}
      {!allowCustomAmount && lineItems.length > 0 && (
        <div style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          {lineItems.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-2)', marginBottom: 6 }}>
              <span>{it.label}{it.qty > 1 ? ` × ${it.qty}` : ''}</span>
              <span>${(it.amount * it.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--line, #e5e7eb)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--ink-1)' }}>
            <span>Total</span><span>${amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {!allowCustomAmount && lineItems.length === 0 && (
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink-1)', marginBottom: 16 }}>
          ${amount.toFixed(2)}
        </div>
      )}

      {/* Custom amount */}
      {allowCustomAmount && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Amount{minAmount ? ` (min $${minAmount.toFixed(2)})` : ''}</label>
          {suggestedAmounts.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {suggestedAmounts.map(a => (
                <button key={a} type="button" onClick={() => setCustomAmount(String(a))}
                  style={{ padding: '7px 14px', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid', borderColor: Number(customAmount) === a ? 'transparent' : '#d1d5db',
                    color: Number(customAmount) === a ? '#fff' : 'var(--ink-2)',
                    background: Number(customAmount) === a ? 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' : '#fff' }}>
                  ${a.toFixed(0)}
                </button>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--ink-3)' }}>$</span>
            <input type="number" inputMode="decimal" min={minAmount ?? 0} step="0.01" value={customAmount}
              onChange={e => setCustomAmount(e.target.value)} placeholder="0.00"
              style={{ ...fieldStyle, paddingLeft: 24, fontSize: 18, fontWeight: 600, marginBottom: 0 }} />
          </div>
        </div>
      )}

      {/* Contact capture */}
      {collectContact && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your details{requireContact ? '' : ' (optional)'}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={fieldStyle} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={fieldStyle} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" style={{ ...fieldStyle, marginBottom: 8 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
            <input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} />
            Keep me updated by email
          </label>
        </div>
      )}

      {requireContact && !contactOk && (
        <p style={{ fontSize: 12, color: '#b45309', marginBottom: 10 }}>Please enter your name or email to continue.</p>
      )}

      <CheckoutPayPal
        amount={amount}
        canPay={canPay}
        createBody={() => ({ slug, amount })}
        captureBody={() => ({ slug, contact: contact() })}
        onPaid={(amt) => setPaid(amt)}
      />
    </div>
  )
}
