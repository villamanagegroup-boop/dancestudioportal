import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ReportColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: 'date' | 'currency' | 'number' | 'datetime'
}

export interface ReportResult {
  columns: ReportColumn[]
  rows: Record<string, any>[]
  notes?: string
}

export interface ReportFilters {
  from?: string
  to?: string
  q?: string
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ageYears(dob: string): number {
  const b = new Date(dob + 'T00:00:00')
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a
}

function nextBirthday(dob: string): { date: string; daysUntil: number; turning: number } {
  const b = new Date(dob + 'T00:00:00')
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next < startOfDay) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate())
  return {
    date: next.toISOString().slice(0, 10),
    daysUntil: Math.round((next.getTime() - startOfDay.getTime()) / 86_400_000),
    turning: next.getFullYear() - b.getFullYear(),
  }
}

function applyDateRange<T extends Record<string, any>>(rows: T[], field: string, filters: ReportFilters): T[] {
  if (!filters.from && !filters.to) return rows
  return rows.filter(r => {
    const v = r[field]
    if (!v) return false
    if (filters.from && v < filters.from) return false
    if (filters.to && v > filters.to + 'T23:59:59') return false
    return true
  })
}

// ---------- FAMILY ----------

async function famList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone, created_at, guardian_students(student_id)')
    .eq('role', 'parent')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'student_count', label: 'Dancers', align: 'right' },
      { key: 'created_at', label: 'Added', format: 'date' },
    ],
    rows: (data ?? []).map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      email: p.email ?? '',
      phone: p.phone ?? '',
      student_count: Array.isArray(p.guardian_students) ? p.guardian_students.length : 0,
      created_at: p.created_at,
    })),
  }
}

async function famPhonebook(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone')
    .eq('role', 'parent')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
    rows: (data ?? []).map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      phone: p.phone ?? '',
      email: p.email ?? '',
    })),
  }
}

async function famEmailList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('role', 'parent')
    .not('email', 'is', null)
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'email', label: 'Email' },
    ],
    rows: (data ?? []).map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      email: p.email,
    })),
  }
}

async function famNoEmail(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone')
    .eq('role', 'parent')
    .is('email', null)
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'phone', label: 'Phone' },
    ],
    rows: (data ?? []).map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      phone: p.phone ?? '',
    })),
  }
}

async function famMultiStudent(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, guardian_students(student_id)')
    .eq('role', 'parent')
    .order('last_name')
  const rows = (data ?? [])
    .map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      email: p.email ?? '',
      student_count: Array.isArray(p.guardian_students) ? p.guardian_students.length : 0,
    }))
    .filter(r => r.student_count > 1)
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'email', label: 'Email' },
      { key: 'student_count', label: 'Dancers', align: 'right' },
    ],
    rows,
  }
}

async function famDuplicateEmails(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('role', 'parent')
    .not('email', 'is', null)
  const groups = new Map<string, { name: string; email: string }[]>()
  for (const p of data ?? []) {
    const key = (p.email ?? '').toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ name: `${p.last_name}, ${p.first_name}`, email: p.email })
  }
  const rows: any[] = []
  for (const list of groups.values()) {
    if (list.length > 1) {
      for (const row of list) rows.push({ ...row, sharing_with: list.length })
    }
  }
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'email', label: 'Email' },
      { key: 'sharing_with', label: 'Families Sharing', align: 'right' },
    ],
    rows,
  }
}

async function famGuardianAccess(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, created_at, active')
    .eq('role', 'parent')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Guardian' },
      { key: 'email', label: 'Login Email' },
      { key: 'access_since', label: 'Access Since', format: 'date' },
      { key: 'active', label: 'Active' },
    ],
    rows: (data ?? []).map((p: any) => ({
      name: `${p.last_name}, ${p.first_name}`,
      email: p.email ?? '',
      access_since: p.created_at,
      active: p.active ? 'Yes' : 'No',
    })),
  }
}

// ---------- STUDENT ----------

