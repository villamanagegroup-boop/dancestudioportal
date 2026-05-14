import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import FamiliesTable from '@/components/admin/FamiliesTable'

export default async function FamiliesPage() {
  const supabase = createAdminClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, active, created_at, guardian_students(student_id)')
    .eq('role', 'parent')
    .order('last_name')

  const families = (profiles ?? []).map(p => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone: p.phone,
    active: p.active,
    created_at: p.created_at,
    student_count: Array.isArray(p.guardian_students) ? p.guardian_students.length : 0,
  }))

  return (
    <div className="flex flex-col h-full">
      <Header title="Families" subtitle="Parent accounts and linked students" />
      <div className="p-6">
        <FamiliesTable families={families} />
      </div>
    </div>
  )
}
