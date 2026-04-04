-- ============================================================================
-- Migration: Fix cron registration + overdue/weekly payment logic
-- Date: 2026-04-03
--
-- Fixes:
-- 1. Cron jobs were never registered — previous migration had invalid
--    "COMMENT ON JOB" syntax which rolled back the entire transaction.
--    This migration re-registers both jobs correctly.
--
-- 2. generate_weekly_payments deadlock — the function required a
--    pending/partial payment within 6 days to fire. Once all payments
--    flip to overdue (via mark_overdue_payments), this condition is never
--    met and no new payments are ever generated. Fixed by only checking
--    whether a future payment row EXISTS, not its status.
--
-- 3. mark_overdue_payments only updated rental_payments (shadow copy).
--    The source-of-truth payments table was never touched, so the main
--    Payment Tracking tab never auto-updated statuses. Now updates both.
--    Grace period aligned to 3 days (matching frontend logic).
-- ============================================================================

-- ============================================================================
-- PART 1: Fix generate_weekly_payments (deadlock removed)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_weekly_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger           RECORD;
  v_next_week_num    INTEGER;
  v_next_due_date    DATE;
  v_payment_id       TEXT;
  v_next_num         INTEGER;
  v_payments_created INTEGER := 0;
BEGIN
  FOR v_ledger IN
    SELECT
      rl.id            AS ledger_id,
      rl.rental_amount
    FROM rental_ledgers rl
    WHERE rl.status = 'active'
      AND rl.rental_start_date IS NOT NULL
      -- Only generate when the most recent payment is due within 6 days
      -- (regardless of status — overdue payments still need a next entry)
      AND EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.due_date <= CURRENT_DATE + INTERVAL '6 days'
      )
      -- And no payment already exists beyond the 6-day window
      AND NOT EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.due_date > CURRENT_DATE + INTERVAL '6 days'
      )
  LOOP
    SELECT COALESCE(MAX(week_number), 0) + 1
    INTO v_next_week_num
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    SELECT COALESCE(MAX(due_date), CURRENT_DATE) + INTERVAL '7 days'
    INTO v_next_due_date
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    v_next_num   := get_next_payment_number();
    v_payment_id := 'P' || LPAD(v_next_num::TEXT, 3, '0');

    INSERT INTO rental_payments (
      ledger_id, week_number, due_date, amount_due, status, payment_id
    ) VALUES (
      v_ledger.ledger_id, v_next_week_num, v_next_due_date,
      v_ledger.rental_amount, 'pending', v_payment_id
    );

    v_payments_created := v_payments_created + 1;

    RAISE LOG 'Created payment % for ledger %, week %, due %',
      v_payment_id, v_ledger.ledger_id, v_next_week_num, v_next_due_date;
  END LOOP;

  RETURN v_payments_created;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO service_role;

-- ============================================================================
-- PART 2: Fix mark_overdue_payments
--   - Now updates BOTH rental_payments AND payments tables
--   - Grace period: 3 days (payment becomes overdue after due_date + 3 days)
--   - Previously only touched rental_payments and used implicit 0-day grace
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payments_marked INTEGER := 0;
  v_threshold       DATE;
BEGIN
  -- 3-day grace period: a payment is overdue only after 3 days past due_date
  v_threshold := CURRENT_DATE - INTERVAL '3 days';

  -- Update rental_payments (shadow copy / RPC layer)
  UPDATE rental_payments
  SET
    status     = 'overdue',
    updated_at = NOW()
  WHERE status IN ('pending', 'partial')
    AND due_date < v_threshold;

  GET DIAGNOSTICS v_payments_marked = ROW_COUNT;

  -- Update payments (source of truth / UI layer)
  -- Only rental-type payments — never touch security_deposit payments
  UPDATE payments
  SET
    status     = 'overdue',
    updated_at = NOW()
  WHERE status IN ('pending', 'partial')
    AND payment_type = 'rental'
    AND due_date < v_threshold;

  -- Log total updated across both tables
  RAISE LOG 'mark_overdue_payments: marked % rental_payments + % payments as overdue',
    v_payments_marked,
    (SELECT COUNT(*) FROM payments WHERE status = 'overdue' AND due_date >= v_threshold - INTERVAL '1 day');

  RETURN v_payments_marked;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO service_role;

-- ============================================================================
-- PART 3: Register cron jobs correctly
--   Previous migration used "COMMENT ON JOB" which is invalid PostgreSQL
--   syntax and caused the entire migration to roll back. Jobs were never
--   registered. Re-register them here without the invalid COMMENT statements.
-- ============================================================================

-- Remove old jobs if they somehow partially exist
SELECT cron.unschedule('generate-weekly-rental-payments')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-weekly-rental-payments'
);

SELECT cron.unschedule('mark-rental-payments-overdue')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'mark-rental-payments-overdue'
);

-- Job 1: Generate next week's payment entry for active ledgers
-- Runs daily at 00:00 UTC (05:30 IST)
SELECT cron.schedule(
  'generate-weekly-rental-payments',
  '0 0 * * *',
  $$ SELECT generate_weekly_payments(); $$
);

-- Job 2: Mark pending payments as overdue after 3-day grace period
-- Runs daily at 01:00 UTC (06:30 IST) — after job 1 completes
SELECT cron.schedule(
  'mark-rental-payments-overdue',
  '0 1 * * *',
  $$ SELECT mark_overdue_payments(); $$
);
