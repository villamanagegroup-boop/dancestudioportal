import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import StaffEditButton from '@/components/admin/StaffEditButton'
import StaffPermissionsPanel from '@/components/admin/StaffPermissionsPanel'
import { formatDate, formatTime } from '@/lib/utils'

function bgCheckBadge(expires: string | null) {
  if (!expires) return { label: 'No background check on file', cls: 'bg-gray-100 text-gray-500' }
  const days = Math.round((new Date(expires + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  if (days < 0) return { label: `Expired ${formatDate(expires)}`, cls: 'bg-red-50 text-red-600' }
  if (days <= 60) return { label: `Expires in ${days}d (${formatDate(expires)})`, cls: 'bg-amber-50 text-amber-600' }
  return { label: `Current — expires ${formatDate(expires)}`, cls: 'bg-green-50 text-green-600' }
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: instructor }, { data: classes }] = await Promise.all([
    supabase.from('instructors').select('*').eq('id', id).single(),
    supabase.from('classes').select(`
      id, name, day_of_week, start_time, end_time, max_students,
      class_type:class_types(style, color)
    `).eq('instructor_id', id).eq('active', true),
  ])

  if (!instructor) notFound()

  const bg = bgCheckBadge(instructor.background_check_expires)

  return (
    <div className="flex flex-col h-full">
      <Header title={`${instructor.first_name} ${instructor.last_name}`} subtitle="Instructor profile" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-1">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 rounded-full bg-studio-100 flex items-center justify-center text-studio-700 font-bold text-2xl mb-4">
                {instructor.first_name[0]}{instructor.last_name[0]}
              </div>
              <StaffEditButton instructor={instructor} />
            </div>
            <h2 className="font-semibold text-gray-900 text-lg">
              {instructor.first_name} {instructor.last_name}
              {!instructor.active && (
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
              )}
            </h2>
            <p className="text-sm text-gray-500">{instructor.email}</p>
            {instructor.phone && <p className="text-sm text-gray-500">{instructor.phone}</p>}
            {instructor.bio && <p className="text-sm text-gray-600 mt-3">{instructor.bio}</p>}
            {instructor.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {instructor.specialties.map((s: string) => (
                  <span key={s} className="text-xs bg-studio-50 text-studio-700 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pay Rate</span>
                <span className="font-medium text-gray-900">
                  {instructor.pay_rate != null ? `$${instructor.pay_rate} / ${(instructor.pay_type ?? 'hourly').replace('_', ' ')}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned Classes</span>
                <span className="font-medium text-gray-900">{classes?.length ?? 0}</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Background Check</p>
                <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${bg.cls}`}>{bg.label}</span>
                {instructor.background_check_date && (
                  <p className="text-xs text-gray-400 mt-1">Last completed {formatDate(instructor.background_check_date)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm col-span-2">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Class Schedule</h2>
            </div>
            {!classes?.length ? (
              <div className="p-8 text-center text-gray-400 text-sm">No classes assigned</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Day</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Style</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classes.map((cls: any) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{cls.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 capitalize">{cls.day_of_week}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatTime(cls.start_time)} – {formatTime(cls.end_time)}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full text-white" style={{ backgroundColor: cls.class_type?.color ?? '#7c3aed' }}>
                          {cls.class_type?.style ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

            <StaffPermissionsPanel instructor={instructor} />
          </div>
        </div>
      </div>
    </div>
  )
}
