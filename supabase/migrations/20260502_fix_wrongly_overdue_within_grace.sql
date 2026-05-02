-- ============================================================================
-- Migration: Fix rows wrongly marked 'overdue' inside the 3-day grace window
-- Date:      2026-05-02
--
-- Context: confirm_rental_start and reactivateLedger insert rows with status
--          set by `due_date < CURRENT_DATE` (0-day grace). The cron uses a
--          3-day grace. Net effect: rows whose due_date is within the last
--          3 days were prematurely flagged 'overdue' at insertion time and
--          never un-flagged. This restores them.
--
--          Insert-time logic must also be patched (separate migration) so
--          this doesn't keep happening.
--
-- Idempotent: only touches rows currently 'overdue' AND due_date inside the
-- grace window. Safe to re-run.
-- ============================================================================

DO $$
DECLARE
  v_rp_count INTEGER;
  v_p_count  INTEGER;
BEGIN
  -- rental_payments: revert to 'partial' if some amount paid, else 'pending'
  UPDATE rental_payments
  SET status     = CASE WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial' ELSE 'pending' END,
      updated_at = NOW()
  WHERE status   = 'overdue'
    AND due_date >= CURRENT_DATE - INTERVAL '3 days';

  GET DIAGNOSTICS v_rp_count = ROW_COUNT;

  -- payments: rental rows only, never touch security_deposit
  UPDATE payments
  SET status     = 'pending',
      updated_at = NOW()
  WHERE status       = 'overdue'
    AND payment_type = 'rental'
    AND due_date     >= CURRENT_DATE - INTERVAL '3 days';

  GET DIAGNOSTICS v_p_count = ROW_COUNT;

  RAISE NOTICE 'Reverted % rental_payments + % payments rows from overdue → pending/partial',
    v_rp_count, v_p_count;
END
$$;
