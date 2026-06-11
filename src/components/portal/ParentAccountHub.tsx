'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, Check, Plus, UserPlus, User, CreditCard, FileText,
  Sparkles, Send, ChevronRight,
} from 'lucide-react'

interface Profile {
  id?: string
  first_name?: string; last_name?: string; email?: string; phone?: string
  secondary_email?: string; secondary_phone?: string
  address_street?: string; address_city?: string; address_state?: string; address_zip?: string
  email_opt_in?: boolean; sms_opt_in?: boolean
}
interface Dancer { id: string; first_name: string; last_name: string; date_of_birth: string | null; relationship: string; active: boolean; member_no?: number | null }
interface Guardian { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null }

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-studio-500'
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1'
const card = 'bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden'

function age(dob: string | null) {
  if (!dob) return null
  const d = new Date(dob + 'T00:00:00')
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
}

export default function ParentAccountHub({ profile: initial, dancers, hasSelf }: { profile: Profile; dancers: Dancer[]; hasSelf: boolean }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>(initial)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [err, setErr] = useState('')

  function setP<K extends keyof Profile>(k: K, v: Profile[K]) { setProfile(p => ({ ...p, [k]: v })); setSavedProfile(false) }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true); setErr('')
    const { id, email, ...editable } = profile
    const res = await fetch('/api/portal/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editable) })
    setSavingProfile(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? 'Save failed'); return }
    setSavedProfile(true); router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* PROFILE */}
      <form onSubmit={saveProfile} className={card}>
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Your details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>First name</label><input required value={profile.first_name ?? ''} onChange={e => setP('first_name', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Last name</label><input required value={profile.last_name ?? ''} onChange={e => setP('last_name', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Phone</label><input type="tel" value={profile.phone ?? ''} onChange={e => setP('phone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input value={profile.email ?? ''} disabled className={`${inputCls} bg-gray-50 text-gray-500`} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Secondary email</label><input type="email" value={profile.secondary_email ?? ''} onChange={e => setP('secondary_email', e.target.value)} placeholder="Optional" className={inputCls} /></div>
            <div><label className={labelCls}>Secondary phone</label><input type="tel" value={profile.secondary_phone ?? ''} onChange={e => setP('secondary_phone', e.target.value)} placeholder="Optional" className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Street address</label><input value={profile.address_street ?? ''} onChange={e => setP('address_street', e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3"><label className={labelCls}>City</label><input value={profile.address_city ?? ''} onChange={e => setP('address_city', e.target.value)} className={inputCls} /></div>
            <div className="col-span-1"><label className={labelCls}>State</label><input value={profile.address_state ?? ''} onChange={e => setP('address_state', e.target.value)} className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>ZIP</label><input value={profile.address_zip ?? ''} onChange={e => setP('address_zip', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={profile.email_opt_in ?? true} onChange={e => setP('email_opt_in', e.target.checked)} className="rounded border-gray-300 text-studio-600" /> Email me studio updates & reminders</label>
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={profile.sms_opt_in ?? false} onChange={e => setP('sms_opt_in', e.target.checked)} className="rounded border-gray-300 text-studio-600" /> Text me time-sensitive alerts</label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingProfile} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {savingProfile && <Loader2 size={14} className="animate-spin" />} Save details
            </button>
            {savedProfile && <span className="flex items-center gap-1.5 text-sm text-green-600"><Check size={14} /> Saved</span>}
          </div>
        </div>
      </form>

      <DancersSection dancers={dancers} hasSelf={hasSelf} />

      <GuardiansSection />

      {/* BILLING + STATEMENTS */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/portal/billing" className={`${card} p-5 flex items-center gap-3 hover:border-studio-300 transition-colors`}>
          <FileText size={20} className="text-studio-600" />
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Statements & invoices</p><p className="text-xs text-gray-500">View what's due and your payment history.</p></div>
          <ChevronRight size={16} className="text-gray-300" />
        </Link>
        <Link href="/portal/payment-methods" className={`${card} p-5 flex items-center gap-3 hover:border-studio-300 transition-colors`}>
          <CreditCard size={20} className="text-studio-600" />
          <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Billing & payment methods</p><p className="text-xs text-gray-500">Manage how you pay the studio.</p></div>
          <ChevronRight size={16} className="text-gray-300" />
        </Link>
      </div>

      <MessageSection />
    </div>
  )
}

function DancersSection({ dancers, hasSelf }: { dancers: Dancer[]; hasSelf: boolean }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [selfOpen, setSelfOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '' })
  const [selfDob, setSelfDob] = useState('')

  async function addDancer() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.date_of_birth) { setErr('Name and date of birth are required'); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/portal/dancers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? 'Could not add'); return }
    setForm({ first_name: '', last_name: '', date_of_birth: '' }); setAdding(false); router.refresh()
  }
  async function registerSelf() {
    if (!selfDob) { setErr('Your date of birth is required'); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/portal/self-as-dancer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date_of_birth: selfDob }) })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? 'Could not register'); return }
    setSelfOpen(false); router.refresh()
  }

  return (
    <section className={card}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">Dancers</h2>
        <div className="flex items-center gap-2">
          {!hasSelf && (
            <button onClick={() => { setSelfOpen(o => !o); setAdding(false) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">
              <Sparkles size={13} /> I'm a dancer too
            </button>
          )}
          <button onClick={() => { setAdding(a => !a); setSelfOpen(false) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700">
            <Plus size={13} /> Add a dancer
          </button>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {dancers.length === 0 && !adding && <p className="text-sm text-gray-400">No dancers on your account yet.</p>}
        {dancers.map(d => (
          <Link key={d.id} href={`/portal/dancers/${d.id}`} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:border-studio-300 transition-colors">
            <div className="w-8 h-8 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 text-xs font-semibold">{d.first_name?.[0]}{d.last_name?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{d.first_name} {d.last_name}{d.relationship === 'self' && <span className="ml-1.5 text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">You</span>}</p>
              <p className="text-xs text-gray-400">
                {d.member_no != null && <span className="font-mono">#{d.member_no} · </span>}
                {age(d.date_of_birth) != null ? `${age(d.date_of_birth)} yrs` : '—'}{age(d.date_of_birth) != null && age(d.date_of_birth)! >= 18 ? ' · Adult dancer' : ''}
              </p>
            </div>
            <ChevronRight size={15} className="text-gray-300" />
          </Link>
        ))}

        {selfOpen && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-2">
            <p className="text-xs font-medium text-gray-700">Register yourself as an adult dancer — just confirm your date of birth.</p>
            <div className="flex items-center gap-2">
              <input type="date" value={selfDob} onChange={e => setSelfDob(e.target.value)} className={inputCls} />
              <button onClick={registerSelf} disabled={busy} className="px-3 py-2 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50 whitespace-nowrap">{busy ? '…' : 'Register me'}</button>
            </div>
          </div>
        )}
        {adding && (
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="First name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className={inputCls} />
              <input placeholder="Last name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className={inputCls} />
            </div>
            <label className={labelCls}>Date of birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className={inputCls} />
            <div className="flex items-center gap-2">
              <button onClick={addDancer} disabled={busy} className="px-3 py-2 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50">{busy ? '…' : 'Add dancer'}</button>
              <button onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        )}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </section>
  )
}

function GuardiansSection() {
  const router = useRouter()
  const [guardians, setGuardians] = useState<Guardian[] | null>(null)
  const [inviting, setInviting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' })

  useEffect(() => {
    fetch('/api/portal/guardians').then(async r => { const d = await r.json().catch(() => ({})); setGuardians(r.ok ? (d.guardians ?? []) : []) })
  }, [])

  async function invite() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) { setErr('All fields are required'); return }
    setBusy(true); setErr(''); setDone('')
    const res = await fetch('/api/portal/guardians', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? 'Could not invite'); return }
    setDone(`Invite sent to ${form.email}`); setForm({ first_name: '', last_name: '', email: '' }); setInviting(false); router.refresh()
  }

  return (
    <section className={card}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">Guardians</h2>
        <button onClick={() => setInviting(i => !i)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">
          <UserPlus size={13} /> Invite a guardian
        </button>
      </div>
      <div className="p-5 space-y-3">
        {guardians === null ? <p className="text-sm text-gray-400">Loading…</p> : guardians.length === 0 ? (
          <p className="text-sm text-gray-400">You're the only guardian on this account.</p>
        ) : guardians.map(g => (
          <div key={g.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
            <User size={16} className="text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{`${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || g.email}</p>
              <p className="text-xs text-gray-400 truncate">{g.email}{g.phone ? ` · ${g.phone}` : ''}</p>
            </div>
          </div>
        ))}
        {done && <p className="text-xs text-green-600">{done}</p>}
        {inviting && (
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="First name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className={inputCls} />
              <input placeholder="Last name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className={inputCls} />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            <div className="flex items-center gap-2">
              <button onClick={invite} disabled={busy} className="px-3 py-2 rounded-lg bg-studio-600 text-white text-xs font-medium hover:bg-studio-700 disabled:opacity-50">{busy ? '…' : 'Send invite'}</button>
              <button onClick={() => setInviting(false)} className="px-3 py-2 rounded-lg text-gray-600 text-xs font-medium hover:bg-gray-100">Cancel</button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        )}
      </div>
    </section>
  )
}

function MessageSection() {
  const [to, setTo] = useState<'studio' | 'instructor'>('studio')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function send() {
    if (!body.trim()) { setErr('Please write a message'); return }
    setBusy(true); setErr('')
    const res = await fetch('/api/portal/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body }) })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? 'Could not send'); return }
    setDone(true); setSubject(''); setBody('')
  }

  return (
    <section className={card}>
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">Message the studio</h2>
        <p className="text-xs text-gray-500 mt-0.5">Send a note to the front desk or your instructor — they'll see it on your family record.</p>
      </div>
      <div className="p-5 space-y-3">
        {done ? (
          <div className="flex items-center gap-2 text-sm text-green-600"><Check size={15} /> Sent — thank you! <button onClick={() => setDone(false)} className="text-studio-600 underline ml-1">Send another</button></div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button onClick={() => setTo('studio')} className={`px-3 py-1.5 font-medium ${to === 'studio' ? 'bg-studio-600 text-white' : 'text-gray-600'}`}>The studio</button>
                <button onClick={() => setTo('instructor')} className={`px-3 py-1.5 font-medium border-l border-gray-200 ${to === 'instructor' ? 'bg-studio-600 text-white' : 'text-gray-600'}`}>My instructor</button>
              </div>
            </div>
            <input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
            <textarea rows={4} placeholder="Write your message…" value={body} onChange={e => setBody(e.target.value)} className={inputCls} />
            {err && <p className="text-xs text-red-600">{err}</p>}
            <button onClick={send} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-studio-600 text-white text-sm font-medium hover:bg-studio-700 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send message
            </button>
          </>
        )}
      </div>
    </section>
  )
}
