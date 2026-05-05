/**
 * Helpers for rendering paid-payment metadata (UPI tail, paid-on date).
 *
 * Background: the `payments` table only got the `upi_last4` column on 2026-04-23
 * and a sync-bug means even some newer rows are missing it (the value lives in
 * `rental_payments` for the same payment_id). Rather than backfill, hooks fetch
 * both tables and these helpers handle the display fallback + placeholder filter.
 */

const UPI_PLACEHOLDERS = new Set(['0000', 'TEST', 'AAAA', 'XXXX', '1234']);

/**
 * Returns the UPI last-4 to display, or null if it's empty / a known placeholder.
 * Admins entered "0000" / "TEST" when real digits were unknown — show "—" instead.
 */
export const cleanUpiLast4 = (raw?: string | null): string | null => {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v.length !== 4) return null;
  if (UPI_PLACEHOLDERS.has(v)) return null;
  return v;
};

/**
 * The "paid on" date for a payment row. Prefers `collected_at` (timestamptz),
 * falls back to `payment_date` (date) since `collected_at` was added later and
 * older rows only have `payment_date`. All paid rows have at least one of these.
 */
export const paidOnDate = (
  collectedAt?: string | null,
  paymentDate?: string | null,
): string | null => collectedAt ?? paymentDate ?? null;
