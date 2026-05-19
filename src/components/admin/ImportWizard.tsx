'use client'

import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { ENTITY_CONFIGS, ENTITY_ORDER, autoMapHeaders, type EntityKey } from '@/lib/import-configs'

type Stage = 'pick-entity' | 'upload' | 'map' | 'preview' | 'done'

type PreviewResult = {
  total: number
  valid: number
  inserted?: number
  errors: { row: number; reason: string }[]
}

export default function ImportWizard() {
  const [entity, setEntity] = useState<EntityKey | null>(null)
  const [stage, setStage] = useState<Stage>('pick-entity')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dryRunResult, setDryRunResult] = useState<PreviewResult | null>(null)
  const [importResult, setImportResult] = useState<PreviewResult | null>(null)

  const config = entity ? ENTITY_CONFIGS[entity] : null

  function reset() {
    setEntity(null); setStage('pick-entity')
    setHeaders([]); setRawRows([]); setMapping({})
    setError(''); setDryRunResult(null); setImportResult(null)
  }

  function pickEntity(key: EntityKey) {
    setEntity(key)
    setStage('upload')
  }

  function handleFile(file: File) {
    setError('')
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`)
          return
        }
        const cleaned = results.data.map(row => {
          const out: Record<string, string> = {}
          for (const [k, v] of Object.entries(row)) {
            out[k.trim()] = (v ?? '').toString()
          }
          return out
        })
        setHeaders(results.meta.fields ?? [])
        setRawRows(cleaned)
        if (config) setMapping(autoMapHeaders(config, results.meta.fields ?? []))
        setStage('map')
      },
      error: err => setError(`Parse failed: ${err.message}`),
    })
  }

  const mappedRows = useMemo(() => {
    if (!config) return []
    return rawRows.map(row => {
      const out: Record<string, string> = {}
      for (const col of config.columns) {
        const header = mapping[col.key]
        out[col.key] = header ? (row[header] ?? '') : ''
      }
      return out
    })
  }, [rawRows, mapping, config])

  async function runDryRun() {
    if (!entity) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, rows: mappedRows, dryRun: true }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Validation failed'); return }
      setDryRunResult({ total: data.total, valid: data.valid, errors: data.errors })
      setStage('preview')
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setBusy(false)
    }
  }

  async function runImport() {
    if (!entity) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, rows: mappedRows, dryRun: false }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Import failed'); return }
      setImportResult({ total: data.total, valid: data.inserted ?? 0, inserted: data.inserted, errors: data.errors })
      setStage('done')
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0' }}>
      <Stepper stage={stage} />

      {error && (
        <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {stage === 'pick-entity' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pick what to import</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Recommended order: families → students → classes → enrollments → camps → camp registrations → invoices → payments.
            Later entities depend on earlier ones being imported first.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {ENTITY_ORDER.map((k, idx) => {
              const c = ENTITY_CONFIGS[k]
              return (
                <button key={k} onClick={() => pickEntity(k)}
                  style={{
                    textAlign: 'left', padding: 16, border: '1px solid #e5e7eb', borderRadius: 10,
                    background: 'white', cursor: 'pointer',
                  }}
                >
                  <p style={{ fontSize: 11, color: '#999', fontWeight: 600, marginBottom: 4 }}>STEP {idx + 1}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.label}</p>
                  <p style={{ fontSize: 12, color: '#666' }}>{c.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {stage === 'upload' && config && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Upload {config.label} CSV</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>{config.description}</p>

          <label style={{
            display: 'block', padding: 32, border: '2px dashed #d1d5db', borderRadius: 12,
            textAlign: 'center', cursor: 'pointer', background: '#fafafa',
          }}>
            <Upload size={28} style={{ margin: '0 auto 8px', color: '#666' }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Choose CSV file</p>
            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>First row should be column headers.</p>
            <input
              type="file" accept=".csv,text/csv"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>

          <details style={{ marginTop: 16 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#666' }}>
              Show expected columns ({config.columns.length})
            </summary>
            <div style={{ marginTop: 12, fontSize: 12 }}>
              {config.columns.map(col => (
                <div key={col.key} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600 }}>{col.label}</span>
                  {col.required && <span style={{ color: '#b91c1c', marginLeft: 6 }}>*required</span>}
                  {col.aliases?.length && (
                    <span style={{ color: '#999', marginLeft: 8 }}>aliases: {col.aliases.join(', ')}</span>
                  )}
                  {col.hint && <div style={{ color: '#666', marginTop: 2 }}>{col.hint}</div>}
                </div>
              ))}
            </div>
          </details>

          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={reset}
              style={{ padding: '8px 14px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6 }}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {stage === 'map' && config && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Map columns</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            {rawRows.length} rows detected. Confirm which CSV columns map to which fields. Auto-mapped where possible.
          </p>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb' }}>
              <span>Target field</span>
              <span>Your CSV column</span>
            </div>
            {config.columns.map(col => (
              <div key={col.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{col.label}</span>
                  {col.required && <span style={{ color: '#b91c1c', fontSize: 11, marginLeft: 6 }}>required</span>}
                  {col.hint && <div style={{ color: '#999', fontSize: 11 }}>{col.hint}</div>}
                </div>
                <select
                  value={mapping[col.key] ?? ''}
                  onChange={e => setMapping(m => ({ ...m, [col.key]: e.target.value || null }))}
                  style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                >
                  <option value="">— skip —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStage('upload')}
              style={{ padding: '8px 14px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6 }}>
              ← Back
            </button>
            <button type="button" onClick={runDryRun} disabled={busy}
              style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, background: 'var(--grad-1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6 }}>
              {busy ? <Loader2 size={14} className="animate-spin inline" /> : <>Preview <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} /></>}
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && dryRunResult && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Preview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <Stat label="Total rows" value={dryRunResult.total} />
            <Stat label="Will import" value={dryRunResult.valid} color="#059669" />
            <Stat label="Errors" value={dryRunResult.errors.length} color={dryRunResult.errors.length > 0 ? '#dc2626' : undefined} />
          </div>

          {dryRunResult.errors.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 8 }}>Issues found:</p>
              {dryRunResult.errors.slice(0, 50).map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: '#7f1d1d', padding: '3px 0' }}>
                  Row {e.row}: {e.reason}
                </div>
              ))}
              {dryRunResult.errors.length > 50 && (
                <p style={{ fontSize: 12, color: '#7f1d1d', marginTop: 8 }}>… and {dryRunResult.errors.length - 50} more.</p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStage('map')}
              style={{ padding: '8px 14px', fontSize: 13, background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6 }}>
              ← Back to mapping
            </button>
            <button type="button" onClick={runImport} disabled={busy || dryRunResult.valid === 0}
              style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, background: dryRunResult.valid === 0 ? '#d1d5db' : 'var(--grad-1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6 }}>
              {busy ? <Loader2 size={14} className="animate-spin inline" /> : `Import ${dryRunResult.valid} rows`}
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && importResult && (
        <div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={32} style={{ color: '#059669', margin: '0 auto 8px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
              Imported {importResult.inserted ?? 0} of {importResult.total} rows
            </h2>
            {importResult.errors.length > 0 && (
              <p style={{ fontSize: 13, color: '#92400e' }}>{importResult.errors.length} rows had issues — see below.</p>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#854d0e', marginBottom: 8 }}>Issues:</p>
              {importResult.errors.slice(0, 50).map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: '#713f12', padding: '3px 0' }}>Row {e.row}: {e.reason}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={reset}
              style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, background: 'var(--grad-1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6 }}>
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: color ?? '#111' }}>{value}</p>
    </div>
  )
}

const STAGE_STEPS: Stage[] = ['pick-entity', 'upload', 'map', 'preview', 'done']
const STAGE_LABELS: Record<Stage, string> = {
  'pick-entity': 'Pick entity', 'upload': 'Upload', 'map': 'Map columns', 'preview': 'Preview', 'done': 'Done',
}

function Stepper({ stage }: { stage: Stage }) {
  const currentIdx = STAGE_STEPS.indexOf(stage)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
      {STAGE_STEPS.map((s, i) => {
        const done = i < currentIdx, active = i === currentIdx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: done ? '#059669' : active ? 'var(--grad-1, #4f46e5)' : '#e5e7eb',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#111' : '#666' }}>{STAGE_LABELS[s]}</span>
            {i < STAGE_STEPS.length - 1 && <div style={{ width: 16, height: 1, background: '#e5e7eb' }} />}
          </div>
        )
      })}
    </div>
  )
}
