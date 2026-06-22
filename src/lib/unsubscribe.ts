// Unsubscribe link signing.
// ------------------------------------------------------------------
// Bulk emails carry an unsubscribe link of the form
//   ${NEXT_PUBLIC_APP_URL}/api/unsubscribe?e=<email>&t=<token>
// where token = HMAC-SHA256(UNSUBSCRIBE_SECRET, lowercased+trimmed email),
// hex-encoded. This is stateless: it works for any address (including the
// 500+ contacts that have no portal account) without a DB lookup, and cannot
// be forged without the secret. The Node senders use the identical algorithm
// in scripts/lib/unsub.mjs, so the secret MUST match in both environments
// (.env.local locally and the Vercel env in production).
import { createHmac, timingSafeEqual } from 'crypto'

export function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase()
}

export function unsubscribeToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set')
  return createHmac('sha256', secret).update(normalizeEmail(email)).digest('hex')
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  let expected: string
  try {
    expected = unsubscribeToken(email)
  } catch {
    return false
  }
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(token, 'hex')
  if (a.length !== b.length || a.length === 0) return false
  return timingSafeEqual(a, b)
}

export function unsubscribeUrl(email: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '')
    .replace(/\/+$/, '')
    .replace(/^http:/, 'https:')
  const q = `e=${encodeURIComponent(normalizeEmail(email))}&t=${unsubscribeToken(email)}`
  return `${base}/api/unsubscribe?${q}`
}
