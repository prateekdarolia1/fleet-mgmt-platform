-- Migration: Create rental_ledgers table
-- Description: Track rental agreements for riders with vehicles
-- Part of: auto-create-rental-ledger change

-- Create rental_ledgers table
CREATE TABLE IF NOT EXISTS rental_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id TEXT NOT NULL,
  rider_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_number TEXT,

  -- Rental Configuration
  rental_start_date DATE,
  rental_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(10,2),
  security_deposit_status TEXT DEFAULT 'pending'
    CHECK (security_deposit_status IN ('pending', 'collected', 'refunded')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_start'
    CHECK (status IN ('pending_start', 'active', 'suspended', 'closed', 'cancelled')),

  -- Assignment
  responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_rental_ledgers_rider_id ON rental_ledgers(rider_id);
CREATE INDEX idx_rental_ledgers_vehicle_id ON rental_ledgers(vehicle_id);
CREATE INDEX idx_rental_ledgers_status ON rental_ledgers(status);
CREATE INDEX idx_rental_ledgers_responsible_user ON rental_ledgers(responsible_user_id);

-- Partial unique index: Only one active ledger per rider
-- Active statuses are: pending_start, active, suspended
CREATE UNIQUE INDEX idx_rental_ledgers_one_active_per_rider
  ON rental_ledgers(rider_id)
  WHERE status IN ('pending_start', 'active', 'suspended');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rental_ledgers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rental_ledgers_updated_at
  BEFORE UPDATE ON rental_ledgers
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_ledgers_updated_at();

-- Enable RLS
ALTER TABLE rental_ledgers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow all authenticated users to read (adjust as needed for your security model)
CREATE POLICY "Authenticated users can view rental ledgers"
  ON rental_ledgers FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert rental ledgers"
  ON rental_ledgers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update rental ledgers"
  ON rental_ledgers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete (for admin use)
CREATE POLICY "Authenticated users can delete rental ledgers"
  ON rental_ledgers FOR DELETE
  TO authenticated
  USING (true);

-- Comment on table
COMMENT ON TABLE rental_ledgers IS 'Tracks rental agreements between fleet operator and riders for vehicles';
COMMENT ON COLUMN rental_ledgers.rider_id IS 'FK reference to riders.rider_id (text)';
COMMENT ON COLUMN rental_ledgers.vehicle_id IS 'FK reference to vehicles.id (uuid), nullable if vehicle unassigned';
COMMENT ON COLUMN rental_ledgers.status IS 'Current status: pending_start, active, suspended, closed, cancelled';
COMMENT ON COLUMN rental_ledgers.security_deposit_status IS 'Status of security deposit: pending, collected, refunded';
COMMENT ON COLUMN rental_ledgers.responsible_user_id IS 'User responsible for following up on payments';
