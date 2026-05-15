import { getPortalViewer } from '@/lib/portal-viewer'
import { NextRequest, NextResponse } from 'next/server'

const FIELDS = ['first_name', 'last_name', 'email', 'phone', 'bio', 'specialties'] as const
const NULLABLE_WHEN_BLANK = new Set(['phone', 'bio'])

export async function PATCH(req: NextRequest) {
  const { db, effectiveId } = await getPortalViewer('i')
  if (!effectiveId) {
    return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 })
  }

  const body = await req.json()
  const update: Record<string, unknown> = {}
  for (const f of FIELDS) {
    if (f in body) {
      const v = body[f]
      update[f] = NULLABLE_WHEN_BLANK.has(f) && (v === '' || v === undefined) ? null : v
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { error } = await db.from('instructors').update(update).eq('id', effectiveId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
