'use client'

import { useEffect, useState } from 'react'
import {
  PayPalScriptProvider, PayPalCardFieldsProvider, PayPalNameField,
  PayPalNumberField, PayPalExpiryField, PayPalCVVField, usePayPalCardFields,
} from '@paypal/react-paypal-js'
import { Trash2, Star, Plus, CreditCard } from 'lucide-react'

type Method = { id: string; card_brand: string | null; last_four: string | null; is_default: boolean }

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

/**
 * Manage saved PayPal-vaulted cards. Used by parents for their own cards
 * and by admins (pass guardianId) to manage a family's cards.
 */
export default function PaymentMethodsManager({ guardianId }: { guardianId?: string }) {
  const [methods, setMethods] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const qs = guardianId ? `?guardianId=${guardianId}` : ''

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/paypal/payment-methods${qs}`)
    const d = await res.json()
    if (res.ok) setMethods(d.methods ?? [])
    else setError(d.error ?? 'Failed to load')
    setLoading(false)
  }
  useEffect(() => { load() }, [guardianId])

  async function remove(id: string) {
    if (!confirm('Remove this card?')) return
    await fetch('/api/paypal/payment-methods', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, guardianId }),
    })
    load()
  }

  async function setDefault(id: string) {
    await fetch('/api/paypal/payment-methods', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, guardianId, makeDefault: true }),
    })
    load()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Payment methods</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {guardianId ? 'Cards on file for this family' : 'Your saved cards for faster checkout'}
          </p>
        </div>
        {!adding && PAYPAL_CLIENT_ID && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700">
            <Plus size={14} /> Add card
          </button>
        )}
      </div>

      <div className="p-5">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : methods.length === 0 && !adding ? (
          <div className="text-center py-8">
            <CreditCard size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No cards saved yet.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {methods.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-lg">
                <CreditCard size={18} className="text-gray-400" />
                <span className="flex-1 text-sm">
                  {m.card_brand ?? 'Card'} •••• {m.last_four ?? '????'}
                  {m.is_default && <span className="text-xs text-green-600 ml-2">default</span>}
                </span>
                {!m.is_default && (
                  <button onClick={() => setDefault(m.id)} title="Make default"
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => remove(m.id)} title="Remove"
                  className="p-1.5 rounded hover:bg-red-50 text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!PAYPAL_CLIENT_ID && (
          <p className="text-sm text-amber-700">PayPal isn&apos;t configured (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).</p>
        )}

        {adding && PAYPAL_CLIENT_ID && (
          <div className="border-t border-gray-100 pt-4">
            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, components: 'card-fields', currency: 'USD' }}>
              <AddCardForm
                guardianId={guardianId}
                onDone={() => { setAdding(false); load() }}
                onCancel={() => setAdding(false)}
                setError={setError}
              />
            </PayPalScriptProvider>
          </div>
        )}
      </div>
    </div>
  )
}

function AddCardForm({ guardianId, onDone, onCancel, setError }: {
  guardianId?: string
  onDone: () => void
  onCancel: () => void
  setError: (v: string | null) => void
}) {
  const inputStyle = { border: '1px solid #d1d5db', borderRadius: 6, padding: '2px 10px', minHeight: 38, marginBottom: 8 } as React.CSSProperties
  return (
    <PayPalCardFieldsProvider
      createVaultSetupToken={async () => {
        setError(null)
        const res = await fetch('/api/paypal/setup-token', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guardianId }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Could not start'); throw new Error(d.error) }
        return d.setupToken
      }}
      onApprove={async (data: any) => {
        const setupTokenId = data.vaultSetupToken ?? data.setupToken ?? data.orderID
        const res = await fetch('/api/paypal/save-card', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupTokenId, guardianId }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error ?? 'Could not save card'); return }
        onDone()
      }}
      onError={() => setError('Card error. Check the details and try again.')}
    >
      <PayPalNameField />
      <div style={inputStyle}><PayPalNumberField /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalExpiryField /></div>
        <div style={{ ...inputStyle, flex: 1 }}><PayPalCVVField /></div>
      </div>
      <AddCardButtons onCancel={onCancel} setError={setError} />
    </PayPalCardFieldsProvider>
  )
}

function AddCardButtons({ onCancel, setError }: { onCancel: () => void; setError: (v: string | null) => void }) {
  const { cardFieldsForm } = usePayPalCardFields()
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!cardFieldsForm) return
    const state = await cardFieldsForm.getState()
    if (!state.isFormValid) { setError('Please complete all card fields.'); return }
    setBusy(true); setError(null)
    // The real outcome is reported by the provider's onApprove (success → onDone)
    // and onError (card declined/invalid). submit() itself can reject *after* a
    // successful vault because onApprove unmounts this form mid-submit — so a
    // rejection here is NOT a reliable failure signal. Swallow it to avoid the
    // false "Could not save card" message.
    try { await cardFieldsForm.submit() }
    catch { /* outcome handled by onApprove / onError */ }
    finally { setBusy(false) }
  }
  return (
    <div className="flex gap-2 justify-end mt-2">
      <button type="button" onClick={onCancel} disabled={busy}
        className="px-4 py-2 text-sm rounded-lg border border-gray-200">Cancel</button>
      <button type="button" onClick={save} disabled={busy}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-studio-600 text-white disabled:opacity-50">
        {busy ? 'Saving…' : 'Save card'}
      </button>
    </div>
  )
}
