import { getPortalViewer } from '@/lib/portal-viewer'
import { formatTime } from '@/lib/utils'
import Link from 'next/link'
import Header from '@/components/admin/Header'
import SectionHead from '@/components/admin/SectionHead'

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default async function MyClassesPage() {
  const { db, effectiveId } = await getPortalViewer('i')

  const { data: instructor } = effectiveId
    ? await db.from('instructors').select('first_name').eq('id', effectiveId).maybeSingle()
    : { data: null as any }

  const { data: classes } = effectiveId
    ? await db
        .from('classes')
        .select(`
          id, name, day_of_week, start_time, end_time, max_students,
          class_type:class_types(name, style, color),
          room:rooms(name),
          enrollments:enrollments(id, status)
        `)
        .eq('instructor_id', effectiveId)
        .eq('active', true)
        .order('day_of_week')
        .order('start_time')
    : { data: [] }

  const list = (classes ?? []) as any[]
  const totalActive = list.reduce(
    (sum, c) => sum + (c.enrollments ?? []).filter((e: any) => e.status === 'active').length,
    0,
  )

  return (
    <div className="flex flex-col h-full">
      <Header title="My Classes" />
      <div className="flex-1 overflow-y-auto">
        <div className="page-gutter min-h-full">
          <div className="glass glass-page min-h-full">
            <div className="mb-7">
              <p className="eyebrow" style={{ color: 'var(--ink-3)' }}>Schedule</p>
              <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}>
                {list.length === 0
                  ? 'You have no classes assigned yet.'
                  : `You're teaching ${list.length} class${list.length === 1 ? '' : 'es'} with ${totalActive} active dancer${totalActive === 1 ? '' : 's'}.`}
              </p>
            </div>

      <SectionHead label="Class schedule" />

      {list.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nothing scheduled — assignments will show up here.</p>
      ) : (
        <div className="tight-list">
          {list
            .slice()
            .sort((a, b) =>
              DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
              || (a.start_time ?? '').localeCompare(b.start_time ?? ''),
            )
            .map((cls: any) => {
              const active = (cls.enrollments ?? []).filter((e: any) => e.status === 'active').length
              const max = cls.max_students ?? 0
              return (
                <Link key={cls.id} href={`/classes/${cls.id}`} className="tl-row">
                  <div className="tl-lead">
                    <div className="t" style={{ textTransform: 'capitalize' }}>{cls.day_of_week?.slice(0, 3)}</div>
                    <div className="s">{formatTime(cls.start_time)}</div>
                  </div>
                  <div className="tl-main">
                    <div className="t flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cls.class_type?.color ?? 'var(--grad-1)' }}
                      />
                      {cls.name}
                    </div>
                    <div className="s">
                      {cls.class_type?.style ?? 'Class'}
                      {cls.room?.name && <> · {cls.room.name}</>}
                      {max > 0 && <> · {active}/{max} enrolled</>}
                    </div>
                  </div>
                  <div className="tl-trail">
                    {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                  </div>
                </Link>
              )
            })}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
