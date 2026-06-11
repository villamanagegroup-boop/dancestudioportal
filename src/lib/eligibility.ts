// Eligibility helpers — does a dancer fall within a class/camp's age + gender
// parameters? Used to decide whether a parent's portal registration is an
// immediate enrollment or a pending "request" for staff to review, and to label
// out-of-range options in the portal lists.

export function ageOn(dob: string | null | undefined, on: Date = new Date()): number | null {
  if (!dob) return null
  const d = new Date(dob + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  let age = on.getFullYear() - d.getFullYear()
  const m = on.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) age--
  return age
}

export interface EligibilityParams {
  age_min?: number | null
  age_max?: number | null
  gender?: string | null // 'any' | 'all' | 'coed' | 'male' | 'female' | null
}

export interface DancerLike {
  date_of_birth?: string | null
  gender?: string | null
}

const OPEN_GENDERS = new Set(['', 'any', 'all', 'coed', 'mixed'])

/**
 * Does the dancer fit the params? Returns the verdict + human-readable reasons
 * for any mismatch. Unknown dancer data (e.g. no DOB) never fails a check — we
 * don't gate on what we can't prove.
 */
export function checkEligibility(
  dancer: DancerLike,
  params: EligibilityParams,
): { fits: boolean; reasons: string[] } {
  const reasons: string[] = []

  const age = ageOn(dancer.date_of_birth)
  if (age != null) {
    if (params.age_min != null && age < params.age_min) reasons.push(`under the minimum age (${params.age_min})`)
    if (params.age_max != null && age > params.age_max) reasons.push(`over the maximum age (${params.age_max})`)
  }

  const g = (params.gender ?? '').toLowerCase()
  if (!OPEN_GENDERS.has(g)) {
    const dg = (dancer.gender ?? '').toLowerCase()
    if (dg && dg !== g) reasons.push(`outside the ${params.gender} group`)
  }

  return { fits: reasons.length === 0, reasons }
}
