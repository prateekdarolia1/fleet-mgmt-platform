/**
 * Canonical payment classification rules.
 *
 * "Upcoming" = due_date in [today − 3 days, today + 7 days]
 * "Overdue"  = due_date < today − 3 days  (matches mark_overdue_payments cron)
 *
 * UTC throughout — Postgres CURRENT_DATE is UTC. Computing from local
 * midnight then toISOString() leaks the local TZ offset and produces
 * off-by-one boundaries during late-night IST hours.
 */

export const PAYMENT_GRACE_DAYS = 3
export const PAYMENT_WINDOW_DAYS = 7

const DAY_MS = 86400000

const utcDateStr = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

export interface PaymentBoundaries {
  /** YYYY-MM-DD (UTC) — Postgres CURRENT_DATE equivalent */
  today: string
  /** YYYY-MM-DD (UTC) — today − GRACE; rows with due_date < this are overdue */
  graceThreshold: string
  /** YYYY-MM-DD (UTC) — today + WINDOW; rows with due_date <= this are upcoming */
  windowEnd: string
}

export function paymentBoundaries(now: Date = new Date()): PaymentBoundaries {
  return {
    today: utcDateStr(now),
    graceThreshold: utcDateStr(new Date(now.getTime() - PAYMENT_GRACE_DAYS * DAY_MS)),
    windowEnd: utcDateStr(new Date(now.getTime() + PAYMENT_WINDOW_DAYS * DAY_MS)),
  }
}

/** Supabase filter range for "upcoming" rows: due_date in [graceThreshold, windowEnd]. */
export function upcomingDueDateRange(now: Date = new Date()): { gte: string; lte: string } {
  const { graceThreshold, windowEnd } = paymentBoundaries(now)
  return { gte: graceThreshold, lte: windowEnd }
}

/** Supabase filter for "overdue" rows: due_date < graceThreshold. */
export function overdueDueDateFilter(now: Date = new Date()): { lt: string } {
  const { graceThreshold } = paymentBoundaries(now)
  return { lt: graceThreshold }
}

export type EffectiveStatus =
  | 'paid'
  | 'partial'
  | 'upcoming'
  | 'overdue'
  | 'future'
  | 'cancelled'
  | 'waived'

/**
 * Classify a row using the canonical rules. Trust this over a row's raw `status`
 * column when displaying to users — the cron may not have flipped the row yet.
 */
export function effectiveStatus(
  row: { status: string; due_date: string; cancelled_at?: string | null },
  now: Date = new Date()
): EffectiveStatus {
  if (row.cancelled_at) return 'cancelled'
  if (row.status === 'paid') return 'paid'
  if (row.status === 'waived') return 'waived'

  const { graceThreshold, windowEnd } = paymentBoundaries(now)

  if (['pending', 'partial', 'overdue'].includes(row.status)) {
    if (row.due_date < graceThreshold) return 'overdue'
    if (row.due_date <= windowEnd) return 'upcoming'
    return 'future'
  }

  return row.status as EffectiveStatus
}
