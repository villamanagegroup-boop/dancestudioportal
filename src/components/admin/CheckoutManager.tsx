'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Trash2, Plus, X, ExternalLink, Send } from 'lucide-react'
import CheckoutPayPal from '@/components/checkout/CheckoutPayPal'
import { lineItemsTotal, round2, type CheckoutLineItem } from '@/lib/checkout'

export type CheckoutLink = {
  id: string
  slug: string
  title: string
  description: string | null
  line_items: CheckoutLineItem[]
  amount: number | null
  allow_custom_amount: boolean
  min_amount: number | null
  suggested_amounts: number[]
  collect_contact: boolean
  require_contact: boolean
  thank_you_message: string | null
  active: boolean
  created_at: string
  recipient_email?: string | null
  recipient_name?: string | null
  email_sent_at?: string | null
}

export type CheckoutPaymentRow = {
  id: string
  description: string | null
  amount: number
  source: string
  created_at: string
  paypal_capture_id: string | null
}

export type PaidInfo = { total: number; count: number; latest: string }
export type PaidByLink = Record<string, PaidInfo>

export type CheckoutContactRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  marketing_opt_in: boolean
  created_at: string
}

type Tab = 'take' | 'links' | 'payments' | 'contacts'

const tabs: { key: Tab; label: string }[] = [
  { key: 'take', label: 'Take payment' },
  { key: 'links', label: 'Payment links' },
  { key: 'payments', label: 'Payments' },
  { key: 'contacts', label: 'Contacts' },
]

