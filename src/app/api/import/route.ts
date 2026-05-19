import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ENTITY_CONFIGS, type EntityKey } from '@/lib/import-configs'

type ImportRow = Record<string, string>
type RowError = { row: number; reason: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const admin = createAdminClient()
  const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const body = await request.json() as {
    entity: EntityKey
    rows: ImportRow[]
    dryRun?: boolean
  }
  const config = ENTITY_CONFIGS[body.entity]
  if (!config) return NextResponse.json({ error: 'Unknown entity' }, { status: 400 })

  const errors: RowError[] = []
  const valid: ImportRow[] = []

  body.rows.forEach((row, idx) => {
    for (const col of config.columns) {
      if (col.required && !(row[col.key]?.toString().trim())) {
        errors.push({ row: idx + 2, reason: `Missing required field: ${col.label}` })
        return
      }
    }
    valid.push(row)
  })

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      total: body.rows.length,
      valid: valid.length,
      errors,
    })
  }

  let inserted = 0
  const insertErrors: RowError[] = []

  switch (body.entity) {
    case 'families': inserted = await importFamilies(admin, valid, insertErrors); break
    case 'students': inserted = await importStudents(admin, valid, insertErrors); break
    case 'classes': inserted = await importClasses(admin, valid, insertErrors); break
    case 'enrollments': inserted = await importEnrollments(admin, valid, insertErrors); break
    case 'camps': inserted = await importCamps(admin, valid, insertErrors); break
    case 'camp_registrations': inserted = await importCampRegistrations(admin, valid, insertErrors); break
    case 'invoices': inserted = await importInvoices(admin, valid, insertErrors); break
    case 'payments': inserted = await importPayments(admin, valid, insertErrors); break
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    total: body.rows.length,
    inserted,
    errors: [...errors, ...insertErrors],
  })
}

// ---------- entity handlers ----------

type Admin = ReturnType<typeof createAdminClient>

