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

export async function createOrder(amount: number, description: string, invoiceId: string) {
  const token = await accessToken()
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: amount.toFixed(2) },
        description: description.slice(0, 127),
        custom_id: invoiceId,
      }],
    }),
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