async function stuList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('students')
    .select('first_name, last_name, date_of_birth, active, guardian_students(guardian:profiles(first_name, last_name))')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'age', label: 'Age', align: 'right' },
      { key: 'guardian', label: 'Guardian' },
      { key: 'active', label: 'Status' },
    ],
    rows: (data ?? []).map((s: any) => {
      const guardians = (s.guardian_students ?? [])
        .map((g: any) => g.guardian ? `${g.guardian.first_name} ${g.guardian.last_name}` : null)
        .filter(Boolean)
      return {
        name: `${s.last_name}, ${s.first_name}`,
        age: s.date_of_birth ? ageYears(s.date_of_birth) : '',
        guardian: guardians.join(', '),
        active: s.active ? 'Active' : 'Archived',
      }
    }),
  }
}

async function stuPhonebook(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('students')
    .select('first_name, last_name, guardian_students(guardian:profiles(first_name, last_name, phone, email))')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'guardian', label: 'Guardian' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
    rows: (data ?? []).map((s: any) => {
      const g = s.guardian_students?.[0]?.guardian
      return {
        name: `${s.last_name}, ${s.first_name}`,
        guardian: g ? `${g.first_name} ${g.last_name}` : '',
        phone: g?.phone ?? '',
        email: g?.email ?? '',
      }
    }),
  }
}

async function stuBirthdays(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('students')
    .select('first_name, last_name, date_of_birth')
    .eq('active', true)
    .not('date_of_birth', 'is', null)
  const rows = (data ?? [])
    .map((s: any) => {
      const nb = nextBirthday(s.date_of_birth)
      return {
        name: `${s.last_name}, ${s.first_name}`,
        birthday: s.date_of_birth,
        next_birthday: nb.date,
        days_until: nb.daysUntil,
        turning: nb.turning,
      }
    })
    .sort((a, b) => a.days_until - b.days_until)
  return {
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'birthday', label: 'Birthday', format: 'date' },
      { key: 'next_birthday', label: 'Next Birthday', format: 'date' },
      { key: 'days_until', label: 'Days Until', align: 'right' },
      { key: 'turning', label: 'Turning', align: 'right' },
    ],
    rows,
  }
}

async function stuAnniversaries(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('students')
    .select('first_name, last_name, created_at, active')
    .eq('active', true)
  const now = new Date()
  const rows = (data ?? []).map((s: any) => {
    const c = new Date(s.created_at)
    const years = now.getFullYear() - c.getFullYear()
    return {
      name: `${s.last_name}, ${s.first_name}`,
      joined: s.created_at,
      years_at_studio: years,
    }
  })
  return {
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'joined', label: 'Joined', format: 'date' },
      { key: 'years_at_studio', label: 'Years', align: 'right' },
    ],
    rows: rows.sort((a, b) => a.joined.localeCompare(b.joined)),
  }
}

async function stuInsurableAgeGroups(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('students')
    .select('date_of_birth, active')
    .eq('active', true)
    .not('date_of_birth', 'is', null)
  const buckets = [
    { label: '0-4 years', min: 0, max: 4, count: 0 },
    { label: '5-7 years', min: 5, max: 7, count: 0 },
    { label: '8-10 years', min: 8, max: 10, count: 0 },
    { label: '11-13 years', min: 11, max: 13, count: 0 },
    { label: '14-17 years', min: 14, max: 17, count: 0 },
    { label: '18+ years', min: 18, max: 999, count: 0 },
  ]
  for (const s of data ?? []) {
    const a = ageYears(s.date_of_birth)
    const bucket = buckets.find(b => a >= b.min && a <= b.max)
    if (bucket) bucket.count++
  }
  return {
    columns: [
      { key: 'label', label: 'Age Group' },
      { key: 'count', label: 'Students', align: 'right' },
    ],
    rows: buckets.map(b => ({ label: b.label, count: b.count })),
  }
}

// ---------- CLASS ----------

