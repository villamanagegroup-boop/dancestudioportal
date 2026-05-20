import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/admin/Header'
import StaffGrid from '@/components/admin/StaffGrid'
import RolesPanelModal from '@/components/admin/RolesPanelModal'

export default async function StaffPage() {
  const supabase = createAdminClient()
  const [{ data: instructors, error }, { data: admins }] = await Promise.all([
    supabase.from('instructors').select('*').order('last_name'),
    supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'admin').order('last_name'),
  ])

  // Admins who don't also have an instructor record — shown as team members.
  const instructorProfileIds = new Set((instructors ?? []).map((i: any) => i.profile_id).filter(Boolean))
  const adminOnly = (admins ?? []).filter(a => !instructorProfileIds.has(a.id))

  return (
    <div className="flex flex-col h-full">
      <Header title="Staff" subtitle="Team members — administrators and instructors" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full space-y-6">
            {/* Administrators / owners */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Administrators</h2>
                <p className="text-sm text-gray-500 mt-0.5">Owners and managers with admin access</p>
              </div>
              {adminOnly.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No admin-only accounts</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {adminOnly.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-9 h-9 rounded-full bg-studio-100 text-studio-700 flex items-center justify-center text-sm font-semibold">
                        {(a.first_name?.[0] ?? '').toUpperCase()}{(a.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {a.first_name} {a.last_name}
                          <span className="text-xs font-medium text-studio-700 bg-studio-50 px-2 py-0.5 rounded-full ml-2">Admin</span>
                        </p>
                        <p className="text-xs text-gray-500">{a.email}</p>
                      </div>
                      <RolesPanelModal profileId={a.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instructors */}
            {error ? (
              <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error.message}</div>
            ) : (
              <StaffGrid instructors={instructors ?? []} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
