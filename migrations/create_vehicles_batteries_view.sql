-- Create a SQL view to efficiently query vehicles with their battery mapping status
-- This view joins vehicles with batteries to expose battery state
--
-- Key features:
-- - Shows all vehicles (even those without batteries)
-- - Includes all vehicle fields
-- - Includes battery information if mapped
-- - NULL battery fields if no battery mapped
-- - Easy filtering for "vehicles without battery"

-- Drop existing view if it exists
DROP VIEW IF EXISTS vehicles_with_batteries CASCADE;

-- Create the view
CREATE VIEW vehicles_with_batteries AS
SELECT
  -- Vehicle fields
  v.id,
  v.vehicle_number,
  v.make,
  v.model,
  v.color,
  v.chassis_number,
  v.motor_serial_number,
  v.vehicle_type,
  v.battery_type,
  v.status AS vehicle_status,
  v.delivery_date,
  v.pdi_done_by,
  v.vendor,
  v.registration_received,
  v.insurance_received,
  v.portable_charger_received,
  v.next_maintenance_date,
  v.location,
  v.rental_start_date,
  v.rental_end_date,
  v.rider_id,
  v.rider_name,
  v.created_at AS vehicle_created_at,
  v.updated_at AS vehicle_updated_at,

  -- Battery fields (NULL if no battery mapped)
  b.id AS battery_id,
  b.battery_id AS battery_identifier,
  b.service_provider,
  b.zone_id,
  b.retrofit_date,
  b.location AS battery_location,
  b.usc_id,
  b.battery_plan,
  b.status AS battery_status,
  b.created_at AS battery_created_at,
  b.updated_at AS battery_updated_at,

  -- Computed fields
  CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS battery_mapped,
  CASE WHEN b.id IS NOT NULL THEN b.battery_id ELSE NULL END AS mapped_battery_id

FROM vehicles v
LEFT JOIN batteries b ON v.id = b.vehicle_id;

-- Create indexes on the view (if supported by Supabase)
-- Note: Indexes on views may not be directly supported in Supabase
-- Instead, rely on indexes on the underlying tables

-- Add comment to view for documentation
COMMENT ON VIEW vehicles_with_batteries IS
'View showing vehicles with their battery mapping status.
Includes all vehicle fields and battery fields (NULL if no battery mapped).
Use for efficiently querying vehicles and their battery assignments.';

-- Add column comments for clarity
COMMENT ON COLUMN vehicles_with_batteries.battery_mapped IS
'Boolean flag: true if vehicle has a battery mapped, false otherwise';

COMMENT ON COLUMN vehicles_with_batteries.mapped_battery_id IS
'Battery identifier if mapped, NULL otherwise (convenience field)';