async function claList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select(`
      name, day_of_week, start_time, end_time, max_students, monthly_tuition, active,
      instructor:instructors(first_name, last_name),
      room:rooms(name),
      class_type:class_types(name, level),
      enrollments:enrollments(id, status)
    `)
    .order('day_of_week').order('start_time')
  return {
    columns: [
      { key: 'name', label: 'Class' },
      { key: 'type', label: 'Type' },
      { key: 'level', label: 'Level' },
      { key: 'day', label: 'Day' },
      { key: 'time', label: 'Time' },
      { key: 'instructor', label: 'Instructor' },
      { key: 'room', label: 'Room' },
      { key: 'enrolled', label: 'Enrolled', align: 'right' },
      { key: 'capacity', label: 'Capacity', align: 'right' },
      { key: 'tuition', label: 'Tuition', format: 'currency', align: 'right' },
      { key: 'active', label: 'Status' },
    ],
    rows: (data ?? []).map((c: any) => ({
      name: c.name,
      type: c.class_type?.name ?? '',
      level: c.class_type?.level ?? '',
      day: c.day_of_week,
      time: `${c.start_time?.slice(0, 5)}–${c.end_time?.slice(0, 5)}`,
      instructor: c.instructor ? `${c.instructor.first_name} ${c.instructor.last_name}` : '',
      room: c.room?.name ?? '',
      enrolled: (c.enrollments ?? []).filter((e: any) => e.status === 'active').length,
      capacity: c.max_students ?? '',
      tuition: c.monthly_tuition,
      active: c.active ? 'Active' : 'Archived',
    })),
  }
}

async function claCustomerList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select(`
      name, day_of_week, start_time, end_time, max_students, monthly_tuition,
      age_min, age_max,
      class_type:class_types(name, style),
      enrollments:enrollments(id, status)
    `)
    .eq('active', true)
    .eq('visible', true)
    .order('day_of_week').order('start_time')
  return {
    columns: [
      { key: 'name', label: 'Class' },
      { key: 'style', label: 'Style' },
      { key: 'day', label: 'Day' },
      { key: 'time', label: 'Time' },
      { key: 'age', label: 'Ages' },
      { key: 'tuition', label: 'Tuition', format: 'currency', align: 'right' },
      { key: 'openings', label: 'Openings', align: 'right' },
    ],
    rows: (data ?? []).map((c: any) => {
      const enrolled = (c.enrollments ?? []).filter((e: any) => e.status === 'active').length
      const openings = c.max_students != null ? Math.max(0, c.max_students - enrolled) : ''
      return {
        name: c.name,
        style: c.class_type?.style ?? '',
        day: c.day_of_week,
        time: `${c.start_time?.slice(0, 5)}–${c.end_time?.slice(0, 5)}`,
        age: c.age_min && c.age_max ? `${c.age_min}–${c.age_max}` : '',
        tuition: c.monthly_tuition,
        openings,
      }
    }),
  }
}

async function claProgramSummary(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select(`
      class_type:class_types(name),
      enrollments:enrollments(id, status)
    `)
    .eq('active', true)
  const map = new Map<string, { program: string; classes: number; active_enrollments: number }>()
  for (const c of (data ?? []) as any[]) {
    const program = c.class_type?.name ?? 'Uncategorized'
    if (!map.has(program)) map.set(program, { program, classes: 0, active_enrollments: 0 })
    const e = map.get(program)!
    e.classes++
    e.active_enrollments += (c.enrollments ?? []).filter((x: any) => x.status === 'active').length
  }
  return {
    columns: [
      { key: 'program', label: 'Program' },
      { key: 'classes', label: 'Classes', align: 'right' },
      { key: 'active_enrollments', label: 'Active Enrollments', align: 'right' },
    ],
    rows: [...map.values()].sort((a, b) => b.active_enrollments - a.active_enrollments),
  }
}

async function claDropList(filters: ReportFilters): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('enrollments')
    .select(`
      dropped_at, notes,
      student:students(first_name, last_name),
      class:classes(name)
    `)
    .eq('status', 'dropped')
    .order('dropped_at', { ascending: false })
  const rows = applyDateRange((data ?? []) as any[], 'dropped_at', filters).map((e: any) => ({
    student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
    class: e.class?.name ?? '',
    dropped_at: e.dropped_at,
    notes: e.notes ?? '',
  }))
  return {
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'class', label: 'Class' },
      { key: 'dropped_at', label: 'Dropped', format: 'date' },
      { key: 'notes', label: 'Notes' },
    ],
    rows,
  }
}

