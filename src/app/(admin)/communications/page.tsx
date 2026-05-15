import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import CommunicationsPanel from '@/components/admin/CommunicationsPanel'

export default async function CommunicationsPage() {
  const supabase = createAdminClient()

  const [{ data: communications }, { data: classes }, { data: guardians }, { data: instructors }] = await Promise.all([
    supabase
      .from('communications')
      .select(`
        id, subject, body, comm_type, target_type, target_all,
        sent_at, scheduled_for, created_at, recipient_count,
        sender:profiles!communications_sender_id_fkey(first_name, last_name),
        target_class:classes(name),
        target_guardian:profiles!communications_target_guardian_id_fkey(first_name, last_name),
        target_instructor:instructors(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('classes').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, first_name, last_name').eq('role', 'parent').order('last_name'),
    supabase.from('instructors').select('id, first_name, last_name').eq('active', true).order('last_name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <Header title="Communications" subtitle="Studio inbox — message families, classes, and staff" />
      <div className="p-6 overflow-y-auto">
        <CommunicationsPanel
          communications={(communications ?? []) as any}
          classes={classes ?? []}
          guardians={guardians ?? []}
          instructors={instructors ?? []}
        />
      </div>
    </div>
  )
}
