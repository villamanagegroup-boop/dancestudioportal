// Backfill website form submissions that never reached the portal (submitted
// before their Supabase webhook existed, or from tables that have no webhook).
//
// Reads each form table on the website project (ftoe...) and inserts any row
// not already in the portal's site_intake, replicating EXACTLY what
// /api/intake/from-site would have written (same source_form, submitter_*,
// payload). Rows land as status 'new' for admin triage — nothing is enrolled.
//
// Idempotent: dedupes on source_row_id (and site_intake's unique index backs
// it up). RLS-blocked tables (no anon SELECT) are reported and skipped — supply
// the website service-role key via SITE_SERVICE_ROLE_KEY env to include them.
//
// DRY RUN by default. Pass --commit to write.
//   node scripts/backfill-site-intake.mjs
//   node scripts/backfill-site-intake.mjs --commit

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const readEnv = (p) => { const o = {}; for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m) continue; let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); o[m[1]] = v } return o }
const portal = readEnv(new URL('../.env.local', import.meta.url))
const site = readEnv('C:/Users/hicks/Projects/Clients/capitalcoredancewebsite/.env')

const COMMIT = process.argv.includes('--commit')
// Use the website service-role key if provided (reads RLS-blocked tables too).
const siteKey = process.env.SITE_SERVICE_ROLE_KEY || site.VITE_SUPABASE_ANON_KEY
const siteDb = createClient(site.VITE_SUPABASE_URL, siteKey)
const portalDb = createClient(portal.NEXT_PUBLIC_SUPABASE_URL, portal.SUPABASE_SERVICE_ROLE_KEY)

const MAP = {
  contact_submissions:        'contact',
  birthday_bookings:          'birthday',
  camp_registrations:         'camp',
  summer_class_registrations: 'summer_class',
  recital_orders:             'recital_order',
  recital_shirt_orders:       'recital_shirt',
  adult_series_interest:      'adult_series',
}

// Mirror of /api/intake/from-site pickEmail / pickName.
const pickEmail = (r) => r.email || r.parent_email || null
const pickName = (r, form) => {
  if (form === 'contact') return `${r.first_name || ''} ${r.last_name || ''}`.trim() || null
  return r.parent_name || r.contact_name || r.name || null
}

const { data: existing } = await portalDb.from('site_intake').select('source_row_id')
const inPortal = new Set(existing.map(r => r.source_row_id))

let inserted = 0, skipped = 0
const blocked = []

for (const [table, form] of Object.entries(MAP)) {
  const { data, error } = await siteDb.from(table).select('*')
  if (error) { blocked.push(`${table} (${error.message.split('\n')[0]})`); continue }

  let tIns = 0, tSkip = 0
  for (const row of data) {
    if (row.id && inPortal.has(row.id)) { tSkip++; skipped++; continue }
    const rec = {
      source_form: form,
      source_table: table,
      source_row_id: row.id ?? null,
      submitter_email: pickEmail(row),
      submitter_name: pickName(row, form),
      payload: row,
    }
    if (COMMIT) {
      const { error: insErr } = await portalDb.from('site_intake').insert(rec)
      if (insErr) {
        if (insErr.code === '23505') { tSkip++; skipped++; continue } // already there
        console.log(`  ! ${table} ${row.id}: ${insErr.message}`); continue
      }
    }
    tIns++; inserted++
  }
  console.log(`  ${table.padEnd(28)} read ${String(data.length).padStart(3)}  +${tIns} new  (${tSkip} already in portal)`)
}

console.log(`\n=== BACKFILL ${COMMIT ? '(COMMIT)' : '(DRY RUN — no writes)'} ===`)
console.log(`inserted: ${inserted} | skipped (already present): ${skipped}`)
if (blocked.length) {
  console.log(`\nRLS-blocked (need SITE_SERVICE_ROLE_KEY to read): ${blocked.length}`)
  for (const b of blocked) console.log('  - ' + b)
}
if (!COMMIT) console.log('\nDRY RUN only. Re-run with --commit to write.')
console.log('')