async function claNewEnrollments(filters: ReportFilters): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('enrollments')
    .select(`
      enrolled_at, status,
      student:students(first_name, last_name),
      class:classes(name)
    `)
    .order('enrolled_at', { ascending: false })
  const rows = applyDateRange((data ?? []) as any[], 'enrolled_at', filters).map((e: any) => ({
    enrolled_at: e.enrolled_at,
    student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
    class: e.class?.name ?? '',
    status: e.status,
  }))
  return {
    columns: [
      { key: 'enrolled_at', label: 'Enrolled', format: 'date' },
      { key: 'student', label: 'Student' },
      { key: 'class', label: 'Class' },
      { key: 'status', label: 'Status' },
    ],
    rows,
  }
}

async function claLevelSummary(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select('class_type:class_types(level), enrollments:enrollments(id, status)')
    .eq('active', true)
  const map = new Map<string, { level: string; classes: number; active_enrollments: number }>()
  for (const c of (data ?? []) as any[]) {
    const level = c.class_type?.level ?? 'all_levels'
    if (!map.has(level)) map.set(level, { level, classes: 0, active_enrollments: 0 })
    const e = map.get(level)!
    e.classes++
    e.active_enrollments += (c.enrollments ?? []).filter((x: any) => x.status === 'active').length
  }
  return {
    columns: [
      { key: 'level', label: 'Level' },
      { key: 'classes', label: 'Classes', align: 'right' },
      { key: 'active_enrollments', label: 'Active Enrollments', align: 'right' },
    ],
    rows: [...map.values()].sort((a, b) => a.level.localeCompare(b.level)),
  }
}

async function claFirstEnrollments(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('enrollments')
    .select('enrolled_at, student:students(id, first_name, last_name), class:classes(name)')
    .order('enrolled_at', { ascending: true })
  const seen = new Map<string, any>()
  for (const e of (data ?? []) as any[]) {
    const id = e.student?.id
    if (!id || seen.has(id)) continue
    seen.set(id, {
      student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
      first_enrollment: e.enrolled_at,
      class: e.class?.name ?? '',
    })
  }
  return {
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'first_enrollment', label: 'First Enrolled', format: 'date' },
      { key: 'class', label: 'Class' },
    ],
    rows: [...seen.values()].sort((a, b) => a.student.localeCompare(b.student)),
  }
}

async function claWaitlist(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('enrollments')
    .select(`
      enrolled_at, waitlist_position,
      student:students(first_name, last_name),
      class:classes(name)
    `)
    .eq('status', 'waitlisted')
    .order('waitlist_position', { ascending: true })
  return {
    columns: [
      { key: 'class', label: 'Class' },
      { key: 'position', label: 'Position', align: 'right' },
      { key: 'student', label: 'Student' },
      { key: 'added', label: 'Added', format: 'date' },
    ],
    rows: (data ?? []).map((e: any) => ({
      class: e.class?.name ?? '',
      position: e.waitlist_position ?? '',
      student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
      added: e.enrolled_at,
    })),
  }
}

// ---------- CAMP ----------

async function campList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('camps')
    .select(`
      name, start_date, end_date, max_capacity, price, age_min, age_max, active,
      instructor:instructors(first_name, last_name),
      room:rooms(name),
      registrations:camp_registrations(id, status)
    `)
    .order('start_date', { ascending: false })
  return {
    columns: [
      { key: 'name', label: 'Camp' },
      { key: 'start_date', label: 'Start', format: 'date' },
      { key: 'end_date', label: 'End', format: 'date' },
      { key: 'instructor', label: 'Instructor' },
      { key: 'room', label: 'Room' },
      { key: 'age', label: 'Ages' },
      { key: 'enrolled', label: 'Enrolled', align: 'right' },
      { key: 'capacity', label: 'Capacity', align: 'right' },
      { key: 'price', label: 'Price', format: 'currency', align: 'right' },
      { key: 'active', label: 'Status' },
    ],
    rows: (data ?? []).map((c: any) => ({
      name: c.name,
      start_date: c.start_date,
      end_date: c.end_date,
      instructor: c.instructor ? `${c.instructor.first_name} ${c.instructor.last_name}` : '',
      room: c.room?.name ?? '',
      age: c.age_min && c.age_max ? `${c.age_min}–${c.age_max}` : '',
      enrolled: (c.registrations ?? []).filter((r: any) => r.status === 'registered').length,
      capacity: c.max_capacity ?? '',
      price: c.price,
      active: c.active ? 'Active' : 'Archived',
    })),
  }
}

