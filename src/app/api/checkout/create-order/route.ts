import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrder } from '@/lib/paypal'
import { lineItemsTotal, round2 } from '@/lib/checkout'

// Public: starts a PayPal order for a shared payment link (by slug) or, for an
// authenticated admin, an ad-hoc staff-entered amount.
export async function POST(request: NextRequest) {
  const { slug, amount, lineItems, description } = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  let charge: number
  let desc: string

  if (slug) {
    const { data: link } = await admin
      .from('checkout_links')
      .select('id, title, amount, line_items, allow_custom_amount, min_amount, active')
      .eq('slug', slug)
      .maybeSingle()
    if (!link) return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    if (!link.active) return NextResponse.json({ error: 'This payment link is no longer active' }, { status: 410 })

    desc = link.title
    if (link.allow_custom_amount) {
      charge = round2(Number(amount))
      if (!charge || charge <= 0) {
        return NextResponse.json({ error: 'Please enter an amount' }, { status: 400 })
      }
      if (link.min_amount != null && charge < Number(link.min_amount)) {
        return NextResponse.json({ error: `Minimum is $${Number(link.min_amount).toFixed(2)}` }, { status: 400 })
      }
    } else {
      charge = link.amount != null ? round2(Number(link.amount)) : lineItemsTotal(link.line_items as any)
    }
  } else {
    // No link => staff-operated ad-hoc charge. Require an admin session.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const fromItems = lineItemsTotal(lineItems)
    charge = round2(Number(amount) || fromItems)
    if (!charge || charge <= 0) return NextResponse.json({ error: 'Enter an amount greater than $0' }, { status: 400 })
    desc = (description && String(description).trim()) || 'Payment'
  }

  try {
    const reference = `chk_${slug ?? 'staff'}_${Date.now()}`
    const orderId = await createOrder({
      amount: charge,
      description: desc,
      invoiceId: reference,
    })
    return NextResponse.json({ orderId, amount: charge })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'PayPal error' }, { status: 500 })
  }
}
