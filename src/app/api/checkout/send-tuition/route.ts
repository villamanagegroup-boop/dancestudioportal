import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTuitionPayLink } from '@/lib/resend'
import { lineItemsTotal } from '@/lib/checkout'

// Emails each tuition pay link to its recipient. Admin only.
// Body: { slugPrefix?: string, resend?: boolean, onlySlug?: string }
//  - slugPrefix: which batch to send (default 'tuition-')
//  - resend: if true, also re-send links already emailed (default false)
//  - onlySlug: send a single link (used for testing one recipient)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { slugPrefix = 'tuition-', resend = false, onlySlug } = await req.json().catch(() => ({}))

  let q = admin
    .from('checkout_links')
    .select('id, slug, title, amount, line_items, recipient_email, recipient_name, email_sent_at, active')
    .eq('active', true)
    .not('recipient_email', 'is', null)
  if (onlySlug) q = q.eq('slug', onlySlug)
  else q = q.like('slug', `${slugPrefix}%`)

  const { data: links, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const studioName = process.env.NEXT_PUBLIC_STUDIO_NAME || 'Capital Core Dance Studio'

  let sent = 0, skipped = 0
  const errors: { slug: string; reason: string }[] = []

  for (const link of links ?? []) {
    if (!resend && link.email_sent_at) { skipped++; continue }
    const items = ((link.line_items as any) ?? []) as { label: string; amount: number }[]
    const amount = link.amount != null ? Number(link.amount) : lineItemsTotal(items as any)
    try {
      await sendTuitionPayLink({
        to: link.recipient_email!,
        guardianName: link.recipient_name || 'there',
        amount,
        items,
        payUrl: `${base}/pay/${link.slug}`,
        studioName,
        periodLabel: link.title?.replace(/^Tuition\s*[—-]\s*/i, '') || 'Tuition',
      })
      await admin.from('checkout_links').update({ email_sent_at: new Date().toISOString() }).eq('id', link.id)
      sent++
    } catch (e: any) {
      errors.push({ slug: link.slug, reason: e?.message ?? 'send failed' })
    }
  }

  return NextResponse.json({ sent, skipped, total: links?.length ?? 0, errors })
}
