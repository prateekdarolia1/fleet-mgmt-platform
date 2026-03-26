-- ============================================================================
-- Migration: Add Battery Columns to Vehicles Table
-- Change: fix-retroactive-payments (blocking issue)
-- Date: 2026-03-26
-- Description: Add battery_id and battery_smart_id columns to vehicles table
--              to enable bidirectional battery-vehicle mapping
-- ============================================================================

-- Add battery_id column (references batteries table)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS battery_id UUID NULL REFERENCES batteries(id) ON DELETE SET NULL;

-- Add battery_smart_id column (external identifier from Battery Smart)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS battery_smart_id TEXT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_battery_id ON vehicles(battery_id)
  WHERE battery_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN vehicles.battery_id IS 'Battery currently assigned to this vehicle (CBU requirement)';
COMMENT ON COLUMN vehicles.battery_smart_id IS 'External Battery Smart identifier (e.g., D146301)';

-- ============================================================================
-- Sync existing data from batteries table to vehicles table
-- This fixes the one-directional mapping where batteries.vehicle_id was set
-- but vehicles.battery_id was NULL
-- ============================================================================

UPDATE vehicles
SET
  battery_id = b.id,
  battery_smart_id = b.battery_smart_id
FROM batteries b
WHERE b.vehicle_id = vehicles.id
  AND vehicles.battery_id IS NULL;

-- ============================================================================
-- Verification query (run after migration)
-- ============================================================================
-- SELECT COUNT(*) as vehicles_with_battery FROM vehicles WHERE battery_id IS NOT NULL;
-- SELECT COUNT(*) as batteries_with_vehicle FROM batteries WHERE vehicle_id IS NOT NULL;
-- SELECT v.vehicle_number, v.battery_id, v.battery_smart_id FROM vehicles WHERE battery_id IS NOT NULL LIMIT 10;