async function campEnrollments(filters: ReportFilters): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('camp_registrations')
    .select(`
      registered_at, status, payment_status,
      student:students(first_name, last_name),
      camp:camps(name)
    `)
    .order('registered_at', { ascending: false })
  const rows = applyDateRange((data ?? []) as any[], 'registered_at', filters).map((r: any) => ({
    camp: r.camp?.name ?? '',
    student: r.student ? `${r.student.last_name}, ${r.student.first_name}` : '',
    status: r.status,
    payment: r.payment_status,
    registered_at: r.registered_at,
  }))
  return {
    columns: [
      { key: 'camp', label: 'Camp' },
      { key: 'student', label: 'Student' },
      { key: 'status', label: 'Status' },
      { key: 'payment', label: 'Payment' },
      { key: 'registered_at', label: 'Registered', format: 'date' },
    ],
    rows,
  }
}

async function camperInfo(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('camp_registrations')
    .select(`
      camp:camps(name),
      student:students(first_name, last_name, date_of_birth, emergency_contact_name, emergency_contact_phone, medical_notes)
    `)
    .eq('status', 'registered')
  return {
    columns: [
      { key: 'camp', label: 'Camp' },
      { key: 'student', label: 'Student' },
      { key: 'age', label: 'Age', align: 'right' },
      { key: 'emergency', label: 'Emergency Contact' },
      { key: 'emergency_phone', label: 'Emergency Phone' },
      { key: 'medical', label: 'Medical Notes' },
    ],
    rows: (data ?? []).map((r: any) => ({
      camp: r.camp?.name ?? '',
      student: r.student ? `${r.student.last_name}, ${r.student.first_name}` : '',
      age: r.student?.date_of_birth ? ageYears(r.student.date_of_birth) : '',
      emergency: r.student?.emergency_contact_name ?? '',
      emergency_phone: r.student?.emergency_contact_phone ?? '',
      medical: r.student?.medical_notes ?? '',
    })),
  }
}

// ---------- STAFF ----------

async function staffList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('instructors')
    .select('first_name, last_name, email, phone, staff_role, active, pay_rate, pay_type')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Staff' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'rate', label: 'Pay Rate' },
      { key: 'active', label: 'Status' },
    ],
    rows: (data ?? []).map((i: any) => ({
      name: `${i.last_name}, ${i.first_name}`,
      email: i.email ?? '',
      phone: i.phone ?? '',
      role: i.staff_role ?? 'instructor',
      rate: i.pay_rate != null ? `$${i.pay_rate} / ${(i.pay_type ?? 'hourly').replace('_', ' ')}` : '',
      active: i.active ? 'Active' : 'Archived',
    })),
  }
}

async function staffPhonebook(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('instructors')
    .select('first_name, last_name, phone, email')
    .eq('active', true)
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Staff' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
    rows: (data ?? []).map((i: any) => ({
      name: `${i.last_name}, ${i.first_name}`,
      phone: i.phone ?? '',
      email: i.email ?? '',
    })),
  }
}

async function staffSchedule(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select(`
      name, day_of_week, start_time, end_time,
      instructor:instructors(first_name, last_name)
    `)
    .eq('active', true)
    .order('day_of_week').order('start_time')
  return {
    columns: [
      { key: 'instructor', label: 'Instructor' },
      { key: 'class', label: 'Class' },
      { key: 'day', label: 'Day' },
      { key: 'time', label: 'Time' },
    ],
    rows: (data ?? [])
      .filter((c: any) => c.instructor)
      .map((c: any) => ({
        instructor: `${c.instructor.last_name}, ${c.instructor.first_name}`,
        class: c.name,
        day: c.day_of_week,
        time: `${c.start_time?.slice(0, 5)}–${c.end_time?.slice(0, 5)}`,
      }))
      .sort((a: any, b: any) => a.instructor.localeCompare(b.instructor) || a.day.localeCompare(b.day) || a.time.localeCompare(b.time)),
  }
}

