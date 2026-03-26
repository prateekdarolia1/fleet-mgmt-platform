-- ============================================================================
-- Migration: Sync Repair Functions
-- Change: fix-retroactive-payments (Task 2.11-2.12)
-- Date: 2026-03-26
-- Description: RPC functions to manually repair sync between tables
-- ============================================================================

-- ============================================================================
-- PART 1: manual_sync_rider_ledger() repair function (Task 2.11)
-- ============================================================================

CREATE OR REPLACE FUNCTION manual_sync_rider_ledger(p_ledger_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_rider_ledger rider_ledgers%ROWTYPE;
  v_target_status TEXT;
  v_result JSONB;
BEGIN
  -- Fetch the rider_ledger record
  SELECT * INTO v_rider_ledger
  FROM rider_ledgers
  WHERE id = p_ledger_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ledger not found',
      'ledger_id', p_ledger_id
    );
  END IF;

  -- Map status values
  v_target_status := CASE v_rider_ledger.status
    WHEN 'active' THEN 'active'
    WHEN 'paused' THEN 'suspended'
    WHEN 'closed' THEN 'closed'
    ELSE 'active'
  END;

  -- Insert or update rental_ledgers
  INSERT INTO rental_ledgers (
    id, rider_id, rider_name, vehicle_id, vehicle_number,
    rental_start_date, rental_amount, security_deposit,
    status, security_deposit_status,
    paused_at, paused_reason, reactivated_at,
    deposit_refunded_at, deposit_refunded_amount,
    notes, created_at, updated_at, created_by
  ) VALUES (
    v_rider_ledger.id, v_rider_ledger.rider_id, v_rider_ledger.rider_name,
    v_rider_ledger.vehicle_id, v_rider_ledger.vehicle_number,
    v_rider_ledger.rental_start_date, v_rider_ledger.rental_amount,
    v_rider_ledger.security_deposit,
    v_target_status, v_rider_ledger.security_deposit_status::TEXT,
    v_rider_ledger.paused_at, v_rider_ledger.paused_reason,
    v_rider_ledger.reactivated_at,
    v_rider_ledger.deposit_refunded_at, v_rider_ledger.deposit_refunded_amount,
    v_rider_ledger.notes, v_rider_ledger.created_at, v_rider_ledger.updated_at,
    v_rider_ledger.created_by
  )
  ON CONFLICT (id) DO UPDATE SET
    rider_id = EXCLUDED.rider_id,
    rider_name = EXCLUDED.rider_name,
    vehicle_id = EXCLUDED.vehicle_id,
    vehicle_number = EXCLUDED.vehicle_number,
    rental_start_date = EXCLUDED.rental_start_date,
    rental_amount = EXCLUDED.rental_amount,
    security_deposit = EXCLUDED.security_deposit,
    status = EXCLUDED.status,
    security_deposit_status = EXCLUDED.security_deposit_status,
    paused_at = EXCLUDED.paused_at,
    paused_reason = EXCLUDED.paused_reason,
    reactivated_at = EXCLUDED.reactivated_at,
    deposit_refunded_at = EXCLUDED.deposit_refunded_at,
    deposit_refunded_amount = EXCLUDED.deposit_refunded_amount,
    notes = EXCLUDED.notes,
    updated_at = EXCLUDED.updated_at;

  -- Return success result
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Ledger synced successfully',
    'ledger_id', p_ledger_id,
    'rider_id', v_rider_ledger.rider_id,
    'target_status', v_target_status
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'ledger_id', p_ledger_id,
      'sqlstate', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: sync_repair() function for bulk recovery (Task 2.12)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_repair(p_mode TEXT DEFAULT 'all')
RETURNS JSONB AS $$
DECLARE
  v_repaired_ledgers INTEGER := 0;
  v_repaired_payments INTEGER := 0;
  v_failed_ledgers INTEGER := 0;
  v_failed_payments INTEGER := 0;
  v_result JSONB;
  v_payment RECORD;
  v_target_status TEXT;
