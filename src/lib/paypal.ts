// PayPal Orders v2 server helper. Uses raw REST so we don't need a
// server SDK. Defaults to LIVE; set PAYPAL_ENV=sandbox to use sandbox.

const LIVE = 'https://api-m.paypal.com'
const SANDBOX = 'https://api-m.sandbox.paypal.com'

export function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'sandbox' ? SANDBOX : LIVE
}

export function paypalConfigured() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('PayPal not configured (missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)')
  const auth = Buffer.from(`${id}:${secret}`).toString('base64')
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

interface CreateOrderOpts {
  amount: number
  description: string
  invoiceId: string
  /** Save the card to the vault on successful capture. */
  saveCard?: boolean
  /** Existing PayPal customer id to group vaulted cards under. */
  customerId?: string | null
  /** Pay with a previously vaulted payment token instead of new card. */
  savedTokenId?: string | null
}

export async function createOrder(opts: CreateOrderOpts) {
  const token = await accessToken()

  const body: any = {
    intent: 'CAPTURE',
    purchase_units: [{
      amount: { currency_code: 'USD', value: opts.amount.toFixed(2) },
      description: opts.description.slice(0, 127),
      custom_id: opts.invoiceId,
    }],
  }

  if (opts.savedTokenId) {
    // Charge an existing vaulted card.
    body.payment_source = { token: { id: opts.savedTokenId, type: 'PAYMENT_METHOD_TOKEN' } }
  } else if (opts.saveCard) {
    // Collect a new card (via card-fields) and vault it on success.
    body.payment_source = {
      card: {
        attributes: {
          vault: { store_in_vault: 'ON_SUCCESS' },
          ...(opts.customerId ? { customer: { id: opts.customerId } } : {}),
        },
      },
    }
  }

  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Failed to create PayPal order')
  return data.id as string
}

export async function captureOrder(orderId: string) {
  const token = await accessToken()
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Failed to capture PayPal order')
  return data
}