async function instructorRoster(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select(`
      name,
      instructor:instructors(first_name, last_name),
      enrollments:enrollments(id, status)
    `)
    .eq('active', true)
  return {
    columns: [
      { key: 'instructor', label: 'Instructor' },
      { key: 'class', label: 'Class' },
      { key: 'enrolled', label: 'Active Enrolled', align: 'right' },
    ],
    rows: (data ?? [])
      .filter((c: any) => c.instructor)
      .map((c: any) => ({
        instructor: `${c.instructor.last_name}, ${c.instructor.first_name}`,
        class: c.name,
        enrolled: (c.enrollments ?? []).filter((e: any) => e.status === 'active').length,
      }))
      .sort((a: any, b: any) => a.instructor.localeCompare(b.instructor)),
  }
}

async function classCampRoster(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const [{ data: classEnroll }, { data: campRegs }] = await Promise.all([
    supabase.from('enrollments').select('class:classes(name), student:students(first_name, last_name)').eq('status', 'active'),
    supabase.from('camp_registrations').select('camp:camps(name), student:students(first_name, last_name)').eq('status', 'registered'),
  ])
  const rows: any[] = []
  for (const e of (classEnroll ?? []) as any[]) {
    rows.push({
      kind: 'Class',
      activity: e.class?.name ?? '',
      student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
    })
  }
  for (const r of (campRegs ?? []) as any[]) {
    rows.push({
      kind: 'Camp',
      activity: r.camp?.name ?? '',
      student: r.student ? `${r.student.last_name}, ${r.student.first_name}` : '',
    })
  }
  rows.sort((a, b) => a.activity.localeCompare(b.activity) || a.student.localeCompare(b.student))
  return {
    columns: [
      { key: 'kind', label: 'Type' },
      { key: 'activity', label: 'Class / Camp' },
      { key: 'student', label: 'Student' },
    ],
    rows,
  }
}

async function instructorConflicts(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('classes')
    .select('name, day_of_week, start_time, end_time, instructor:instructors(id, first_name, last_name)')
    .eq('active', true)
  const byInstructor = new Map<string, any[]>()
  for (const c of (data ?? []) as any[]) {
    const id = c.instructor?.id
    if (!id) continue
    if (!byInstructor.has(id)) byInstructor.set(id, [])
    byInstructor.get(id)!.push(c)
  }
  const rows: any[] = []
  for (const list of byInstructor.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        if (a.day_of_week !== b.day_of_week) continue
        if (a.start_time < b.end_time && a.end_time > b.start_time) {
          rows.push({
            instructor: `${a.instructor.last_name}, ${a.instructor.first_name}`,
            day: a.day_of_week,
            class_a: `${a.name} (${a.start_time?.slice(0,5)}–${a.end_time?.slice(0,5)})`,
            class_b: `${b.name} (${b.start_time?.slice(0,5)}–${b.end_time?.slice(0,5)})`,
          })
        }
      }
    }
  }
  return {
    columns: [
      { key: 'instructor', label: 'Instructor' },
      { key: 'day', label: 'Day' },
      { key: 'class_a', label: 'Class A' },
      { key: 'class_b', label: 'Class B' },
    ],
    rows,
  }
}

async function staffNoEmail(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('instructors')
    .select('first_name, last_name, phone')
    .or('email.is.null,email.eq.')
    .order('last_name')
  return {
    columns: [
      { key: 'name', label: 'Staff' },
      { key: 'phone', label: 'Phone' },
    ],
    rows: (data ?? []).map((i: any) => ({
      name: `${i.last_name}, ${i.first_name}`,
      phone: i.phone ?? '',
    })),
  }
}

async function staffDuplicateEmails(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('instructors')
    .select('first_name, last_name, email')
    .not('email', 'is', null)
  const groups = new Map<string, { name: string; email: string }[]>()
  for (const i of data ?? []) {
    const key = (i.email ?? '').toLowerCase()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ name: `${i.last_name}, ${i.first_name}`, email: i.email })
  }
  const rows: any[] = []
  for (const list of groups.values()) {
    if (list.length > 1) {
      for (const row of list) rows.push({ ...row, sharing_with: list.length })
    }
  }
  return {
    columns: [
      { key: 'name', label: 'Staff' },
      { key: 'email', label: 'Email' },
      { key: 'sharing_with', label: 'Sharing', align: 'right' },
    ],
    rows,
  }
}

