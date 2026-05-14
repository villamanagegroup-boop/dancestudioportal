import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import FamilyTabs, { type FamilyProfile } from '@/components/admin/FamilyTabs'
import FamilyStudentManager from '@/components/admin/FamilyStudentManager'

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Resolve linked student ids first so the enrollments query can scope on them in parallel.
  const { data: linkedStudentRows } = await supabase
    .from('guardian_students')
    .select('student_id')
    .eq('guardian_id', id)
  const linkedStudentIds = (linkedStudentRows ?? []).map(r => r.student_id)

  const [
    { data: profile },
    { data: linkedStudents },
    { data: invoices },
    { data: payments },
    { data: paymentMethods },
    { data: allStudents },
    { data: policies },
    { data: acceptances },
    { data: notes },
    { data: commLog },
    { data: recipients },
    { data: activity },
    { data: classEnrollments },
    { data: campRegistrations },
    { data: parties },
    { data: bookings },
    { data: familyAppointments },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('guardian_students').select(`
      relationship, is_primary,
      student:students(id, first_name, last_name, date_of_birth, active)
    `).eq('guardian_id', id),
    supabase.from('invoices').select('id, description, amount, status, due_date, paid_at, created_at, invoice_type')
      .eq('guardian_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('id, amount, paid_at, payment_method_last_four, refunded_at')
      .eq('guardian_id', id).order('paid_at', { ascending: false }),
    supabase.from('payment_methods').select('id, last_four, card_brand, is_default, created_at')
      .eq('guardian_id', id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('students').select('id, first_name, last_name').eq('active', true).order('last_name'),
    supabase.from('policies').select('*').eq('active', true).order('name'),
    supabase.from('policy_acceptances').select('policy_id, accepted_at, policy_version').eq('guardian_id', id),
    supabase.from('family_notes').select(`
      id, body, pinned, kind, created_at,
      author:profiles!family_notes_author_id_fkey(first_name, last_name)
    `).eq('guardian_id', id).order('created_at', { ascending: false }),
    supabase.from('family_communication_log').select(`
      id, direction, channel, subject, body, occurred_at,
      staff:profiles!family_communication_log_staff_id_fkey(first_name, last_name)
    `).eq('guardian_id', id).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('communication_recipients').select(`
      delivered_at, opened_at,
      communication:communications(id, subject, body, comm_type, sent_at)
    `).eq('guardian_id', id).order('delivered_at', { ascending: false }).limit(20),
    supabase.from('family_activity_log').select(`
      id, action, meta, created_at,
      actor:profiles!family_activity_log_actor_id_fkey(first_name, last_name)
    `).eq('guardian_id', id).order('created_at', { ascending: false }).limit(50),
    // Class enrollments scoped to this family's linked students (empty array short-circuits to no rows)
    linkedStudentIds.length > 0
      ? supabase.from('enrollments').select(`
          id, status, enrolled_at,
          student:students!inner(id, first_name, last_name),
          class:classes(id, name, day_of_week, start_time, end_time, monthly_tuition)
        `).in('student_id', linkedStudentIds).order('enrolled_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('camp_registrations').select(`
      id, status, paid_at,
      student:students(id, first_name, last_name),
      camp:camps(id, name, start_date, end_date, price)
    `).eq('guardian_id', id).order('created_at', { ascending: false }),
    supabase.from('parties').select('id, event_date, start_time, end_time, package, price, status, deposit_paid')
      .eq('guardian_id', id).order('event_date', { ascending: false }),
    supabase.from('bookings').select('id, title, booking_date, start_time, end_time, booking_type, price, status')
      .eq('guardian_id', id).order('booking_date', { ascending: false }),
    linkedStudentIds.length > 0
      ? supabase.from('student_appointments').select(`
          id, appointment_type, title, scheduled_at, duration_minutes, location, status, notes,
          student:students(first_name, last_name),
          instructor:instructors(first_name, last_name)
        `).in('student_id', linkedStudentIds).order('scheduled_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ])

  if (!profile) notFound()

  // Linked students for the FamilyStudentManager (existing component)
  const linkedIds = new Set((linkedStudents ?? []).map((ls: any) => ls.student?.id).filter(Boolean))
  const unlinkableStudents = (allStudents ?? []).filter(s => !linkedIds.has(s.id))

  // Secondary guardians: other profiles who share students with this family
  const sharedStudentIds = Array.from(linkedIds) as string[]
  let secondaryGuardians: any[] = []
  if (sharedStudentIds.length > 0) {
    const { data: coLinks } = await supabase
      .from('guardian_students')
      .select(`student_id, guardian:profiles(id, first_name, last_name, email, phone)`)
      .in('student_id', sharedStudentIds)
      .neq('guardian_id', id)

    const byGuardian = new Map<string, { profile: any; students: Set<string> }>()
    for (const row of (coLinks ?? []) as any[]) {
      if (!row.guardian) continue
      const existing = byGuardian.get(row.guardian.id) ?? { profile: row.guardian, students: new Set<string>() }
      existing.students.add(row.student_id)
      byGuardian.set(row.guardian.id, existing)
    }

    const studentNames = new Map((linkedStudents ?? []).map((ls: any) => [ls.student?.id, ls.student ? `${ls.student.first_name} ${ls.student.last_name}` : '']))
    secondaryGuardians = Array.from(byGuardian.values()).map(v => ({
      ...v.profile,
      shared_students: Array.from(v.students).map(sid => studentNames.get(sid)).filter(Boolean),
    }))
  }

  // Merge policies with their acceptances
  const acceptanceMap = new Map((acceptances ?? []).map(a => [a.policy_id, a]))
  const mergedPolicies = (policies ?? []).map(p => ({
    ...p,
    acceptance: acceptanceMap.get(p.id) ?? null,
  }))

  // Flatten broadcast recipients into the shape the tab expects
  const broadcasts = (recipients ?? [])
    .filter((r: any) => r.communication)
    .map((r: any) => ({
      id: r.communication.id,
      subject: r.communication.subject,
      body: r.communication.body,
      comm_type: r.communication.comm_type,
      sent_at: r.communication.sent_at,
      delivered_at: r.delivered_at,
      opened_at: r.opened_at,
    }))

  const familyProfile: FamilyProfile = {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    address_street: profile.address_street ?? null,
    address_city: profile.address_city ?? null,
    address_state: profile.address_state ?? null,
    address_zip: profile.address_zip ?? null,
    secondary_email: profile.secondary_email ?? null,
    secondary_phone: profile.secondary_phone ?? null,
    sms_opt_in: profile.sms_opt_in ?? false,
    email_opt_in: profile.email_opt_in ?? true,
    tags: profile.tags ?? [],
    custom_fields: profile.custom_fields ?? {},
    registration_anniversary: profile.registration_anniversary ?? null,
    created_at: profile.created_at,
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`${profile.first_name} ${profile.last_name}`} subtitle="Family account" />
      <div className="p-6 space-y-6">
        <FamilyTabs
          profile={familyProfile}
          linkedStudents={(linkedStudents ?? []) as any}
          secondaryGuardians={secondaryGuardians}
          invoices={(invoices ?? []) as any}
          payments={(payments ?? []) as any}
          paymentMethods={(paymentMethods ?? []) as any}
          classEnrollments={(classEnrollments ?? []) as any}
          campRegistrations={(campRegistrations ?? []) as any}
          parties={(parties ?? []) as any}
          bookings={(bookings ?? []) as any}
          appointments={(familyAppointments ?? []) as any}
          policies={mergedPolicies as any}
          notes={(notes ?? []) as any}
          commLog={(commLog ?? []) as any}
          broadcasts={broadcasts}
          activity={(activity ?? []) as any}
        />

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Link / unlink dancers</h2>
          </div>
          <FamilyStudentManager
            familyId={id}
            linkedStudents={(linkedStudents ?? []) as any}
            availableStudents={unlinkableStudents}
          />
        </div>
      </div>
    </div>
  )
}
