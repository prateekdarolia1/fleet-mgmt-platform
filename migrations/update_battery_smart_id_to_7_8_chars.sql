-- ============================================================================
-- Update Battery Smart ID Constraint: 7-8 Characters
-- ============================================================================
--
-- Purpose: Update battery_smart_id validation to accept 7-8 characters
--
-- Changes:
-- - Drop old CHECK constraint (exactly 8 characters)
-- - Add new CHECK constraint (7-8 characters)
-- - Update validate_battery_smart_id() function
-- - Update column comments
--
-- Examples: BS23342 (7 chars), BS12AB34 (8 chars)
--
-- ============================================================================

-- ============================================================================
-- BATTERIES TABLE - Update constraint
-- ============================================================================

-- Drop old constraint
ALTER TABLE batteries
DROP CONSTRAINT IF EXISTS check_battery_smart_id_format;

-- Add new constraint (7-8 characters)
ALTER TABLE batteries
ADD CONSTRAINT check_battery_smart_id_format
CHECK (
  battery_smart_id IS NULL OR
  (battery_smart_id ~ '^[A-Z0-9]{7,8}$')
);

-- Update column comment
COMMENT ON COLUMN batteries.battery_smart_id IS
'Battery Smart company ID - 7-8 characters, uppercase letters and numbers (e.g., "BS23342", "BS12AB34")';

-- ============================================================================
-- RIDERS TABLE - Update constraint
-- ============================================================================

-- Drop old constraint
ALTER TABLE riders
DROP CONSTRAINT IF EXISTS check_rider_battery_smart_id_format;

-- Add new constraint (7-8 characters)
ALTER TABLE riders
ADD CONSTRAINT check_rider_battery_smart_id_format
CHECK (
  battery_smart_id IS NULL OR
  (battery_smart_id ~ '^[A-Z0-9]{7,8}$')
);

-- ============================================================================
-- UPDATE VALIDATION FUNCTION
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

  IF NOT (id ~ '^[A-Z0-9]{7,8}$') THEN
    RETURN QUERY SELECT
      false,
      format(
        'Invalid Battery Smart ID format. Must be 7-8 uppercase letters/numbers. Got: %s',
        id
      )::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION validate_battery_smart_id(TEXT) IS
'Validates Battery Smart ID format: 7-8 uppercase alphanumeric characters.
Returns (is_valid, error_message) tuple.';

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

/*
BATTERY SMART ID TRACKING - Updated Validation

Purpose:
--------
Track Battery Smart company IDs to monitor battery performance and condition
per rider and vehicle.

Format:
-------
- 7 to 8 characters (minimum 7)
- Uppercase letters (A-Z) and digits (0-9)
- Examples: BS23342 (7 chars), BS12AB34 (8 chars), BAT0001 (7 chars)

Examples from INT041 vehicle:
-----------------------------
- INT041 - BS23342 (Vehicle ID - Battery ID)

Migration Path:
---------------
This migration updates the existing constraint from exactly 8 characters
to 7-8 characters to support existing Battery Smart ID formats.

Previous format: Exactly 8 characters (e.g., BS12AB34)
New format: 7-8 characters (e.g., BS23342, BS12AB34)

Existing data remains valid - all 8-character IDs are still accepted.
*/

-- ============================================================================
-- Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO service_role;
