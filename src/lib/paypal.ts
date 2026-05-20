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

/**
 * Create a vault setup token (save a card without a purchase). The card
 * details are collected client-side via card-fields tied to this token.
 * Pass an existing customerId to group new cards under the same customer.
 */
export async function createSetupToken(customerId?: string | null): Promise<string> {
  const token = await accessToken()
  const body: any = { payment_source: { card: {} } }
  if (customerId) body.customer = { id: customerId }
  const res = await fetch(`${paypalBaseUrl()}/v3/vault/setup-tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Failed to create setup token')
  return data.id as string
}

/** Exchange an approved setup token for a permanent vault payment token. */
export async function createPaymentTokenFromSetup(setupTokenId: string) {
  const token = await accessToken()
  const res = await fetch(`${paypalBaseUrl()}/v3/vault/payment-tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_source: { token: { id: setupTokenId, type: 'SETUP_TOKEN' } } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Failed to vault card')
  return data as {
    id: string
    customer?: { id?: string }
    payment_source?: { card?: { last_digits?: string; brand?: string } }
  }
}

/**
 * Verify a webhook event came from PayPal using their verify-signature API.
 * Requires PAYPAL_WEBHOOK_ID (the webhook's id from the PayPal dashboard).
 * `headers` are the incoming request headers; `rawBody` is the exact bytes.
 */
export async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false
  const token = await accessToken()
  const res = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}
