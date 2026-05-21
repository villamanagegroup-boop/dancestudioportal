export type CheckoutLineItem = { label: string; amount: number; qty: number }

export function lineItemsTotal(items: CheckoutLineItem[] | null | undefined): number {
  if (!Array.isArray(items)) return 0
  const total = items.reduce(
    (sum, it) => sum + (Number(it?.amount) || 0) * (Number(it?.qty) || 1),
    0,
  )
  return Math.round(total * 100) / 100
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Build a URL-safe slug from a title plus a short random suffix for uniqueness. */
export function slugify(input: string): string {
  const base = (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const rand = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${rand}` : `pay-${rand}`
}