function tempPassword() {
  return 'Welcome' + Math.random().toString(36).slice(2, 8) + '!'
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null
  const trimmed = s.trim()
  if (!trimmed) return null
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  // MM/DD/YYYY
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    const yyyy = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${yyyy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return null
}

function parseTime(s: string | undefined): string | null {
  if (!s) return null
  const t = s.trim().toLowerCase()
  // 24-hour HH:MM
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':')
    return `${h.padStart(2, '0')}:${m}:00`
  }
  // 7:00pm
  const ampm = t.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/)
  if (ampm) {
    let h = parseInt(ampm[1])
    const m = ampm[2] ?? '00'
    if (ampm[3] === 'pm' && h < 12) h += 12
    if (ampm[3] === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}:00`
  }
  return null
}

function parseNumber(s: string | undefined): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

async function importFamilies(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const email = r.email?.trim().toLowerCase()
    if (!email) continue
    const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existing) {
      const { error } = await admin.from('profiles').update({
        first_name: r.first_name, last_name: r.last_name,
        phone: r.phone ?? null,
        address_street: r.address_street ?? null,
        address_city: r.address_city ?? null,
        address_state: r.address_state ?? null,
        address_zip: r.address_zip ?? null,
      }).eq('id', existing.id)
      if (error) errs.push({ row: i + 2, reason: error.message }); else count++
      continue
    }
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword(),
      email_confirm: true,
      user_metadata: { first_name: r.first_name, last_name: r.last_name, role: 'parent' },
    })
    if (authErr || !created?.user) {
      errs.push({ row: i + 2, reason: authErr?.message ?? 'auth create failed' })
      continue
    }
    await admin.from('profiles').update({
      role: 'parent', first_name: r.first_name, last_name: r.last_name,
      phone: r.phone ?? null,
      address_street: r.address_street ?? null,
      address_city: r.address_city ?? null,
      address_state: r.address_state ?? null,
      address_zip: r.address_zip ?? null,
    }).eq('id', created.user.id)
    count++
  }
  return count
}

async function importStudents(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const dob = parseDate(r.date_of_birth)
    if (!dob) { errs.push({ row: i + 2, reason: 'Invalid date_of_birth' }); continue }
    const { data: created, error } = await admin.from('students').insert({
      first_name: r.first_name, last_name: r.last_name, date_of_birth: dob,
      gender: r.gender ?? null,
      medical_notes: r.medical_notes ?? null,
      emergency_contact_name: r.emergency_contact_name ?? null,
      emergency_contact_phone: r.emergency_contact_phone ?? null,
    }).select('id').single()
    if (error || !created) { errs.push({ row: i + 2, reason: error?.message ?? 'insert failed' }); continue }
    if (r.parent_email) {
      const { data: parent } = await admin.from('profiles').select('id').eq('email', r.parent_email.trim().toLowerCase()).maybeSingle()
      if (parent) {
        await admin.from('guardian_students').insert({
          guardian_id: parent.id, student_id: created.id, relationship: 'parent', is_primary: true,
        })
      } else {
        errs.push({ row: i + 2, reason: `Student created but parent email ${r.parent_email} not found — not linked` })
      }
    }
    count++
  }
  return count
}

async function importClasses(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const start = parseTime(r.start_time)
    const end = parseTime(r.end_time)
    if (!start || !end) { errs.push({ row: i + 2, reason: 'Invalid start_time or end_time' }); continue }
    const day = r.day_of_week?.toLowerCase().trim()

    let instructorId: string | null = null
    if (r.instructor_email) {
      const { data: instr } = await admin.from('instructors').select('id').eq('email', r.instructor_email.trim().toLowerCase()).maybeSingle()
      instructorId = instr?.id ?? null
      if (!instructorId) errs.push({ row: i + 2, reason: `Class created but instructor ${r.instructor_email} not found` })
    }

    const { error } = await admin.from('classes').insert({
      name: r.name, day_of_week: day, start_time: start, end_time: end,
      monthly_tuition: parseNumber(r.monthly_tuition) ?? 0,
      max_students: r.max_students ? parseInt(r.max_students) : null,
      age_min: r.age_min ? parseInt(r.age_min) : null,
      age_max: r.age_max ? parseInt(r.age_max) : null,
      instructor_id: instructorId,
      active: true,
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}

async function findStudent(admin: Admin, first: string, last: string, dob: string) {
  const { data } = await admin.from('students').select('id')
    .ilike('first_name', first.trim()).ilike('last_name', last.trim()).eq('date_of_birth', dob).maybeSingle()
  return data?.id ?? null
}

async function importEnrollments(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const dob = parseDate(r.student_dob)
    if (!dob) { errs.push({ row: i + 2, reason: 'Invalid student_dob' }); continue }
    const studentId = await findStudent(admin, r.student_first_name, r.student_last_name, dob)
    if (!studentId) { errs.push({ row: i + 2, reason: `Student ${r.student_first_name} ${r.student_last_name} (${dob}) not found` }); continue }
    const { data: cls } = await admin.from('classes').select('id').ilike('name', r.class_name.trim()).maybeSingle()
    if (!cls) { errs.push({ row: i + 2, reason: `Class "${r.class_name}" not found` }); continue }
    const enrolled = parseDate(r.enrolled_at) ?? new Date().toISOString().slice(0, 10)
    const status = r.status?.trim().toLowerCase() || 'active'
    const { error } = await admin.from('enrollments').insert({
      student_id: studentId, class_id: cls.id, enrolled_at: enrolled, status,
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}

async function importCamps(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const sd = parseDate(r.start_date), ed = parseDate(r.end_date)
    if (!sd || !ed) { errs.push({ row: i + 2, reason: 'Invalid start_date or end_date' }); continue }
    const { error } = await admin.from('camps').insert({
      name: r.name, description: r.description ?? null,
      start_date: sd, end_date: ed,
      start_time: parseTime(r.start_time), end_time: parseTime(r.end_time),
      price: parseNumber(r.price) ?? 0,
      max_capacity: r.max_capacity ? parseInt(r.max_capacity) : null,
      age_min: r.age_min ? parseInt(r.age_min) : null,
      age_max: r.age_max ? parseInt(r.age_max) : null,
      active: true,
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}

async function importCampRegistrations(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const dob = parseDate(r.student_dob)
    if (!dob) { errs.push({ row: i + 2, reason: 'Invalid student_dob' }); continue }
    const studentId = await findStudent(admin, r.student_first_name, r.student_last_name, dob)
    if (!studentId) { errs.push({ row: i + 2, reason: `Student not found` }); continue }
    const { data: camp } = await admin.from('camps').select('id').ilike('name', r.camp_name.trim()).maybeSingle()
    if (!camp) { errs.push({ row: i + 2, reason: `Camp "${r.camp_name}" not found` }); continue }
    const status = r.status?.trim().toLowerCase() || 'registered'
    const { error } = await admin.from('camp_registrations').insert({
      student_id: studentId, camp_id: camp.id, status,
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}

async function importInvoices(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const { data: parent } = await admin.from('profiles').select('id').eq('email', r.parent_email.trim().toLowerCase()).maybeSingle()
    if (!parent) { errs.push({ row: i + 2, reason: `Parent ${r.parent_email} not found` }); continue }
    const amount = parseNumber(r.amount)
    if (amount == null) { errs.push({ row: i + 2, reason: 'Invalid amount' }); continue }
    const { error } = await admin.from('invoices').insert({
      guardian_id: parent.id,
      description: r.description,
      amount,
      invoice_type: r.invoice_type?.trim().toLowerCase() || 'tuition',
      status: r.status?.trim().toLowerCase() || 'pending',
      due_date: parseDate(r.due_date),
      paid_at: parseDate(r.paid_at) ? new Date(parseDate(r.paid_at)!).toISOString() : null,
      created_at: parseDate(r.created_at) ? new Date(parseDate(r.created_at)!).toISOString() : new Date().toISOString(),
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}

async function importPayments(admin: Admin, rows: ImportRow[], errs: RowError[]): Promise<number> {
  let count = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const { data: parent } = await admin.from('profiles').select('id').eq('email', r.parent_email.trim().toLowerCase()).maybeSingle()
    if (!parent) { errs.push({ row: i + 2, reason: `Parent ${r.parent_email} not found` }); continue }
    const amount = parseNumber(r.amount)
    const paid = parseDate(r.paid_at)
    if (amount == null || !paid) { errs.push({ row: i + 2, reason: 'Invalid amount or paid_at' }); continue }
    const { error } = await admin.from('payments').insert({
      guardian_id: parent.id,
      amount,
      paid_at: new Date(paid).toISOString(),
      payment_method_last_four: r.payment_method_last_four ?? null,
    })
    if (error) errs.push({ row: i + 2, reason: error.message }); else count++
  }
  return count
}
