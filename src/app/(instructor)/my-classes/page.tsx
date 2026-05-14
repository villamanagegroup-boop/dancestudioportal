import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'

export default async function MyClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: instructor } = await supabase
    .from('instructors').select('id').eq('profile_id', user.id).single()

  const { data: classes } = instructor
    ? await supabase.from('classes').select(`
        *, class_type:class_types(name, style, color), room:rooms(name)
      `).eq('instructor_id', instructor.id).eq('active', true).order('day_of_week').order('start_time')
    : { data: [] }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
      {!classes?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm shadow-sm">
          No classes assigned
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((cls: any) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.class_type?.color ?? '#7c3aed' }} />
                  <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                </div>
                <p className="text-sm text-gray-600 capitalize">{cls.day_of_week} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}</p>
                {cls.room && <p className="text-sm text-gray-500">{cls.room.name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