export default function CheckoutManager({ links, payments, paidByLink, contacts, studioName }: {
  links: CheckoutLink[]
  payments: CheckoutPaymentRow[]
  paidByLink: PaidByLink
  contacts: CheckoutContactRow[]
  studioName: string
}) {
  const [tab, setTab] = useState<Tab>('take')

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--line, #e5e7eb)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors"
            style={tab === t.key
              ? { borderColor: 'var(--grad-1)', color: 'var(--ink-1)' }
              : { borderColor: 'transparent', color: 'var(--ink-3)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'take' && <TakePayment studioName={studioName} />}
      {tab === 'links' && <LinksPanel links={links} paidByLink={paidByLink} />}
      {tab === 'payments' && <PaymentsTable payments={payments} />}
      {tab === 'contacts' && <ContactsTable contacts={contacts} />}
    </div>
  )
}

const card = 'bg-white rounded-xl border shadow-sm'
const cardBorder = { borderColor: 'var(--line, #e9e9f2)' } as React.CSSProperties
const field = 'w-full px-3 py-2 rounded-lg border text-sm'

/* ---------------- Take payment (staff ad-hoc) ---------------- */

function TakePayment({ studioName }: { studioName: string }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [items, setItems] = useState<CheckoutLineItem[]>([])
  const [useItems, setUseItems] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paidAmt, setPaidAmt] = useState<number | null>(null)

  const computed = useItems ? lineItemsTotal(items) : round2(Number(amount))
  const canPay = computed > 0 && title.trim().length > 0

  function contact() {
    if (!name.trim() && !email.trim() && !phone.trim()) return undefined
    return { name, email, phone, marketingOptIn: false }
  }

  if (paidAmt != null) {
    return (
      <div className={card} style={{ ...cardBorder, maxWidth: 460 }}>
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
            <Check size={24} color="#fff" />
          </div>
          <p className="font-semibold" style={{ color: 'var(--ink-1)' }}>Payment received</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>${paidAmt.toFixed(2)} · {title || 'Payment'}</p>
          <button onClick={() => { setPaidAmt(null); setTitle(''); setAmount(''); setItems([]); setUseItems(false); setName(''); setEmail(''); setPhone('') }}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
            Take another payment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 gap-5 items-start">
      <div className={card} style={cardBorder}>
        <div className="px-5 py-4 border-b" style={cardBorder}>
          <h2 className="font-semibold" style={{ color: 'var(--ink-1)' }}>Charge details</h2>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>One-off payment taken at the desk.</p>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>What&apos;s this for?</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Recital tickets" className={field} style={cardBorder} />
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={useItems} onChange={e => setUseItems(e.target.checked)} />
            Itemize the charge
          </label>

          {useItems ? (
            <LineItemsEditor items={items} setItems={setItems} />
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>Amount</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={field} style={cardBorder} />
            </div>
          )}

          <div className="pt-2 border-t" style={cardBorder}>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>Customer (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={`${field} mb-2`} style={cardBorder} />
            <div className="flex gap-2">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={field} style={cardBorder} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className={field} style={cardBorder} />
            </div>
          </div>
        </div>
      </div>

      <div className={card} style={cardBorder}>
        <div className="px-5 py-4 border-b" style={cardBorder}>
          <h2 className="font-semibold" style={{ color: 'var(--ink-1)' }}>Collect ${computed > 0 ? computed.toFixed(2) : '0.00'}</h2>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>{studioName}</p>
        </div>
        <div className="p-5">
          {!canPay && <p className="text-sm mb-3" style={{ color: 'var(--ink-3)' }}>Enter a description and amount to enable payment.</p>}
          <CheckoutPayPal
            amount={computed}
            canPay={canPay}
            createBody={() => ({ amount: computed, description: title, lineItems: useItems ? items : [] })}
            captureBody={() => ({ description: title, lineItems: useItems ? items : [], contact: contact() })}
            onPaid={(amt) => setPaidAmt(amt)}
          />
        </div>
      </div>
    </div>
  )
}

function LineItemsEditor({ items, setItems }: { items: CheckoutLineItem[]; setItems: (v: CheckoutLineItem[]) => void }) {
  function update(i: number, patch: Partial<CheckoutLineItem>) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input value={it.label} onChange={e => update(i, { label: e.target.value })} placeholder="Item" className="flex-1 px-3 py-2 rounded-lg border text-sm" style={cardBorder} />
          <input type="number" min="1" value={it.qty} onChange={e => update(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className="w-16 px-2 py-2 rounded-lg border text-sm" style={cardBorder} />
          <input type="number" min="0" step="0.01" value={it.amount} onChange={e => update(i, { amount: Number(e.target.value) || 0 })} placeholder="0.00" className="w-24 px-2 py-2 rounded-lg border text-sm" style={cardBorder} />
          <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg" style={{ color: '#dc2626' }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button onClick={() => setItems([...items, { label: '', amount: 0, qty: 1 }])} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--grad-1)' }}>
        <Plus size={15} /> Add line item
      </button>
    </div>
  )
}

/* ---------------- Payment links ---------------- */

function LinksPanel({ links: initial, paidByLink }: { links: CheckoutLink[]; paidByLink: PaidByLink }) {
  const router = useRouter()
  const [links, setLinks] = useState(initial)
  const [showOnly, setShowOnly] = useState<'all' | 'unpaid' | 'paid'>('all')

  // Only fixed-amount, active links count toward "expected to be paid".
  const billable = links.filter(l => l.active && !l.allow_custom_amount)
  const paidLinks = billable.filter(l => paidByLink[l.id])
  const unpaidLinks = billable.filter(l => !paidByLink[l.id])
  const collected = billable.reduce((s, l) => s + (paidByLink[l.id]?.total ?? 0), 0)
  const expected = billable.reduce((s, l) => s + Number(l.amount ?? lineItemsTotal(l.line_items)), 0)
  const outstanding = Math.max(0, expected - collected)

  const visible = showOnly === 'paid'
    ? links.filter(l => paidByLink[l.id])
    : showOnly === 'unpaid'
      ? links.filter(l => l.active && !l.allow_custom_amount && !paidByLink[l.id])
      : links
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  async function sendTuition() {
    const tuitionCount = links.filter(l => l.slug.startsWith('tuition-') && l.active).length
    if (!confirm(`Email the tuition pay link to ${tuitionCount} parent(s) who haven't been sent yet?`)) return
    setSending(true); setSendMsg(null)
    try {
      const res = await fetch('/api/checkout/send-tuition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugPrefix: 'tuition-' }),
      })
      const d = await res.json()
      if (!res.ok) { setSendMsg(d.error ?? 'Send failed'); return }
      setSendMsg(`Sent ${d.sent}, skipped ${d.skipped} already-sent${d.errors?.length ? `, ${d.errors.length} errors` : ''}.`)
    } catch (e: any) {
      setSendMsg(e?.message ?? 'Network error')
    } finally {
      setSending(false)
    }
  }

  async function toggleActive(l: CheckoutLink) {
    const res = await fetch(`/api/checkout/links/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !l.active }),
    })
    if (res.ok) setLinks(ls => ls.map(x => x.id === l.id ? { ...x, active: !x.active } : x))
  }

  async function remove(l: CheckoutLink) {
    if (!confirm(`Delete "${l.title}"? The link will stop working.`)) return
    const res = await fetch(`/api/checkout/links/${l.id}`, { method: 'DELETE' })
    if (res.ok) setLinks(ls => ls.filter(x => x.id !== l.id))
  }

  function copy(slug: string) {
    const url = `${origin}/pay/${slug}`
    navigator.clipboard?.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Shareable, branded payment pages.</p>
        <div className="flex items-center gap-2">
          <button onClick={sendTuition} disabled={sending} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border disabled:opacity-50" style={cardBorder}>
            <Send size={15} /> {sending ? 'Sending…' : 'Send tuition emails'}
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
            <Plus size={16} /> New link
          </button>
        </div>
      </div>
      {sendMsg && <p className="text-sm mb-3" style={{ color: 'var(--ink-2)' }}>{sendMsg}</p>}

      {billable.length > 0 && (
        <div className={`${card} mb-3 px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm`} style={cardBorder}>
          <span style={{ color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--ink-1)' }}>{paidLinks.length}</strong> of {billable.length} paid
          </span>
          <span style={{ color: '#15803d' }}>${collected.toFixed(2)} collected</span>
          <span style={{ color: outstanding > 0 ? '#b45309' : 'var(--ink-3)' }}>${outstanding.toFixed(2)} outstanding</span>
          <div className="ml-auto flex gap-1">
            {(['all', 'unpaid', 'paid'] as const).map(opt => (
              <button key={opt} onClick={() => setShowOnly(opt)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border capitalize"
                style={showOnly === opt
                  ? { borderColor: 'var(--grad-1)', color: 'var(--ink-1)', background: 'rgba(99,102,241,0.06)' }
                  : { ...cardBorder, color: 'var(--ink-3)' }}>
                {opt}{opt === 'unpaid' ? ` (${unpaidLinks.length})` : opt === 'paid' ? ` (${paidLinks.length})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <NewLinkForm
          onClose={() => setShowForm(false)}
          onCreated={(l) => { setLinks(ls => [l, ...ls]); setShowForm(false); router.refresh() }}
        />
      )}

      {visible.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-4)' }}>
          {links.length === 0 ? 'No payment links yet.' : 'No links match this filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(l => {
            const paid = paidByLink[l.id]
            const isBillable = l.active && !l.allow_custom_amount
            return (
            <div key={l.id} className={`${card} flex items-center gap-3 px-4 py-3`} style={cardBorder}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate" style={{ color: 'var(--ink-1)' }}>{l.title}</p>
                  {l.recipient_name && (
                    <span className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>· {l.recipient_name}</span>
                  )}
                  {!l.active && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#fee2e2', color: '#b91c1c' }}>inactive</span>}
                  {paid ? (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
                      Paid ${paid.total.toFixed(2)} · {new Date(paid.latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ) : isBillable ? (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>Unpaid</span>
                  ) : null}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>
                  {l.allow_custom_amount ? 'Custom amount' : `$${(l.amount ?? lineItemsTotal(l.line_items)).toFixed(2)}`} · /pay/{l.slug}
                </p>
              </div>
              <a href={`/pay/${l.slug}`} target="_blank" rel="noreferrer" title="Open" className="p-2 rounded-lg" style={{ color: 'var(--ink-3)' }}><ExternalLink size={16} /></a>
              <button onClick={() => copy(l.slug)} title="Copy link" className="p-2 rounded-lg" style={{ color: 'var(--ink-3)' }}>
                {copied === l.slug ? <Check size={16} color="#059669" /> : <Copy size={16} />}
              </button>
              <button onClick={() => toggleActive(l)} className="text-xs font-medium px-2 py-1 rounded-lg border" style={cardBorder}>
                {l.active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => remove(l)} title="Delete" className="p-2 rounded-lg" style={{ color: '#dc2626' }}><Trash2 size={16} /></button>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function NewLinkForm({ onClose, onCreated }: { onClose: () => void; onCreated: (l: CheckoutLink) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allowCustom, setAllowCustom] = useState(false)
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [suggested, setSuggested] = useState('')
  const [items, setItems] = useState<CheckoutLineItem[]>([])
  const [useItems, setUseItems] = useState(false)
  const [collectContact, setCollectContact] = useState(true)
  const [requireContact, setRequireContact] = useState(false)
  const [thankYou, setThankYou] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/checkout/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          allowCustomAmount: allowCustom,
          amount: allowCustom ? undefined : (useItems ? undefined : Number(amount)),
          lineItems: useItems ? items : [],
          minAmount: allowCustom && minAmount ? Number(minAmount) : undefined,
          suggestedAmounts: allowCustom && suggested
            ? suggested.split(',').map(s => Number(s.trim())).filter(Boolean)
            : [],
          collectContact, requireContact,
          thankYouMessage: thankYou || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not create link'); return }
      onCreated(data.link)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${card} mb-4`} style={cardBorder}>
      <div className="px-5 py-3 border-b flex justify-between items-center" style={cardBorder}>
        <h3 className="font-semibold" style={{ color: 'var(--ink-1)' }}>New payment link</h3>
        <button onClick={onClose} style={{ color: 'var(--ink-3)' }}><X size={18} /></button>
      </div>
      <div className="p-5 space-y-3">
        {error && <div className="p-2.5 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Spring Recital Tickets)" className={field} style={cardBorder} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className={field} style={cardBorder} />

        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
          <input type="checkbox" checked={allowCustom} onChange={e => setAllowCustom(e.target.checked)} />
          Let the payer enter their own amount
        </label>

        {allowCustom ? (
          <div className="flex gap-2">
            <input type="number" min="0" step="0.01" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="Min amount (optional)" className={field} style={cardBorder} />
            <input value={suggested} onChange={e => setSuggested(e.target.value)} placeholder="Suggested e.g. 25, 50, 100" className={field} style={cardBorder} />
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={useItems} onChange={e => setUseItems(e.target.checked)} />
              Itemize
            </label>
            {useItems
              ? <LineItemsEditor items={items} setItems={setItems} />
              : <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className={field} style={cardBorder} />}
          </>
        )}

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={collectContact} onChange={e => setCollectContact(e.target.checked)} />
            Ask for contact info
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={requireContact} disabled={!collectContact} onChange={e => setRequireContact(e.target.checked)} />
            Require it
          </label>
        </div>

        <input value={thankYou} onChange={e => setThankYou(e.target.value)} placeholder="Thank-you message (optional)" className={field} style={cardBorder} />

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border" style={cardBorder}>Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--grad-1), var(--grad-2))' }}>
            {saving ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Payments + Contacts ---------------- */

function PaymentsTable({ payments }: { payments: CheckoutPaymentRow[] }) {
  if (payments.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-4)' }}>No payments yet.</p>
  return (
    <div className={card} style={cardBorder}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--ink-3)' }} className="text-left">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
            <th className="px-4 py-2.5 font-medium">Source</th>
            <th className="px-4 py-2.5 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-t" style={cardBorder}>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-3)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-1)' }}>{p.description ?? '—'}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-3)' }}>{p.source}</td>
              <td className="px-4 py-2.5 text-right font-medium" style={{ color: 'var(--ink-1)' }}>${Number(p.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContactsTable({ contacts }: { contacts: CheckoutContactRow[] }) {
  if (contacts.length === 0) return <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-4)' }}>No contacts captured yet.</p>
  return (
    <div className={card} style={cardBorder}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--ink-3)' }} className="text-left">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="px-4 py-2.5 font-medium">Phone</th>
            <th className="px-4 py-2.5 font-medium">Opt-in</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(c => (
            <tr key={c.id} className="border-t" style={cardBorder}>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-1)' }}>{c.name ?? '—'}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-2)' }}>{c.email ?? '—'}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-2)' }}>{c.phone ?? '—'}</td>
              <td className="px-4 py-2.5" style={{ color: 'var(--ink-3)' }}>{c.marketing_opt_in ? 'Yes' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
