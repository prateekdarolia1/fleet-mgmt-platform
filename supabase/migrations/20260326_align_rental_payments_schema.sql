-- ============================================================================
-- Migration: Align rental_payments schema with payments
-- Change: fix-retroactive-payments (Task 1.4)
-- Date: 2026-03-26
-- Description: Add missing columns to rental_payments for sync compatibility
-- ============================================================================

-- Add payment_id column for sync (P### format)
ALTER TABLE rental_payments
  ADD COLUMN IF NOT EXISTS payment_id TEXT NULL;

-- Update any existing rows to generate payment_id from existing data
-- This sets payment_id for existing records that don't have one
DO $$
DECLARE
  payment_record RECORD;
  next_number INTEGER := 1;
BEGIN
  -- Get the max payment_id number from payments table
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_id FROM 2) AS INTEGER)), 0)
  INTO next_number
  FROM payments
  WHERE payment_id ~ '^P[0-9]+$';

  -- Generate payment_id for rental_payments that don't have one
  FOR payment_record IN
    SELECT id FROM rental_payments WHERE payment_id IS NULL ORDER BY created_at
  LOOP
    next_number := next_number + 1;
    UPDATE rental_payments
    SET payment_id = 'P' || LPAD(next_number::TEXT, 3, '0')
    WHERE id = payment_record.id;
  END LOOP;
END $$;

-- Now make the column NOT NULL and UNIQUE
ALTER TABLE rental_payments
  ALTER COLUMN payment_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_payments_payment_id ON rental_payments(payment_id);

-- Add cancellation tracking columns
ALTER TABLE rental_payments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT NULL;

-- Add indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_rental_payments_cancelled_at ON rental_payments(cancelled_at);

-- Add comments
COMMENT ON COLUMN rental_payments.payment_id IS 'Unique payment identifier in P### format (synced from payments.payment_id)';
COMMENT ON COLUMN rental_payments.cancelled_at IS 'Timestamp when payment was cancelled (soft delete)';
COMMENT ON COLUMN rental_payments.cancelled_by IS 'Identifier of user who cancelled the payment';
