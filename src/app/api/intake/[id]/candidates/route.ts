import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { admin, userId: user.id }
}

const SELECT =
  'id, first_name, last_name, email, guardian_students(student:students(id, first_name, last_name))'

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  guardian_students: { student: { id: string; first_name: string | null; last_name: string | null } | null }[] | null
}

// GET /api/intake/[id]/candidates?q=<optional>
// Finds existing families (parent profiles) that might own this submission.
// Ranked: exact email → fuzzy email (ilike) → name tokens (ilike). When no
// `q` is given, defaults to the intake row's own submitter_email / name.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const { id } = await params
  const { admin } = ctx
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()

  const { data: row } = await admin
    .from('site_intake')
    .select('submitter_email, submitter_name')
    .eq('id', id)
    .single()

  const email = String(q || row?.submitter_email || '').trim()
  const name = String(q || row?.submitter_name || '').trim()

  const picked: ProfileRow[] = []
  const seen = new Set<string>()
  const add = (rows: ProfileRow[] | null) => {
    for (const r of rows ?? []) {
      if (picked.length >= 5) break
      if (seen.has(r.id)) continue
      seen.add(r.id)
      picked.push(r)
    }
  }

  // Restrict to families: primary parents plus anyone with the soft 'parent' role.
  const base = () => admin.from('profiles').select(SELECT).or('role.eq.parent,extra_roles.cs.{parent}')

  if (email && picked.length < 5) {
    const { data } = await base().eq('email', email).limit(5)
    add(data as ProfileRow[] | null)
  }
  if (email && picked.length < 5) {
    const { data } = await base().ilike('email', `%${email}%`).limit(10)
    add(data as ProfileRow[] | null)
  }
  if (name && picked.length < 5) {
    const tokens = name.split(/\s+/).map(t => t.replace(/[,().]/g, '').trim()).filter(Boolean)
    if (tokens.length) {
      const orExpr = tokens.flatMap(t => [`first_name.ilike.%${t}%`, `last_name.ilike.%${t}%`]).join(',')
      const { data } = await base().or(orExpr).limit(10)
      add(data as ProfileRow[] | null)
    }
  }

  const candidates = picked.map(p => {
    const students = (p.guardian_students ?? [])
      .map(g => g.student)
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map(s => ({ id: s.id, name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unnamed' }))
    return {
      id: p.id,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '(no name)',
      email: p.email,
      child_count: students.length,
      students,
    }
  })

  return NextResponse.json({ candidates })
}
