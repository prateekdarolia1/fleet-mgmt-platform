-- ============================================================================
-- Migration: Align rental_ledgers schema with rider_ledgers
-- Change: fix-retroactive-payments (Task 1.3)
-- Date: 2026-03-26
-- Description: Add missing columns to rental_ledgers for sync compatibility
-- ============================================================================

-- Add pause tracking columns
ALTER TABLE rental_ledgers
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS paused_reason TEXT NULL;

-- Add reactivation tracking
ALTER TABLE rental_ledgers
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ NULL;

-- Add deposit refund tracking
ALTER TABLE rental_ledgers
  ADD COLUMN IF NOT EXISTS deposit_refunded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deposit_refunded_amount NUMERIC(10,2) NULL;

-- Add indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_paused_at ON rental_ledgers(paused_at);
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_reactivated_at ON rental_ledgers(reactivated_at);

-- Add comments
COMMENT ON COLUMN rental_ledgers.paused_at IS 'Timestamp when ledger was paused';
COMMENT ON COLUMN rental_ledgers.paused_reason IS 'User-provided reason for pausing the ledger';
COMMENT ON COLUMN rental_ledgers.reactivated_at IS 'Timestamp when ledger was reactivated from paused state';
COMMENT ON COLUMN rental_ledgers.deposit_refunded_at IS 'Timestamp when deposit was marked as refunded';
COMMENT ON COLUMN rental_ledgers.deposit_refunded_amount IS 'Amount of deposit that was refunded (for partial refunds)';
