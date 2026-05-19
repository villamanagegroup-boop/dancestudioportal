'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const REFERRAL_OPTIONS = [
  'Friend / family referral',
  'Google search',
  'Facebook / Instagram',
  'Drove by the studio',
  'Returning family',
  'Other',
]

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export default function SignupPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    referral_source: '',
    email_opt_in: true,
    sms_opt_in: false,
    has_dancer: false,
    dancer_first_name: '',
    dancer_last_name: '',
    dancer_dob: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.first_name, last_name: form.last_name, role: 'parent' },
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const completeRes = await fetch('/api/auth/parent-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: form.phone || undefined,
        address_street: form.address_street || undefined,
        address_city: form.address_city || undefined,
        address_state: form.address_state || undefined,
        address_zip: form.address_zip || undefined,
        referral_source: form.referral_source || undefined,
        email_opt_in: form.email_opt_in,
        sms_opt_in: form.sms_opt_in,
        dancer: form.has_dancer && form.dancer_first_name && form.dancer_dob
          ? {
              first_name: form.dancer_first_name,
              last_name: form.dancer_last_name || form.last_name,
              date_of_birth: form.dancer_dob,
            }
          : null,
      }),
    })

    if (!completeRes.ok) {
      const data = await completeRes.json().catch(() => ({}))
      setError(data.error ?? 'Signup completed but profile setup failed. Contact the studio.')
      setLoading(false)
      return
    }

    window.location.href = '/post-login'
  }

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid var(--line-2)',
    color: 'var(--ink-1)',
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="glass-strong p-8">
      <h2 className="h2 mb-6" style={{ color: 'var(--ink-1)' }}>Create Account</h2>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(220,38,38,.10)', border: '1px solid rgba(220,38,38,.25)', color: '#b91c1c' }}
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Your account">
          <Row>
            <Field label="First name">
              <input type="text" required value={form.first_name}
                onChange={e => update('first_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
            </Field>
            <Field label="Last name">
              <input type="text" required value={form.last_name}
                onChange={e => update('last_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
            </Field>
          </Row>
          <Field label="Email">
            <input type="email" required value={form.email} placeholder="you@example.com"
              onChange={e => update('email', e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
          </Field>
          <Field label="Password">
            <input type="password" required minLength={6} value={form.password} placeholder="••••••••"
              onChange={e => update('password', e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
          </Field>
          <Field label="Phone">
            <input type="tel" required value={form.phone} placeholder="(555) 555-5555"
              onChange={e => update('phone', e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
          </Field>
        </Section>

        <Section title="Address">
          <Field label="Street">
            <input type="text" value={form.address_street}
              onChange={e => update('address_street', e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <input type="text" value={form.address_city}
                onChange={e => update('address_city', e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
            </Field>
            <Field label="State">
              <select value={form.address_state}
                onChange={e => update('address_state', e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle}>
                <option value="">—</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="ZIP">
              <input type="text" value={form.address_zip} maxLength={10}
                onChange={e => update('address_zip', e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
            </Field>
          </div>
        </Section>

        <Section title="Your dancer (optional)">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={form.has_dancer}
              onChange={e => update('has_dancer', e.target.checked)} />
            Add a dancer now (you can add more later)
          </label>
          {form.has_dancer && (
            <>
              <Row>
                <Field label="Dancer first name">
                  <input type="text" value={form.dancer_first_name}
                    onChange={e => update('dancer_first_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
                </Field>
                <Field label="Dancer last name">
                  <input type="text" value={form.dancer_last_name}
                    placeholder={form.last_name || 'Same as yours'}
                    onChange={e => update('dancer_last_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
                </Field>
              </Row>
              <Field label="Date of birth">
                <input type="date" value={form.dancer_dob}
                  onChange={e => update('dancer_dob', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle} />
              </Field>
            </>
          )}
        </Section>

        <Section title="A little more">
          <Field label="How did you hear about us?">
            <select value={form.referral_source}
              onChange={e => update('referral_source', e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none" style={fieldStyle}>
              <option value="">Select one…</option>
              {REFERRAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={form.email_opt_in}
              onChange={e => update('email_opt_in', e.target.checked)} />
            Email me about classes, events, and studio news
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <input type="checkbox" checked={form.sms_opt_in}
              onChange={e => update('sms_opt_in', e.target.checked)} />
            Text me about urgent updates (cancellations, schedule changes)
          </label>
        </Section>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink-3)' }}>
        Already have an account?{' '}
        <Link href="/login" className="link">Sign in</Link>
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>{label}</label>
      {children}
    </div>
  )
}