// ---------- FINANCIAL ----------

async function agedAccounts(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('amount, due_date, description, guardian:profiles(first_name, last_name)')
    .in('status', ['pending', 'failed'])
    .order('due_date', { ascending: true })
  const now = new Date()
  const rows = (data ?? []).map((i: any) => {
    const due = i.due_date ? new Date(i.due_date + 'T00:00:00') : null
    const daysPast = due ? Math.floor((now.getTime() - due.getTime()) / 86_400_000) : null
    let bucket = 'Current'
    if (daysPast !== null && daysPast > 0) {
      bucket = daysPast <= 30 ? '1-30 days' : daysPast <= 60 ? '31-60 days' : daysPast <= 90 ? '61-90 days' : '91+ days'
    }
    return {
      family: i.guardian ? `${i.guardian.last_name}, ${i.guardian.first_name}` : '',
      description: i.description,
      amount: i.amount,
      due_date: i.due_date ?? '',
      days_past_due: daysPast ?? '',
      bucket,
    }
  })
  return {
    columns: [
      { key: 'family', label: 'Family' },
      { key: 'description', label: 'Charge' },
      { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'days_past_due', label: 'Days Past Due', align: 'right' },
      { key: 'bucket', label: 'Aging Bucket' },
    ],
    rows,
  }
}

async function categoryList(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('charge_categories')
    .select('*')
    .order('name')
  return {
    columns: [
      { key: 'name', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'active', label: 'Status' },
    ],
    rows: (data ?? []).map((c: any) => ({
      name: c.name,
      description: c.description ?? '',
      active: c.active ? 'Active' : 'Archived',
    })),
  }
}

async function statementsReport(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('amount, status, guardian:profiles(id, first_name, last_name)')
  const map = new Map<string, { id: string; name: string; total: number; paid: number; pending: number; count: number }>()
  for (const i of (data ?? []) as any[]) {
    if (!i.guardian) continue
    const id = i.guardian.id
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: `${i.guardian.last_name}, ${i.guardian.first_name}`,
        total: 0, paid: 0, pending: 0, count: 0,
      })
    }
    const row = map.get(id)!
    const amt = Number(i.amount || 0)
    row.total += amt
    row.count++
    if (i.status === 'paid') row.paid += amt
    else if (i.status === 'pending' || i.status === 'failed') row.pending += amt
  }
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'count', label: 'Invoices', align: 'right' },
      { key: 'total', label: 'Total Invoiced', format: 'currency', align: 'right' },
      { key: 'paid', label: 'Paid', format: 'currency', align: 'right' },
      { key: 'pending', label: 'Balance', format: 'currency', align: 'right' },
    ],
    rows: [...map.values()].sort((a, b) => b.pending - a.pending),
  }
}

async function enrolledNotCharged(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const [{ data: enrollments }, { data: invoices }] = await Promise.all([
    supabase.from('enrollments').select('id, student:students(first_name, last_name), class:classes(name)').eq('status', 'active'),
    supabase.from('invoices').select('enrollment_id').not('enrollment_id', 'is', null),
  ])
  const charged = new Set((invoices ?? []).map((i: any) => i.enrollment_id))
  const rows = ((enrollments ?? []) as any[])
    .filter(e => !charged.has(e.id))
    .map(e => ({
      student: e.student ? `${e.student.last_name}, ${e.student.first_name}` : '',
      class: e.class?.name ?? '',
    }))
  return {
    columns: [
      { key: 'student', label: 'Student' },
      { key: 'class', label: 'Class' },
    ],
    rows,
  }
}

async function annualReceipts(): Promise<ReportResult> {
  const supabase = createAdminClient()
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const { data } = await supabase
    .from('invoices')
    .select('amount, paid_at, guardian:profiles(id, first_name, last_name)')
    .eq('status', 'paid')
    .gte('paid_at', yearStart)
  const map = new Map<string, { name: string; total: number; count: number }>()
  for (const i of (data ?? []) as any[]) {
    if (!i.guardian) continue
    const id = i.guardian.id
    if (!map.has(id)) {
      map.set(id, { name: `${i.guardian.last_name}, ${i.guardian.first_name}`, total: 0, count: 0 })
    }
    const row = map.get(id)!
    row.total += Number(i.amount || 0)
    row.count++
  }
  return {
    columns: [
      { key: 'name', label: 'Family' },
      { key: 'count', label: 'Payments', align: 'right' },
      { key: 'total', label: 'Total Receipts', format: 'currency', align: 'right' },
    ],
    rows: [...map.values()].sort((a, b) => b.total - a.total),
  }
}

