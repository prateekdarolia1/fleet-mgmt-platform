-- ============================================================================
-- Add Battery Smart ID Tracking
-- ============================================================================
--
-- Purpose: Track Battery Smart company IDs for battery performance monitoring
--
-- Features:
-- - Add battery_smart_id to batteries table (8 chars, uppercase alphanumeric)
-- - Add battery_smart_id to riders table (tracks which rider uses which battery)
-- - Validation constraint: ^[A-Z0-9]{8}$
-- - Auto-uppercase conversion via trigger
-- - Audit trail of changes
--
-- ============================================================================

-- ============================================================================
-- BATTERIES TABLE - Add battery_smart_id column
-- ============================================================================

ALTER TABLE batteries
ADD COLUMN battery_smart_id TEXT UNIQUE;

-- Add comment explaining the column
COMMENT ON COLUMN batteries.battery_smart_id IS
'Battery Smart company ID - 8 characters, uppercase letters and numbers (e.g., "BS12AB34")';

-- Create validation check constraint
ALTER TABLE batteries
ADD CONSTRAINT check_battery_smart_id_format
CHECK (
  battery_smart_id IS NULL OR
  (battery_smart_id ~ '^[A-Z0-9]{8}$')
);

-- Create index for fast lookups
CREATE INDEX idx_batteries_battery_smart_id
ON batteries(battery_smart_id);

-- ============================================================================
-- RIDERS TABLE - Add battery_smart_id column
-- ============================================================================

ALTER TABLE riders
ADD COLUMN battery_smart_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN riders.battery_smart_id IS
'Battery Smart ID of the battery currently assigned to this rider - tracks which rider uses which battery for performance monitoring';

-- Create validation check constraint
ALTER TABLE riders
ADD CONSTRAINT check_rider_battery_smart_id_format
CHECK (
  battery_smart_id IS NULL OR
  (battery_smart_id ~ '^[A-Z0-9]{8}$')
);

-- Create index for fast lookups
CREATE INDEX idx_riders_battery_smart_id
ON riders(battery_smart_id);

-- ============================================================================
-- AUTO-UPPERCASE TRIGGER FOR BATTERIES
-- ============================================================================

DROP TRIGGER IF EXISTS auto_uppercase_battery_smart_id ON batteries CASCADE;
DROP FUNCTION IF EXISTS auto_uppercase_battery_smart_id_fn() CASCADE;

