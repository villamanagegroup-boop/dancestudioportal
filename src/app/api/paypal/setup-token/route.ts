import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSetupToken } from '@/lib/paypal'

// Creates a vault setup token for saving a card without a purchase.
// Admins may pass guardianId to add a card on a family's behalf.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { guardianId } = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  let targetGuardian = user.id
  if (guardianId && guardianId !== user.id) {
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add cards for other accounts' }, { status: 403 })
    }
    targetGuardian = guardianId
  }

  // Group new cards under the family's existing PayPal customer if present.
  const { data: anyMethod } = await admin
    .from('payment_methods')
    .select('paypal_customer_id')
    .eq('guardian_id', targetGuardian)
    .eq('provider', 'paypal')
    .not('paypal_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  try {
    const setupToken = await createSetupToken(anyMethod?.paypal_customer_id ?? null)
    return NextResponse.json({ setupToken })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'PayPal error' }, { status: 500 })
  }
}
