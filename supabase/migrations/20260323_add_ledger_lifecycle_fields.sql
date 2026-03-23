-- ============================================================================
-- Migration: Add Ledger Lifecycle Management Fields
-- Change: ledger-lifecycle-management
-- Date: 2024-03-23
-- Description: Adds pause/reactivate capabilities to rental ledgers
-- ============================================================================

-- ============================================================================
-- PART 1: Ledger Status and Pause Tracking
-- ============================================================================

-- Create ledger_status enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_status') THEN
    CREATE TYPE ledger_status AS ENUM ('active', 'paused', 'closed');
  END IF;
END $$;

-- Add status column to rider_ledgers
ALTER TABLE rider_ledgers
  ADD COLUMN IF NOT EXISTS status ledger_status DEFAULT 'active';

-- Add pause tracking columns
ALTER TABLE rider_ledgers
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS paused_reason TEXT NULL;

-- Add reactivation tracking
ALTER TABLE rider_ledgers
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMP NULL;

-- ============================================================================
-- PART 2: Security Deposit Refund Tracking
-- ============================================================================

-- Create security_deposit_status enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_deposit_status') THEN
    CREATE TYPE security_deposit_status AS ENUM ('retained', 'refunded', 'partially_refunded');
  END IF;
END $$;

-- Add deposit tracking columns
ALTER TABLE rider_ledgers
  ADD COLUMN IF NOT EXISTS security_deposit_status security_deposit_status DEFAULT 'retained',
  ADD COLUMN IF NOT EXISTS deposit_refunded_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS deposit_refunded_amount NUMERIC NULL;

-- ============================================================================
-- PART 3: Payment Cancellation
-- ============================================================================

-- Add cancelled value to payment_status enum
-- Note: PostgreSQL doesn't support ADD VALUE IF NOT EXISTS, so we check first
DO $$
BEGIN
  -- Check if 'cancelled' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'cancelled'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'cancelled';
  END IF;
END $$;

-- Add cancellation tracking columns to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT NULL;

-- ============================================================================
-- PART 4: Indexes for Performance
-- ============================================================================

-- Index on ledger status for cron job filtering
CREATE INDEX IF NOT EXISTS idx_ledgers_status ON rider_ledgers(status);

-- Index on payment status for queries
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index on ledger_id + status for payment queries
CREATE INDEX IF NOT EXISTS idx_payments_ledger_status ON payments(ledger_id, status);

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN rider_ledgers.status IS 'Ledger lifecycle status: active (generating payments), paused (temporarily stopped), closed (permanently ended)';
COMMENT ON COLUMN rider_ledgers.paused_at IS 'Timestamp when ledger was paused';
COMMENT ON COLUMN rider_ledgers.paused_reason IS 'User-provided reason for pausing the ledger';
COMMENT ON COLUMN rider_ledgers.reactivated_at IS 'Timestamp when ledger was reactivated from paused state';
COMMENT ON COLUMN rider_ledgers.security_deposit_status IS 'Track if deposit was refunded during pause: retained, refunded, or partially_refunded';
COMMENT ON COLUMN rider_ledgers.deposit_refunded_at IS 'Timestamp when deposit was marked as refunded';
COMMENT ON COLUMN rider_ledgers.deposit_refunded_amount IS 'Amount of deposit that was refunded (for partial refunds)';
COMMENT ON COLUMN payments.cancelled_at IS 'Timestamp when payment was cancelled (soft delete)';
COMMENT ON COLUMN payments.cancelled_by IS 'Identifier of user who cancelled the payment';

-- ============================================================================
-- PART 6: Verification Queries (for testing)
-- ============================================================================

-- After running this migration, verify with:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_status');
-- Expected: active, paused, closed

-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'security_deposit_status');
-- Expected: retained, refunded, partially_refunded

-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status');
-- Expected: should include 'cancelled'

-- SELECT column_name FROM information_schema.columns WHERE table_name = 'rider_ledgers' AND column_name IN ('status', 'paused_at', 'paused_reason', 'reactivated_at', 'security_deposit_status', 'deposit_refunded_at', 'deposit_refunded_amount');
-- Expected: 7 rows
