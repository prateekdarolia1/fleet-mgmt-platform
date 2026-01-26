-- ============================================================================
-- Update Battery Smart ID Constraint: 7-8 Characters
-- ============================================================================

-- Drop old 8-character constraint
ALTER TABLE batteries DROP CONSTRAINT IF EXISTS check_battery_smart_id_format;
ALTER TABLE riders DROP CONSTRAINT IF EXISTS check_rider_battery_smart_id_format;

-- Add new 7-8 character constraint
ALTER TABLE batteries ADD CONSTRAINT check_battery_smart_id_format
CHECK (battery_smart_id IS NULL OR (battery_smart_id ~ '^[A-Z0-9]{7,8}$'));

ALTER TABLE riders ADD CONSTRAINT check_rider_battery_smart_id_format
CHECK (battery_smart_id IS NULL OR (battery_smart_id ~ '^[A-Z0-9]{7,8}$'));

-- Update validation function
CREATE OR REPLACE FUNCTION validate_battery_smart_id(id TEXT)
RETURNS TABLE (is_valid BOOLEAN, error_message TEXT) 
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
    RETURN QUERY SELECT false, format('Invalid Battery Smart ID format. Must be 7-8 uppercase letters/numbers. Got: %s', id)::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_battery_smart_id(TEXT) TO service_role;