async function periodSummary(filters: ReportFilters): Promise<ReportResult> {
  const supabase = createAdminClient()
  const fromIso = filters.from ? filters.from + 'T00:00:00' : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const toIso = filters.to ? filters.to + 'T23:59:59' : new Date().toISOString()
  const [{ data: enrollments }, { data: invoices }] = await Promise.all([
    supabase.from('enrollments').select('id, status, enrolled_at').gte('enrolled_at', fromIso).lte('enrolled_at', toIso),
    supabase.from('invoices').select('amount, status, paid_at').gte('paid_at', fromIso).lte('paid_at', toIso),
  ])
  const newEnrollments = (enrollments ?? []).length
  const activeEnrollments = (enrollments ?? []).filter((e: any) => e.status === 'active').length
  const dropped = (enrollments ?? []).filter((e: any) => e.status === 'dropped').length
  const paidInvoices = ((invoices ?? []) as any[]).filter(i => i.status === 'paid')
  const revenue = paidInvoices.reduce((s, i) => s + Number(i.amount || 0), 0)
  return {
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    rows: [
      { metric: 'New enrollments', value: newEnrollments },
      { metric: 'Active enrollments (in period)', value: activeEnrollments },
      { metric: 'Drops', value: dropped },
      { metric: 'Paid invoices', value: paidInvoices.length },
      { metric: 'Revenue', value: `$${revenue.toFixed(2)}` },
    ],
    notes: 'Defaults to the current month if no dates are provided.',
  }
}

async function returnedPayments(filters: ReportFilters): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('invoices')
    .select('description, amount, due_date, created_at, guardian:profiles(first_name, last_name)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
  const rows = applyDateRange((data ?? []) as any[], 'created_at', filters).map((i: any) => ({
    family: i.guardian ? `${i.guardian.last_name}, ${i.guardian.first_name}` : '',
    description: i.description,
    amount: i.amount,
    due_date: i.due_date ?? '',
    created_at: i.created_at,
  }))
  return {
    columns: [
      { key: 'family', label: 'Family' },
      { key: 'description', label: 'Charge' },
      { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'created_at', label: 'Recorded', format: 'datetime' },
    ],
    rows,
  }
}

export const RUNNERS: Record<string, (filters: ReportFilters) => Promise<ReportResult>> = {
  'FAM-1': famList,
  'FAM-2': famPhonebook,
  'FAM-3': famEmailList,
  'FAM-4': famNoEmail,
  'FAM-5': famMultiStudent,
  'FAM-12': famDuplicateEmails,
  'FAM-13': famGuardianAccess,

  'STU-1': stuList,
  'STU-2': stuPhonebook,
  'STU-3': stuBirthdays,
  'STU-4': stuAnniversaries,
  'STU-5': stuInsurableAgeGroups,

  'CLA-1': claList,
  'CLA-2': claCustomerList,
  'CLA-3': claProgramSummary,
  'CLA-5': claDropList,
  'CLA-9': claNewEnrollments,
  'CLA-13': claLevelSummary,
  'CLA-20': claFirstEnrollments,
  'CLA-21': claWaitlist,

  'CAM-1': campList,
  'CAM-2': campEnrollments,
  'CAM-7': camperInfo,

  'STA-1': staffList,
  'STA-2': staffPhonebook,
  'STA-3': staffSchedule,
  'STA-8': instructorRoster,
  'STA-9': classCampRoster,
  'STA-12': instructorConflicts,
  'STA-15': staffNoEmail,
  'STA-16': staffDuplicateEmails,

  'FIN-1': agedAccounts,
  'FIN-6': categoryList,
  'FIN-7': statementsReport,
  'FIN-13': enrolledNotCharged,
  'FIN-15': annualReceipts,
  'FIN-18': periodSummary,
  'FIN-23': returnedPayments,
}
