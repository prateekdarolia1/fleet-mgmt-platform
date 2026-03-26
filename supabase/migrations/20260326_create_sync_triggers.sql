-- ============================================================================
-- Migration: Database Sync Triggers for Dual-Table Synchronization
-- Change: fix-retroactive-payments (Task 2.1-2.7)
-- Date: 2026-03-26
-- Description: Create triggers to sync rider_ledgers/payments → rental_ledgers/rental_payments
-- ============================================================================

-- ============================================================================
-- PART 1: Create sync_errors table for trigger failure logging (Task 2.1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_table TEXT NOT NULL,
  operation TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_errors_source ON sync_errors(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_sync_errors_created_at ON sync_errors(created_at);

COMMENT ON TABLE sync_errors IS 'Log of sync trigger failures for monitoring and repair';

-- ============================================================================
-- PART 2: Create sync_rider_ledger_to_rental() function (Task 2.2)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_rider_ledger_to_rental()
RETURNS TRIGGER AS $$
DECLARE
  target_status TEXT;
BEGIN
  -- Map status values between the two schemas
  -- rider_ledgers: active, paused, closed
  -- rental_ledgers: pending_start, active, suspended, closed, cancelled
  target_status := CASE NEW.status
    WHEN 'active' THEN 'active'
    WHEN 'paused' THEN 'suspended'
    WHEN 'closed' THEN 'closed'
    ELSE 'active'  -- fallback
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
    NEW.id, NEW.rider_id, NEW.rider_name, NEW.vehicle_id, NEW.vehicle_number,
    NEW.rental_start_date, NEW.rental_amount, NEW.security_deposit,
    target_status, NEW.security_deposit_status::TEXT,
    NEW.paused_at, NEW.paused_reason, NEW.reactivated_at,
    NEW.deposit_refunded_at, NEW.deposit_refunded_amount,
    NEW.notes, NEW.created_at, NEW.updated_at, NEW.created_by
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

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log sync error
    INSERT INTO sync_errors (source_table, source_id, target_table, operation, error_message, error_details)
    VALUES ('rider_ledgers', NEW.id, 'rental_ledgers', TG_OP, SQLERRM, jsonb_build_object(
      'new_data', row_to_json(NEW),
      'operation', TG_OP
    ));
    -- Don't fail the source operation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 3: Create sync_payment_to_rental() function (Task 2.3)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_payment_to_rental()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update rental_payments
  INSERT INTO rental_payments (
    id, payment_id, ledger_id, week_number, due_date,
    amount_due, paid_amount, status,
    payment_date, payment_mode, upi_last4, received_by, external_ref,
    last_reminder_at, reminder_count,
    cancelled_at, cancelled_by,
    notes, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.payment_id, NEW.ledger_id, NEW.week_number, NEW.due_date,
    NEW.amount_due, NEW.paid_amount, NEW.status::TEXT,
    NEW.payment_date, NEW.payment_mode, NEW.upi_last4, NEW.received_by, NEW.external_ref,
    NEW.last_reminder_at, NEW.reminder_count,
    NEW.cancelled_at, NEW.cancelled_by,
    NEW.notes, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    payment_id = EXCLUDED.payment_id,
    ledger_id = EXCLUDED.ledger_id,
    week_number = EXCLUDED.week_number,
    due_date = EXCLUDED.due_date,
    amount_due = EXCLUDED.amount_due,
    paid_amount = EXCLUDED.paid_amount,
    status = EXCLUDED.status,
    payment_date = EXCLUDED.payment_date,
    payment_mode = EXCLUDED.payment_mode,
    upi_last4 = EXCLUDED.upi_last4,
    received_by = EXCLUDED.received_by,
    external_ref = EXCLUDED.external_ref,
    last_reminder_at = EXCLUDED.last_reminder_at,
    reminder_count = EXCLUDED.reminder_count,
    cancelled_at = EXCLUDED.cancelled_at,
    cancelled_by = EXCLUDED.cancelled_by,
    notes = EXCLUDED.notes,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log sync error
    INSERT INTO sync_errors (source_table, source_id, target_table, operation, error_message, error_details)
    VALUES ('payments', NEW.id, 'rental_payments', TG_OP, SQLERRM, jsonb_build_object(
      'new_data', row_to_json(NEW),
      'operation', TG_OP
    ));
    -- Don't fail the source operation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Install INSERT trigger on rider_ledgers (Task 2.4)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_rider_to_rental_insert ON rider_ledgers;
CREATE TRIGGER trigger_sync_rider_to_rental_insert
  AFTER INSERT ON rider_ledgers
  FOR EACH ROW
  EXECUTE FUNCTION sync_rider_ledger_to_rental();

-- ============================================================================
-- PART 5: Install UPDATE trigger on rider_ledgers (Task 2.5)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_rider_to_rental_update ON rider_ledgers;
CREATE TRIGGER trigger_sync_rider_to_rental_update
  AFTER UPDATE ON rider_ledgers
  FOR EACH ROW
  EXECUTE FUNCTION sync_rider_ledger_to_rental();

-- ============================================================================
-- PART 6: Install INSERT trigger on payments (Task 2.6)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_payment_to_rental_insert ON payments;
CREATE TRIGGER trigger_sync_payment_to_rental_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_to_rental();

-- ============================================================================
-- PART 7: Install UPDATE trigger on payments (Task 2.7)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_payment_to_rental_update ON payments;
CREATE TRIGGER trigger_sync_payment_to_rental_update
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_payment_to_rental();

-- ============================================================================
-- PART 8: Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION sync_rider_ledger_to_rental() IS 'Sync rider_ledgers changes to rental_ledgers on INSERT/UPDATE';
COMMENT ON FUNCTION sync_payment_to_rental() IS 'Sync payments changes to rental_payments on INSERT/UPDATE';
COMMENT ON TRIGGER trigger_sync_rider_to_rental_insert ON rider_ledgers IS 'Trigger: sync new rider_ledgers to rental_ledgers';
COMMENT ON TRIGGER trigger_sync_rider_to_rental_update ON rider_ledgers IS 'Trigger: sync updated rider_ledgers to rental_ledgers';
COMMENT ON TRIGGER trigger_sync_payment_to_rental_insert ON payments IS 'Trigger: sync new payments to rental_payments';
COMMENT ON TRIGGER trigger_sync_payment_to_rental_update ON payments IS 'Trigger: sync updated payments to rental_payments';

-- ============================================================================
-- PART 9: Verification Queries (for testing - Tasks 2.8-2.10)
-- ============================================================================

-- After running this migration, verify with:
--
-- -- Check if triggers are installed
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%sync%';
--
-- -- Test sync with sample INSERT
-- INSERT INTO rider_ledgers (id, rider_id, rider_name, rental_amount, status)
-- VALUES (gen_random_uuid(), 'TEST001', 'Test Rider', 1000, 'active');
-- -- Check if it appears in rental_ledgers
-- SELECT * FROM rental_ledgers WHERE rider_id = 'TEST001';
--
-- -- Check for sync errors
-- SELECT * FROM sync_errors ORDER BY created_at DESC LIMIT 10;
