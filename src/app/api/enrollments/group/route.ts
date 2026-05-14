import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { studentIds, classIds, notes } = await req.json()

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one student' }, { status: 400 })
  }
  if (!Array.isArray(classIds) || classIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one class' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: classes, error: clsErr } = await supabase
    .from('classes')
    .select('id, season_id, max_students')
    .in('id', classIds)
  if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 400 })

  // Existing non-dropped/completed enrollments for these students+classes
  const { data: existing } = await supabase
    .from('enrollments')
    .select('student_id, class_id, status')
    .in('class_id', classIds)
    .in('student_id', studentIds)
    .not('status', 'in', '(dropped,completed)')
  const taken = new Set((existing ?? []).map(e => `${e.student_id}:${e.class_id}`))

  // Current active counts per class
  const { data: activeRows } = await supabase
    .from('enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('status', 'active')
  const activeCount: Record<string, number> = {}
  for (const r of activeRows ?? []) {
    activeCount[r.class_id] = (activeCount[r.class_id] ?? 0) + 1
  }
  const waitlistNext: Record<string, number> = {}

  const toInsert: Record<string, unknown>[] = []
  let skipped = 0
  let waitlisted = 0
  let created = 0

  for (const cls of classes ?? []) {
    if (waitlistNext[cls.id] === undefined) {
      waitlistNext[cls.id] = 0
    }
    for (const studentId of studentIds) {
      if (taken.has(`${studentId}:${cls.id}`)) {
        skipped++
        continue
      }
      const isFull = (activeCount[cls.id] ?? 0) >= (cls.max_students ?? 0)
      if (isFull) {
        waitlistNext[cls.id]++
        toInsert.push({
          student_id: studentId,
          class_id: cls.id,
          season_id: cls.season_id,
          status: 'waitlisted',
          waitlist_position: waitlistNext[cls.id],
          notes: notes || null,
        })
        waitlisted++
      } else {
        activeCount[cls.id] = (activeCount[cls.id] ?? 0) + 1
        toInsert.push({
          student_id: studentId,
          class_id: cls.id,
          season_id: cls.season_id,
          status: 'active',
          notes: notes || null,
        })
        created++
      }
    }
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ created: 0, waitlisted: 0, skipped })
  }

  const { error } = await supabase.from('enrollments').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ created, waitlisted, skipped })
}
