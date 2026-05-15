export interface Recipient {
  email: string
  guardianId: string | null
}

export interface TargetOpts {
  target_type: string
  target_class_id?: string | null
  target_guardian_id?: string | null
  target_instructor_id?: string | null
}

export const VALID_TARGETS = ['all_families', 'all_staff', 'everyone', 'class', 'family', 'staff_member']

/** Resolves a communication's target group into a de-duplicated list of recipients. */
export async function resolveRecipients(supabase: any, opts: TargetOpts): Promise<Recipient[]> {
  const { target_type, target_class_id, target_guardian_id, target_instructor_id } = opts
  const recipients: Recipient[] = []
  const seen = new Set<string>()

  function add(email: string | null | undefined, guardianId: string | null) {
    if (!email) return
    const key = email.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    recipients.push({ email, guardianId })
  }

  if (target_type === 'all_families' || target_type === 'everyone') {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'parent')
    for (const p of data ?? []) add(p.email, p.id)
  }
  if (target_type === 'all_staff' || target_type === 'everyone') {
    const { data } = await supabase.from('instructors').select('email').eq('active', true)
    for (const i of data ?? []) add(i.email, null)
  }
  if (target_type === 'class' && target_class_id) {
    const { data: rows } = await supabase
      .from('enrollments')
      .select('student:students(guardian_students(guardian:profiles(id, email)))')
      .eq('class_id', target_class_id)
      .eq('status', 'active')
    for (const row of rows ?? []) {
      const student = row.student as any
      for (const gs of student?.guardian_students ?? []) {
        add(gs?.guardian?.email, gs?.guardian?.id ?? null)
      }
    }
  }
  if (target_type === 'family' && target_guardian_id) {
    const { data: g } = await supabase.from('profiles').select('id, email').eq('id', target_guardian_id).single()
    if (g) add(g.email, g.id)
  }
  if (target_type === 'staff_member' && target_instructor_id) {
    const { data: i } = await supabase.from('instructors').select('email').eq('id', target_instructor_id).single()
    if (i) add(i.email, null)
  }

  return recipients
}
