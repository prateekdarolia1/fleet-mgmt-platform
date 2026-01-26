-- Add battery_smart_id column to riders table
-- This column tracks the Battery Smart company ID for each rider

ALTER TABLE riders
ADD COLUMN IF NOT EXISTS battery_smart_id TEXT;

-- Add CHECK constraint for battery_smart_id format (7-8 uppercase alphanumeric characters)
ALTER TABLE riders
ADD CONSTRAINT check_rider_battery_smart_id_format
CHECK (
  battery_smart_id IS NULL OR
  (battery_smart_id ~ '^[A-Z0-9]{7,8}$')
);

-- Add comment for documentation
COMMENT ON COLUMN riders.battery_smart_id IS 
'Battery Smart company ID - 7-8 characters, uppercase letters and numbers (e.g., "BS23342", "BS12AB34")';