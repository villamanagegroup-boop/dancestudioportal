import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify, round2, lineItemsTotal, type CheckoutLineItem } from '@/lib/checkout'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return { admin, userId: user.id }
}

export async function GET() {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  const { data, error } = await ctx.admin
    .from('checkout_links')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ links: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const title = String(b.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const allowCustom = !!b.allowCustomAmount
  const rawItems: CheckoutLineItem[] = Array.isArray(b.lineItems)
    ? b.lineItems
        .map((it: any) => ({
          label: String(it.label ?? '').trim(),
          amount: round2(Number(it.amount)),
          qty: Math.max(1, Math.floor(Number(it.qty) || 1)),
        }))
        .filter((it: CheckoutLineItem) => it.label && it.amount > 0)
    : []

  let amount: number | null = null
  if (!allowCustom) {
    if (b.amount != null && Number(b.amount) > 0) amount = round2(Number(b.amount))
    else if (rawItems.length) amount = lineItemsTotal(rawItems)
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Set an amount or add line items, or allow a custom amount' }, { status: 400 })
    }
  }

  const suggested = Array.isArray(b.suggestedAmounts)
    ? b.suggestedAmounts.map((n: any) => round2(Number(n))).filter((n: number) => n > 0)
    : []

  const { data, error } = await ctx.admin
    .from('checkout_links')
    .insert({
      slug: slugify(title),
      title,
      description: b.description ? String(b.description) : null,
      line_items: rawItems,
      amount,
      allow_custom_amount: allowCustom,
      min_amount: b.minAmount != null && Number(b.minAmount) > 0 ? round2(Number(b.minAmount)) : null,
      suggested_amounts: suggested,
      collect_contact: b.collectContact !== false,
      require_contact: !!b.requireContact,
      thank_you_message: b.thankYouMessage ? String(b.thankYouMessage) : null,
      created_by: ctx.userId,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ link: data })
}
