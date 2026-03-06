-- Migration: Create rental_payments table
-- Description: Track weekly rental payments for rental ledgers
-- Part of: auto-create-rental-ledger change

-- Create rental_payments table
CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES rental_ledgers(id) ON DELETE CASCADE,

  -- Week Info
  week_number INTEGER NOT NULL,
  due_date DATE NOT NULL,

  -- Amount
  amount_due DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2) GENERATED ALWAYS AS
    (amount_due - COALESCE(paid_amount, 0)) STORED,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),

  -- Payment Details
  payment_date DATE,
  payment_mode TEXT
    CHECK (payment_mode IN ('cash', 'upi', 'bank-transfer', 'card', 'other')),
  upi_last4 CHAR(4),
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  external_ref TEXT,

  -- Reminder Tracking
  last_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: one payment entry per week per ledger
  UNIQUE(ledger_id, week_number)
);

-- Create indexes
CREATE INDEX idx_rental_payments_ledger_id ON rental_payments(ledger_id);
CREATE INDEX idx_rental_payments_due_date ON rental_payments(due_date);
CREATE INDEX idx_rental_payments_status ON rental_payments(status);
CREATE INDEX idx_rental_payments_received_by ON rental_payments(received_by);

-- Index for finding overdue payments
CREATE INDEX idx_rental_payments_overdue ON rental_payments(due_date, status)
  WHERE status IN ('pending', 'partial');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rental_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rental_payments_updated_at
  BEFORE UPDATE ON rental_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_payments_updated_at();

-- Enable RLS
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view rental payments"
  ON rental_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rental payments"
  ON rental_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rental payments"
  ON rental_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rental payments"
  ON rental_payments FOR DELETE
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE rental_payments IS 'Weekly rental payment entries for rental ledgers';
COMMENT ON COLUMN rental_payments.week_number IS 'Sequential week number (1, 2, 3, ...) from rental start';
COMMENT ON COLUMN rental_payments.due_date IS 'Date payment is due (calculated from rental_start_date + week_number * 7 days)';
COMMENT ON COLUMN rental_payments.balance IS 'Generated column: amount_due - paid_amount';
COMMENT ON COLUMN rental_payments.upi_last4 IS 'Last 4 characters of UPI ID for verification (alphanumeric)';
COMMENT ON COLUMN rental_payments.status IS 'Payment status: pending, partial, paid, overdue, waived';
