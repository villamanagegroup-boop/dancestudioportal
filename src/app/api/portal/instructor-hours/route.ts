import { getPortalViewer } from '@/lib/portal-viewer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { db, effectiveId } = await getPortalViewer('i')
  if (!effectiveId) {
    return NextResponse.json({ error: 'Sign in to log hours.' }, { status: 401 })
  }

  const body = await req.json()
  const worked_on = body.worked_on
  const hours = Number(body.hours)
  const notes = body.notes?.trim() || null

  if (!worked_on) {
    return NextResponse.json({ error: 'Date is required.' }, { status: 400 })
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return NextResponse.json({ error: 'Hours must be between 0 and 24.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('instructor_hours')
    .insert({ instructor_id: effectiveId, worked_on, hours, notes })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