BEGIN
  -- Repair ledgers
  FOR v_result IN
    SELECT id FROM rider_ledgers
    WHERE
      (p_mode = 'all' OR p_mode = 'ledgers') AND
      id NOT IN (SELECT id FROM rental_ledgers WHERE rental_ledgers.id = rider_ledgers.id)
  LOOP
    BEGIN
      PERFORM manual_sync_rider_ledger(v_result->>'id');
      v_repaired_ledgers := v_repaired_ledgers + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_ledgers := v_failed_ledgers + 1;
    END;
  END LOOP;

  -- Repair payments
  FOR v_payment IN
    SELECT * FROM payments
    WHERE
      (p_mode = 'all' OR p_mode = 'payments') AND
      id NOT IN (SELECT id FROM rental_payments WHERE rental_payments.id = payments.id)
  LOOP
    BEGIN
      INSERT INTO rental_payments (
        id, payment_id, ledger_id, week_number, due_date,
        amount_due, paid_amount, status,
        payment_date, payment_mode, upi_last4, received_by, external_ref,
        last_reminder_at, reminder_count,
        cancelled_at, cancelled_by,
        notes, created_at, updated_at
      ) VALUES (
        v_payment.id, v_payment.payment_id, v_payment.ledger_id,
        v_payment.week_number, v_payment.due_date,
        v_payment.amount_due, v_payment.paid_amount, v_payment.status::TEXT,
        v_payment.payment_date, v_payment.payment_mode, v_payment.upi_last4,
        v_payment.received_by, v_payment.external_ref,
        v_payment.last_reminder_at, v_payment.reminder_count,
        v_payment.cancelled_at, v_payment.cancelled_by,
        v_payment.notes, v_payment.created_at, v_payment.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        payment_id = EXCLUDED.payment_id,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;

      v_repaired_payments := v_repaired_payments + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_payments := v_failed_payments + 1;
    END;
  END LOOP;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sync repair completed',
    'repaired_ledgers', v_repaired_ledgers,
    'repaired_payments', v_repaired_payments,
    'failed_ledgers', v_failed_ledgers,
    'failed_payments', v_failed_payments,
    'mode', p_mode
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: sync_health_check() function for monitoring (Task 7.1-7.2)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_health_check()
RETURNS JSONB AS $$
DECLARE
  v_rider_ledgers_count BIGINT;
  v_rental_ledgers_count BIGINT;
  v_payments_count BIGINT;
  v_rental_payments_count BIGINT;
  v_sync_errors_count BIGINT;
  v_health_status TEXT;
BEGIN
  -- Count rows in each table
  SELECT COUNT(*) INTO v_rider_ledgers_count FROM rider_ledgers;
  SELECT COUNT(*) INTO v_rental_ledgers_count FROM rental_ledgers;
  SELECT COUNT(*) INTO v_payments_count FROM payments;
  SELECT COUNT(*) INTO v_rental_payments_count FROM rental_payments;
  SELECT COUNT(*) INTO v_sync_errors_count FROM sync_errors;

  -- Determine health status
  v_health_status := CASE
    WHEN v_rider_ledgers_count != v_rental_ledgers_count THEN 'degraded'
    WHEN v_payments_count != v_rental_payments_count THEN 'degraded'
    WHEN v_sync_errors_count > 0 THEN 'warning'
    ELSE 'healthy'
  END;

  -- Return health check result
  RETURN jsonb_build_object(
    'status', v_health_status,
    'timestamp', NOW(),
    'metrics', jsonb_build_object(
      'rider_ledgers_count', v_rider_ledgers_count,
      'rental_ledgers_count', v_rental_ledgers_count,
      'ledgers_diff', ABS(v_rider_ledgers_count - v_rental_ledgers_count),
      'payments_count', v_payments_count,
      'rental_payments_count', v_rental_payments_count,
      'payments_diff', ABS(v_payments_count - v_rental_payments_count),
      'sync_errors_count', v_sync_errors_count
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Grant execute permissions (for RPC calls)
-- ============================================================================

GRANT EXECUTE ON FUNCTION manual_sync_rider_ledger(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_repair(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_health_check() TO authenticated;

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION manual_sync_rider_ledger(UUID) IS 'Manually sync a single rider_ledger to rental_ledgers';
COMMENT ON FUNCTION sync_repair(TEXT) IS 'Bulk repair sync gaps. Modes: all, ledgers, payments';
COMMENT ON FUNCTION sync_health_check() IS 'Check sync health between rider and rental tables';

-- ============================================================================
-- PART 6: Verification Queries (for testing)
-- ============================================================================

-- After running this migration, verify with:
--
-- -- Test manual sync
-- SELECT manual_sync_rider_ledger('<ledger-id>');
--
-- -- Test bulk repair
-- SELECT sync_repair('all');
--
-- -- Check sync health
-- SELECT sync_health_check();
