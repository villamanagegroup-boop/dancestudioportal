import { getPortalViewer } from '@/lib/portal-viewer'
import { createAdminClient } from '@/lib/supabase/admin'
import ViewAsBar from '@/components/portal/ViewAsBar'
import InstructorSidebar from '@/components/instructor/InstructorSidebar'

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getPortalViewer('i')

  let people: { id: string; label: string }[] = []
  if (viewer.canPreview) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('instructors')
      .select('id, first_name, last_name')
      .eq('active', true)
      .order('last_name')
    people = (data ?? []).map(i => ({
      id: i.id,
      label: `${i.first_name ?? ''} ${i.last_name ?? ''}`.trim() || 'Instructor',
    }))
  }

  const switcherRole = viewer.canPreview ? 'admin' : viewer.role ?? 'instructor'
  const previewActive = viewer.canPreview

  return (
    <div
      className="admin-shell flex h-screen"
      style={{ ['--preview-h' as any]: previewActive ? '36px' : '0px' }}
    >
      {previewActive && (
        <div className="fixed top-0 left-0 right-0" style={{ zIndex: 60 }}>
          <ViewAsBar kind="i" people={people} currentId={viewer.effectiveId} />
        </div>
      )}
      <div className="admin-header-bar" aria-hidden="true" />
      <InstructorSidebar role={switcherRole} />
      <div
        className="flex-1 flex flex-col overflow-hidden admin-content"
        style={{ paddingTop: 'var(--preview-h, 0px)' }}
      >
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
