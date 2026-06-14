// Universal tabular export — CSV download, print-to-PDF, and one-click Google
// Sheets. Works on a simple { columns, rows } model so any list in the portal
// (reports, camp roster, class roster, …) can reuse it. Browser-only: the
// download/print/clipboard helpers must be called from client event handlers.

import { formatCurrency } from '@/lib/utils'

export type ColumnFormat = 'text' | 'date' | 'datetime' | 'currency' | 'number'

export interface ExportColumn {
  key: string
  label: string
  format?: ColumnFormat
  align?: 'left' | 'right' | 'center'
}

export type ExportRow = Record<string, unknown>

// Human-readable cell value. Shared with ReportViewer so the table, CSV, PDF,
// and Sheets all show the same thing.
export function formatCellValue(v: unknown, format?: ColumnFormat): string {
  if (v == null || v === '') return ''
  if (format === 'date') {
    const s = String(v)
    return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (format === 'datetime') return new Date(String(v)).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  if (format === 'currency') return formatCurrency(Number(v))
  if (format === 'number') return Number(v).toLocaleString()
  return String(v)
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCSV(columns: ExportColumn[], rows: ExportRow[]): string {
  const header = columns.map(c => csvEscape(c.label)).join(',')
  const body = rows.map(r => columns.map(c => csvEscape(formatCellValue(r[c.key], c.format))).join(','))
  return [header, ...body].join('\n')
}

export function toTSV(columns: ExportColumn[], rows: ExportRow[]): string {
  // Tabs + cleaned newlines so a paste into Google Sheets keeps cell structure.
  const clean = (s: string) => s.replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
  const header = columns.map(c => clean(c.label)).join('\t')
  const body = rows.map(r => columns.map(c => clean(formatCellValue(r[c.key], c.format))).join('\t'))
  return [header, ...body].join('\n')
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function downloadCSV(filename: string, columns: ExportColumn[], rows: ExportRow[]): void {
  const blob = new Blob(['﻿' + toCSV(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(filename)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older/insecure contexts.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

// One-click "Google Sheets" with no API setup: copy the table as TSV, then open
// a fresh blank Sheet. The caller tells the user to paste (Ctrl/Cmd+V). Returns
// whether the clipboard copy succeeded so the UI can message accordingly.
export async function exportToGoogleSheets(columns: ExportColumn[], rows: ExportRow[]): Promise<boolean> {
  const ok = await copyToClipboard(toTSV(columns, rows))
  window.open('https://sheets.new', '_blank', 'noopener')
  return ok
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2430; margin: 28px; }
  header { display:flex; align-items:baseline; justify-content:space-between; border-bottom:2px solid #1e1b4b; padding-bottom:10px; margin-bottom:6px; }
  h1 { font-size: 18px; margin: 0; color:#1e1b4b; }
  .meta { font-size: 11px; color:#666; }
  .sub { font-size: 12px; color:#444; margin: 4px 0 14px; }
  table { width:100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #cbd2e0; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background:#f1f0fb; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color:#3a3a55; }
  tr:nth-child(even) td { background:#fafafe; }
  .right { text-align: right; } .center { text-align: center; }
  .empty { color:#bbb; }
  @media print { body { margin: 0; } @page { margin: 14mm; } thead { display: table-header-group; } tr { break-inside: avoid; } }
`

// Open a print-optimized window and trigger the browser print dialog (which is
// also "Save as PDF"). Covers both Print and PDF with no dependency.
export function printReport(opts: {
  title: string
  subtitle?: string
  columns: ExportColumn[]
  rows: ExportRow[]
}): void {
  const { title, subtitle, columns, rows } = opts
  const alignCls = (a?: string) => (a === 'right' ? ' class="right"' : a === 'center' ? ' class="center"' : '')
  const esc = (s: string) => s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] as string))
  const thead = `<tr>${columns.map(c => `<th${alignCls(c.align)}>${esc(c.label)}</th>`).join('')}</tr>`
  const tbody = rows.map(r => `<tr>${columns.map(c => {
    const v = formatCellValue(r[c.key], c.format)
    return `<td${alignCls(c.align)}>${v ? esc(v) : '<span class="empty">—</span>'}</td>`
  }).join('')}</tr>`).join('')
  const stamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head>
  <body>
    <header><h1>${esc(title)}</h1><span class="meta">Capital Core Dance Studio · ${stamp}</span></header>
    ${subtitle ? `<div class="sub">${esc(subtitle)} · ${rows.length} row${rows.length === 1 ? '' : 's'}</div>` : `<div class="sub">${rows.length} row${rows.length === 1 ? '' : 's'}</div>`}
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
    <script>window.onload = function(){ window.focus(); window.print(); }</script>
  </body></html>`
  // Load via a Blob URL (no document.write). All dynamic cell/label values are
  // HTML-escaped above and rendered as text content only.
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