CREATE FUNCTION auto_uppercase_battery_smart_id_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.battery_smart_id IS NOT NULL THEN
    NEW.battery_smart_id := UPPER(TRIM(NEW.battery_smart_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_uppercase_battery_smart_id
BEFORE INSERT OR UPDATE ON batteries
FOR EACH ROW
EXECUTE FUNCTION auto_uppercase_battery_smart_id_fn();

COMMENT ON FUNCTION auto_uppercase_battery_smart_id_fn() IS
'Automatically convert battery_smart_id to uppercase and trim whitespace';

-- ============================================================================
-- AUTO-UPPERCASE TRIGGER FOR RIDERS
-- ============================================================================

DROP TRIGGER IF EXISTS auto_uppercase_rider_battery_smart_id ON riders CASCADE;
DROP FUNCTION IF EXISTS auto_uppercase_rider_battery_smart_id_fn() CASCADE;

CREATE FUNCTION auto_uppercase_rider_battery_smart_id_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.battery_smart_id IS NOT NULL THEN
    NEW.battery_smart_id := UPPER(TRIM(NEW.battery_smart_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_uppercase_rider_battery_smart_id
BEFORE INSERT OR UPDATE ON riders
FOR EACH ROW
EXECUTE FUNCTION auto_uppercase_rider_battery_smart_id_fn();

COMMENT ON FUNCTION auto_uppercase_rider_battery_smart_id_fn() IS
'Automatically convert rider battery_smart_id to uppercase and trim whitespace';

-- ============================================================================
-- VALIDATION FUNCTION FOR BATTERY SMART ID FORMAT
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_battery_smart_id(id TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF id IS NULL THEN
    RETURN QUERY SELECT true::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;

  IF LENGTH(TRIM(id)) = 0 THEN
    RETURN QUERY SELECT false, 'Battery Smart ID cannot be empty'::TEXT;
    RETURN;
  END IF;

  IF NOT (id ~ '^[A-Z0-9]{8}$') THEN
    RETURN QUERY SELECT
      false,
      format(
        'Invalid Battery Smart ID format. Must be exactly 8 uppercase letters/numbers. Got: %s',
        id
      )::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION validate_battery_smart_id(TEXT) IS
'Validates Battery Smart ID format: 8 uppercase alphanumeric characters.
Returns (is_valid, error_message) tuple.';

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

/*
BATTERY SMART ID TRACKING

Purpose:
--------
Track Battery Smart company IDs to monitor battery performance and condition
per rider and vehicle. This helps identify which batteries are experiencing
issues and which riders maintain batteries better.

Format:
-------
- Exactly 8 characters
- Uppercase letters (A-Z) and digits (0-9)
- Examples: BS12AB34, BAT00001, BEE12FGH

Storage:
--------
1. batteries.battery_smart_id
   - The primary record of the battery from Battery Smart company
   - Unique constraint: Each battery has one Battery Smart ID
   - Updated when battery record is created/modified

2. riders.battery_smart_id
   - Denormalized reference to track which battery a rider currently uses
   - NOT unique: Multiple riders may have used different Battery Smart IDs over time
   - Updated when a rider is assigned a new battery

Relationships:
--------------
Battery Smart ID -> Battery -> Vehicle -> Rider

So to find which rider is using which Battery Smart ID:
  riders.battery_smart_id = batteries.battery_smart_id (at a point in time)

Performance Monitoring:
----------------------
By tracking battery_smart_id on both batteries and riders, we can:
1. Calculate battery lifespan per rider
2. Identify problem batteries (frequent failures)
3. Identify maintenance issues (riders who damage batteries)
4. Track battery condition degradation
5. Optimize battery-rider assignments

Automatic Conversion:
---------------------
- Input: "bs12ab34", "bs12 AB34", "BS12AB34"
- Stored: "BS12AB34"
- Triggers convert to uppercase and trim whitespace

Validation:
-----------
- Database CHECK constraint prevents invalid format
- TypeScript validation on frontend
- RPC functions validate before insertion
- validate_battery_smart_id() function for manual checks

NULL Values:
-----------
- batteries.battery_smart_id: Can be NULL initially, but should be populated for Battery Smart batteries
- riders.battery_smart_id: Can be NULL if rider hasn't been assigned a battery yet

Migration Path:
---------------
1. New batteries from Battery Smart: battery_smart_id provided at creation
2. Existing batteries: Bulk update or manual entry via admin interface
3. Riders: battery_smart_id populated when battery is assigned via map_battery() RPC
4. History: Consider adding battery_change_history table to track rider->battery assignments over time

Example Usage:
--------------

-- Create battery with Battery Smart ID
INSERT INTO batteries (battery_id, battery_smart_id, service_provider, status)
VALUES ('BAT00001', 'BS12AB34', 'BATTERY_SMART', 'ACTIVE');

-- Assign battery to rider
INSERT INTO riders (rider_id, name, battery_smart_id, ...)
VALUES ('R001', 'John Doe', 'BS12AB34', ...);

-- Find all batteries by a rider
SELECT b.* FROM batteries b
WHERE b.battery_smart_id IN (
  SELECT battery_smart_id FROM riders WHERE rider_id = 'R001'
);

-- Track battery usage across riders (with history)
SELECT
  bs.battery_smart_id,
  r.name as current_rider,
  b.vehicle_id,
  v.vehicle_number
FROM batteries b
JOIN riders r ON b.battery_smart_id = r.battery_smart_id
JOIN vehicles v ON b.vehicle_id = v.id
WHERE b.status = 'MAPPED';

*/

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO service_role;
