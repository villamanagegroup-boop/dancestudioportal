import { requireStaff } from '@/lib/require-staff'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Tables that should NEVER be readable with only the public anon key.
const SAMPLE_TABLES = [
  'profiles', 'students', 'families', 'invoices', 'payments',
  'enrollments', 'documents', 'policy_acceptances', 'guardian_students',
  'parties', 'bookings', 'studio_settings',
]

// Verifies the RLS lockdown took effect: hits each table with an *unauthenticated*
// anon client and flags any that still return rows. Staff-only (the report itself
// is sensitive).
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })

  const results = await Promise.all(SAMPLE_TABLES.map(async table => {
    const { data, error } = await anon.from(table).select('id').limit(1)
    const rows = Array.isArray(data) ? data.length : 0
    // Exposed only if the anon key actually pulled a row back.
    return { table, exposed: !error && rows > 0, rows, error: error?.message ?? null }
  }))

  const exposed = results.filter(r => r.exposed)
  return NextResponse.json({
    secure: exposed.length === 0,
    checkedAt: new Date().toISOString(),
    summary: exposed.length === 0
      ? 'SECURE — the public anon key could not read any sampled table.'
      : `EXPOSED — anon key still reads: ${exposed.map(r => r.table).join(', ')}. Run rls_lockdown.sql.`,
    note: 'Empty tables can read as "secure" even if open; trust the populated ones (profiles, students).',
    results,
  })
}
