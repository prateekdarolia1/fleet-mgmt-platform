-- ============================================================================
-- Migration: Sync Alert Function
-- Change: fix-retroactive-payments (Task 7.3)
-- Date: 2026-03-26
-- Description: Create alert function for row count differences >1%
-- ============================================================================

-- Create or replace function to check sync health and alert if degraded
CREATE OR REPLACE FUNCTION check_sync_alert()
RETURNS JSONB AS $$
DECLARE
  v_rider_ledgers_count BIGINT;
  v_rental_ledgers_count BIGINT;
  v_payments_count BIGINT;
  v_rental_payments_count BIGINT;
  v_ledgers_diff_pct NUMERIC;
  v_payments_diff_pct NUMERIC;
  v_alert_level TEXT;
  v_result JSONB;
BEGIN
  -- Count rows in each table
  SELECT COUNT(*) INTO v_rider_ledgers_count FROM rider_ledgers;
  SELECT COUNT(*) INTO v_rental_ledgers_count FROM rental_ledgers;
  SELECT COUNT(*) INTO v_payments_count FROM payments;
  SELECT COUNT(*) INTO v_rental_payments_count FROM rental_payments;

  -- Calculate percentage differences (avoid division by zero)
  v_ledgers_diff_pct := CASE
    WHEN v_rider_ledgers_count = 0 AND v_rental_ledgers_count = 0 THEN 0
    WHEN v_rider_ledgers_count = 0 THEN 100
    WHEN v_rental_ledgers_count = 0 THEN 100
    ELSE ABS(v_rider_ledgers_count - v_rental_ledgers_count)::NUMERIC / NULLIF(v_rider_ledgers_count, 0) * 100
  END;

  v_payments_diff_pct := CASE
    WHEN v_payments_count = 0 AND v_rental_payments_count = 0 THEN 0
    WHEN v_payments_count = 0 THEN 100
    WHEN v_rental_payments_count = 0 THEN 100
    ELSE ABS(v_payments_count - v_rental_payments_count)::NUMERIC / NULLIF(v_payments_count, 0) * 100
  END;

  -- Determine alert level
  v_alert_level := CASE
    WHEN v_ledgers_diff_pct > 1 OR v_payments_diff_pct > 1 THEN 'critical'
    WHEN v_ledgers_diff_pct > 0.1 OR v_payments_diff_pct > 0.1 THEN 'warning'
    ELSE 'healthy'
  END;

  -- Return alert result
  v_result := jsonb_build_object(
    'alert_level', v_alert_level,
    'timestamp', NOW(),
    'metrics', jsonb_build_object(
      'rider_ledgers_count', v_rider_ledgers_count,
      'rental_ledgers_count', v_rental_ledgers_count,
      'ledgers_diff_pct', ROUND(v_ledgers_diff_pct, 2),
      'payments_count', v_payments_count,
      'rental_payments_count', v_rental_payments_count,
      'payments_diff_pct', ROUND(v_payments_diff_pct, 2)
    )
  );

  -- Log critical alerts to sync_errors for monitoring
  IF v_alert_level = 'critical' THEN
    INSERT INTO sync_errors (source_table, source_id, target_table, operation, error_message, error_details)
    VALUES (
      'sync_monitor',
      gen_random_uuid(),
      'all',
      'health_check',
      'Sync health check failed: row count difference >1%',
      v_result
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_sync_alert() TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_sync_alert() IS 'Check sync health and alert if row count differences exceed 1% threshold. Logs critical alerts to sync_errors table.';

-- ============================================================================
-- Cron job setup (optional - for automated monitoring)
-- ============================================================================
-- To enable automated monitoring every hour, uncomment and run:
--
-- SELECT cron.schedule(
--   'sync-health-check',
--   '0 * * * *', -- Every hour
--   $$SELECT check_sync_alert()$$
-- );
-- ============================================================================
