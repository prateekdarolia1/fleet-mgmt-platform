-- Create enums for batteries table
CREATE TYPE service_provider AS ENUM ('BATTERY_SMART', 'OTHER');
CREATE TYPE battery_location AS ENUM ('NOIDA', 'OTHER');
CREATE TYPE battery_plan AS ENUM ('D2D', 'B2B', 'OTHER');
CREATE TYPE battery_status AS ENUM ('ACTIVE', 'MAPPED', 'UNMAPPED');

-- Create batteries table
CREATE TABLE batteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id TEXT NOT NULL UNIQUE,
  service_provider service_provider NOT NULL,
  zone_id TEXT,
  retrofit_date DATE,
  location battery_location,
  usc_id TEXT,
  battery_plan battery_plan,
  status battery_status NOT NULL DEFAULT 'ACTIVE',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index on battery_id for faster lookups
CREATE INDEX idx_batteries_battery_id ON batteries(battery_id);

-- Create index on vehicle_id for relationship queries
CREATE INDEX idx_batteries_vehicle_id ON batteries(vehicle_id);

-- Create index on status for filtering
CREATE INDEX idx_batteries_status ON batteries(status);

-- Enable RLS (Row Level Security)
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON batteries
  FOR SELECT USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable insert access for authenticated users" ON batteries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Enable update access for authenticated users" ON batteries
  FOR UPDATE USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable delete access for authenticated users" ON batteries
  FOR DELETE USING (auth.role() = 'authenticated_user');
