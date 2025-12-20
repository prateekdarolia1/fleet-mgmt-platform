-- Add validation constraints to batteries table
-- Goal: Prevent bad data at DB level, even if UI fails

-- Add CHECK constraint for battery_id: ^[A-Z0-9]{8}$
ALTER TABLE batteries
ADD CONSTRAINT check_battery_id_format
CHECK (battery_id ~ '^[A-Z0-9]{8}$');

-- Add CHECK constraint for zone_id: ^[A-Z0-9]{8}$
-- zone_id is nullable, so we only check if it's provided
ALTER TABLE batteries
ADD CONSTRAINT check_zone_id_format
CHECK (zone_id IS NULL OR zone_id ~ '^[A-Z0-9]{8}$');

-- Create a trigger function to enforce uppercase on usc_id
CREATE OR REPLACE FUNCTION enforce_usc_id_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.usc_id IS NOT NULL THEN
    NEW.usc_id := UPPER(NEW.usc_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce uppercase on usc_id before insert/update
DROP TRIGGER IF EXISTS enforce_usc_id_uppercase_trigger ON batteries;
CREATE TRIGGER enforce_usc_id_uppercase_trigger
BEFORE INSERT OR UPDATE ON batteries
FOR EACH ROW
EXECUTE FUNCTION enforce_usc_id_uppercase();

-- Add constraint to ensure retrofit_date is not in the future
ALTER TABLE batteries
ADD CONSTRAINT check_retrofit_date_not_future
CHECK (retrofit_date IS NULL OR retrofit_date <= CURRENT_DATE);

-- Update the updated_at timestamp on any change
CREATE OR REPLACE FUNCTION update_batteries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_batteries_updated_at_trigger ON batteries;
CREATE TRIGGER update_batteries_updated_at_trigger
BEFORE UPDATE ON batteries
FOR EACH ROW
EXECUTE FUNCTION update_batteries_updated_at();

-- Create comment on table explaining validations
COMMENT ON TABLE batteries IS 'Battery inventory table with strict validation constraints for data quality';

COMMENT ON CONSTRAINT check_battery_id_format ON batteries IS 'battery_id must be 8 uppercase alphanumeric characters: ^[A-Z0-9]{8}$';

COMMENT ON CONSTRAINT check_zone_id_format ON batteries IS 'zone_id must be 8 uppercase alphanumeric characters if provided: ^[A-Z0-9]{8}$';

COMMENT ON CONSTRAINT check_retrofit_date_not_future ON batteries IS 'retrofit_date cannot be in the future';
