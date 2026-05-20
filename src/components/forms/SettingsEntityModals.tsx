'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SlideOver from '@/components/SlideOver'

type Mode = 'create' | 'edit'

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <SlideOver title={title} onClose={onClose}>
      <div style={{ padding: 24 }}>
        {children}
      </div>
    </SlideOver>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }
const btnPrimary: React.CSSProperties = {
  padding: '8px 14px', fontSize: 14, fontWeight: 600,
  background: 'var(--grad-1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', fontSize: 14, fontWeight: 500,
  background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6,
}

function Footer({ submitting, onClose, label }: { submitting: boolean; onClose: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <button type="button" onClick={onClose} disabled={submitting} style={btnSecondary}>Cancel</button>
      <button type="submit" disabled={submitting} style={{ ...btnPrimary, cursor: submitting ? 'wait' : 'pointer' }}>
        {submitting ? 'Saving…' : label}
      </button>
    </div>
  )
}

// -------- Season modal --------
export function SeasonFormModal({ mode, season, onClose }: {
  mode: Mode
  season?: { id: string; name: string; start_date: string; end_date: string; tuition_due_day: number; active: boolean }
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(season?.name ?? '')
  const [startDate, setStartDate] = useState(season?.start_date ?? '')
  const [endDate, setEndDate] = useState(season?.end_date ?? '')
  const [dueDay, setDueDay] = useState(season?.tuition_due_day ?? 1)
  const [active, setActive] = useState(season?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const url = mode === 'create' ? '/api/seasons' : `/api/seasons/${season!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, start_date: startDate, end_date: endDate, tuition_due_day: dueDay, active }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSubmitting(false); return }
    router.refresh(); onClose()
  }

  return (
    <ModalShell title={mode === 'create' ? 'New season' : 'Edit season'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="Fall 2026" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Start date</label>
            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>End date</label>
            <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tuition due day of month</label>
          <input type="number" min={1} max={31} required value={dueDay}
            onChange={e => setDueDay(parseInt(e.target.value) || 1)} style={fieldStyle} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        <Footer submitting={submitting} onClose={onClose} label={mode === 'create' ? 'Create season' : 'Save changes'} />
      </form>
    </ModalShell>
  )
}

// -------- Room modal --------
export function RoomFormModal({ mode, room, onClose }: {
  mode: Mode
  room?: { id: string; name: string; capacity: number | null; floor_type: string | null; has_mirrors: boolean; has_barres: boolean; active: boolean }
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(room?.name ?? '')
  const [capacity, setCapacity] = useState<string>(room?.capacity?.toString() ?? '')
  const [floorType, setFloorType] = useState(room?.floor_type ?? '')
  const [hasMirrors, setHasMirrors] = useState(room?.has_mirrors ?? false)
  const [hasBarres, setHasBarres] = useState(room?.has_barres ?? false)
  const [active, setActive] = useState(room?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const url = mode === 'create' ? '/api/rooms' : `/api/rooms/${room!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        capacity: capacity ? parseInt(capacity) : null,
        floor_type: floorType || null,
        has_mirrors: hasMirrors,
        has_barres: hasBarres,
        active,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSubmitting(false); return }
    router.refresh(); onClose()
  }

  return (
    <ModalShell title={mode === 'create' ? 'New room' : 'Edit room'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="Studio A" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Capacity</label>
            <input type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} style={fieldStyle} placeholder="20" />
          </div>
          <div>
            <label style={labelStyle}>Floor type</label>
            <select value={floorType} onChange={e => setFloorType(e.target.value)} style={fieldStyle}>
              <option value="">—</option>
              <option value="marley">Marley</option>
              <option value="hardwood">Hardwood</option>
              <option value="sprung">Sprung</option>
              <option value="vinyl">Vinyl</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={hasMirrors} onChange={e => setHasMirrors(e.target.checked)} /> Mirrors
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={hasBarres} onChange={e => setHasBarres(e.target.checked)} /> Barres
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active
          </label>
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        <Footer submitting={submitting} onClose={onClose} label={mode === 'create' ? 'Create room' : 'Save changes'} />
      </form>
    </ModalShell>
  )
}

// -------- Class Type modal (with color picker) --------
const LEVELS = ['pre_dance', 'beginner', 'intermediate', 'advanced', 'all_levels']
const COLOR_PRESETS = [
  '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#64748b', '#0f172a',
]

export function ClassTypeFormModal({ mode, classType, onClose }: {
  mode: Mode
  classType?: { id: string; name: string; style: string; level: string; min_age: number | null; max_age: number | null; description: string | null; color: string; active: boolean }
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(classType?.name ?? '')
  const [style, setStyle] = useState(classType?.style ?? '')
  const [level, setLevel] = useState(classType?.level ?? 'all_levels')
  const [minAge, setMinAge] = useState<string>(classType?.min_age?.toString() ?? '')
  const [maxAge, setMaxAge] = useState<string>(classType?.max_age?.toString() ?? '')
  const [description, setDescription] = useState(classType?.description ?? '')
  const [color, setColor] = useState(classType?.color ?? '#6366f1')
  const [active, setActive] = useState(classType?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const url = mode === 'create' ? '/api/class-types' : `/api/class-types/${classType!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, style, level,
        min_age: minAge ? parseInt(minAge) : null,
        max_age: maxAge ? parseInt(maxAge) : null,
        description: description || null,
        color, active,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Save failed'); setSubmitting(false); return }
    router.refresh(); onClose()
  }

  return (
    <ModalShell title={mode === 'create' ? 'New class type' : 'Edit class type'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="Ballet Beginner" />
          </div>
          <div>
            <label style={labelStyle}>Style</label>
            <input type="text" required value={style} onChange={e => setStyle(e.target.value)} style={fieldStyle} placeholder="Ballet" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Level</label>
            <select value={level} onChange={e => setLevel(e.target.value)} style={fieldStyle}>
              {LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Min age</label>
            <input type="number" min={0} value={minAge} onChange={e => setMinAge(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max age</label>
            <input type="number" min={0} value={maxAge} onChange={e => setMaxAge(e.target.value)} style={fieldStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            style={{ ...fieldStyle, fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ width: 44, height: 36, border: '1px solid #d1d5db', borderRadius: 6, padding: 2, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ ...fieldStyle, width: 120, fontFamily: 'monospace' }}
            />
            <span style={{ flex: 1, height: 36, borderRadius: 6, border: '1px solid #d1d5db', background: color }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                  background: c,
                  border: color === c ? '2px solid #111' : '1px solid #e5e7eb',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active
        </label>
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        <Footer submitting={submitting} onClose={onClose} label={mode === 'create' ? 'Create class type' : 'Save changes'} />
      </form>
    </ModalShell>
  )
}
