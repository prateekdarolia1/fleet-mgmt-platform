-- ============================================================================
-- BATTERIES TABLE - OPTIMIZED FOR CSV IMPORT
-- ============================================================================
-- This version removes strict length constraints to accept your CSV data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================================

-- Create enums (using DO block to handle "already exists" errors)
DO $$ BEGIN
  CREATE TYPE service_provider AS ENUM ('BATTERY_SMART', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE battery_location AS ENUM ('NOIDA', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE battery_plan AS ENUM ('D2D', 'B2B', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE battery_status AS ENUM ('ACTIVE', 'MAPPED', 'UNMAPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create batteries table
CREATE TABLE IF NOT EXISTS batteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id TEXT NOT NULL UNIQUE,
  service_provider service_provider NOT NULL,
  zone_id TEXT,
  retrofit_date DATE,
  location battery_location,
  usc_id TEXT,
  battery_plan battery_plan,
  battery_smart_id TEXT UNIQUE,
  status battery_status NOT NULL DEFAULT 'UNMAPPED',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_batteries_battery_id ON batteries(battery_id);
CREATE INDEX IF NOT EXISTS idx_batteries_vehicle_id ON batteries(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_batteries_status ON batteries(status);
CREATE INDEX IF NOT EXISTS idx_batteries_battery_smart_id ON batteries(battery_smart_id);

-- Enable RLS (Row Level Security)
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON batteries;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON batteries;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON batteries;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON batteries;

-- Create RLS policies for authenticated users
CREATE POLICY "Enable read access for all authenticated users"
ON batteries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for all authenticated users"
ON batteries FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users"
ON batteries FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for all authenticated users"
ON batteries FOR DELETE
TO authenticated
USING (true);

-- Enable realtime (safely handle if already enabled)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE batteries;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SUCCESS! Your batteries table is ready for import.
--
-- Next steps:
-- 1. Go to your app's Data Import page
-- 2. Select "Batteries" from the dropdown
-- 3. Download the template (or use your existing Bulk_Battery.csv)
-- 4. Upload and import
-- ============================================================================
