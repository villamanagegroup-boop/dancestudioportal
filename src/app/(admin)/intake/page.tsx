import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import IntakeInbox, { type IntakeRow } from '@/components/admin/IntakeInbox'
import { FORM_TYPES, INTAKE_STATUSES } from '@/lib/intake'

interface PageProps {
  searchParams: Promise<{ source?: string; status?: string }>
}

const SOURCE_SLUGS = new Set(FORM_TYPES.map(f => f.slug))
const STATUS_VALUES = new Set<string>(INTAKE_STATUSES)

export default async function IntakePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = createAdminClient()

  // Normalize filters. `source`: 'all' (default) or a known slug.
  // `status`: 'active' (default — hide dismissed) | 'all' | a concrete status.
  const source = sp.source && SOURCE_SLUGS.has(sp.source) ? sp.source : 'all'
  const status =
    sp.status === 'all' || STATUS_VALUES.has(sp.status ?? '') ? (sp.status as string) : 'active'

  let query = supabase
    .from('site_intake')
    .select(`
      id, source_form, source_table, submitter_name, submitter_email, payload,
      status, admin_notes, created_at, processed_at,
      linked_profile_id, linked_student_ids,
      linked_profile:profiles!linked_profile_id(
        id, first_name, last_name, email,
        guardian_students(student:students(id, first_name, last_name))
      )
    `)
    .order('created_at', { ascending: false })

  if (source !== 'all') query = query.eq('source_form', source)
  if (status === 'all') {
    /* no status filter */
  } else if (STATUS_VALUES.has(status)) {
    query = query.eq('status', status)
  } else {
    // 'active' default — hide fully-processed rows (dismissed + invited).
    query = query.not('status', 'in', '(dismissed,invited)')
  }

  const [{ data: rows }, { count: newCount }] = await Promise.all([
    query,
    supabase.from('site_intake').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Intake" subtitle="Form submissions from capitalcoredance.com" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <IntakeInbox
              rows={(rows ?? []) as unknown as IntakeRow[]}
              source={source}
              status={status}
              newCount={newCount ?? 0}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
