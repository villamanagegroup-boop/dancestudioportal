import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import NotesInbox, { type InboxNote } from '@/components/admin/NotesInbox'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const supabase = createAdminClient()

  const [{ data: studentNotes }, { data: familyNotes }] = await Promise.all([
    supabase
      .from('student_notes')
      .select('id, body, pinned, kind, created_at, student:students(id, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(150),
    supabase
      .from('family_notes')
      .select('id, body, pinned, kind, created_at, guardian:profiles!family_notes_guardian_id_fkey(id, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(150),
  ])

  const fromStudents: InboxNote[] = (studentNotes ?? []).map((n: any) => ({
    id: n.id,
    body: n.body,
    pinned: !!n.pinned,
    kind: n.kind === 'announcement' ? 'announcement' : 'note',
    created_at: n.created_at,
    source: 'student',
    personName: n.student ? `${n.student.first_name ?? ''} ${n.student.last_name ?? ''}`.trim() || 'Student' : 'Student',
    href: n.student?.id ? `/students/${n.student.id}` : '/students',
  }))

  const fromFamilies: InboxNote[] = (familyNotes ?? []).map((n: any) => ({
    id: n.id,
    body: n.body,
    pinned: !!n.pinned,
    kind: n.kind === 'announcement' ? 'announcement' : 'note',
    created_at: n.created_at,
    source: 'family',
    personName: n.guardian ? `${n.guardian.first_name ?? ''} ${n.guardian.last_name ?? ''}`.trim() || 'Family' : 'Family',
    href: n.guardian?.id ? `/families/${n.guardian.id}` : '/families',
  }))

  // Merge and sort newest-first; pinned notes float to the top within that order.
  const notes = [...fromStudents, ...fromFamilies].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.created_at < b.created_at ? 1 : -1
  })

  return (
    <div className="flex flex-col h-full">
      <Header title="Notes" subtitle="Every student & family note in one place — separate from studio News" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <NotesInbox notes={notes} />
          </div>
        </div>
      </div>
    </div>
  )
}
