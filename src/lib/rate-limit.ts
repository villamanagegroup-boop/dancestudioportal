// Lightweight in-memory sliding-window rate limiter for public endpoints.
//
// Best-effort: the window state lives in the running server instance, so under
// serverless it limits per warm instance rather than globally. That's enough to
// blunt casual abuse/spam of public routes (contact form, self-signup). For hard
// guarantees across instances, back this with a shared store (e.g. Upstash Redis).

const buckets = new Map<string, number[]>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  const hits = (buckets.get(key) ?? []).filter(t => t > cutoff)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000))
    return { ok: false, retryAfter }
  }

  hits.push(now)
  buckets.set(key, hits)

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter(t => t > cutoff)
      if (fresh.length === 0) buckets.delete(k)
      else buckets.set(k, fresh)
    }
  }

  return { ok: true, retryAfter: 0 }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
