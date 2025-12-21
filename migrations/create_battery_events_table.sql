-- Create battery_events table for tracking battery lifecycle events
-- Goal: Track map/unmap operations and edits

-- Create enum for event types
CREATE TYPE battery_event_type AS ENUM ('CREATE', 'MAP', 'UNMAP', 'UPDATE', 'DELETE');

-- Create battery_events table
CREATE TABLE battery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id TEXT NOT NULL,
  event_type battery_event_type NOT NULL,
  vehicle_id UUID,
  previous_vehicle_id UUID,
  reason TEXT,
  performed_by TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  FOREIGN KEY (battery_id) REFERENCES batteries(battery_id) ON DELETE CASCADE
);

-- Create indexes for fast queries
CREATE INDEX idx_battery_events_battery_id ON battery_events(battery_id);
CREATE INDEX idx_battery_events_event_type ON battery_events(event_type);
CREATE INDEX idx_battery_events_vehicle_id ON battery_events(vehicle_id);
CREATE INDEX idx_battery_events_created_at ON battery_events(created_at);
CREATE INDEX idx_battery_events_performed_by ON battery_events(performed_by);

-- Enable RLS (Row Level Security)
ALTER TABLE battery_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON battery_events
  FOR SELECT USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable insert access for authenticated users" ON battery_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

-- Trigger function to log CREATE event when battery is created
CREATE OR REPLACE FUNCTION log_battery_create_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battery_events (
    battery_id,
    event_type,
    vehicle_id,
    reason,
    performed_by,
    changes
  ) VALUES (
    NEW.battery_id,
    'CREATE',
    NEW.vehicle_id,
    'Battery created',
    current_user,
    jsonb_build_object(
      'battery_id', NEW.battery_id,
      'service_provider', NEW.service_provider,
      'zone_id', NEW.zone_id,
      'location', NEW.location,
      'battery_plan', NEW.battery_plan,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log battery creation
DROP TRIGGER IF EXISTS log_battery_create_trigger ON batteries;
CREATE TRIGGER log_battery_create_trigger
AFTER INSERT ON batteries
FOR EACH ROW
EXECUTE FUNCTION log_battery_create_event();

-- Trigger function to log MAP event when vehicle_id changes from NULL to a value
CREATE OR REPLACE FUNCTION log_battery_map_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if vehicle_id changed from NULL to a value (MAP event)
  IF OLD.vehicle_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    INSERT INTO battery_events (
      battery_id,
      event_type,
      vehicle_id,
      previous_vehicle_id,
      reason,
      performed_by,
      changes
    ) VALUES (
      NEW.battery_id,
      'MAP',
      NEW.vehicle_id,
      OLD.vehicle_id,
      'Battery mapped to vehicle',
      current_user,
      jsonb_build_object(
        'old_vehicle_id', OLD.vehicle_id,
        'new_vehicle_id', NEW.vehicle_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  -- Only log if vehicle_id changed from a value to NULL (UNMAP event)
  ELSIF OLD.vehicle_id IS NOT NULL AND NEW.vehicle_id IS NULL THEN
    INSERT INTO battery_events (
      battery_id,
      event_type,
      vehicle_id,
      previous_vehicle_id,
      reason,
      performed_by,
      changes
    ) VALUES (
      NEW.battery_id,
      'UNMAP',
      NEW.vehicle_id,
      OLD.vehicle_id,
      'Battery unmapped from vehicle',
      current_user,
      jsonb_build_object(
        'old_vehicle_id', OLD.vehicle_id,
        'new_vehicle_id', NEW.vehicle_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  -- Log other updates as UPDATE events
  ELSIF (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.zone_id IS DISTINCT FROM NEW.zone_id OR
    OLD.retrofit_date IS DISTINCT FROM NEW.retrofit_date OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.battery_plan IS DISTINCT FROM NEW.battery_plan
  ) THEN
    INSERT INTO battery_events (
      battery_id,
      event_type,
      vehicle_id,
      reason,
      performed_by,
      changes
    ) VALUES (
      NEW.battery_id,
      'UPDATE',
      NEW.vehicle_id,
      'Battery updated',
      current_user,
      jsonb_build_object(
        'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status
                       THEN jsonb_build_object('old', OLD.status, 'new', NEW.status)
                       ELSE NULL END,
        'zone_id', CASE WHEN OLD.zone_id IS DISTINCT FROM NEW.zone_id
                        THEN jsonb_build_object('old', OLD.zone_id, 'new', NEW.zone_id)
                        ELSE NULL END,
        'retrofit_date', CASE WHEN OLD.retrofit_date IS DISTINCT FROM NEW.retrofit_date
                              THEN jsonb_build_object('old', OLD.retrofit_date, 'new', NEW.retrofit_date)
                              ELSE NULL END,
        'location', CASE WHEN OLD.location IS DISTINCT FROM NEW.location
                         THEN jsonb_build_object('old', OLD.location, 'new', NEW.location)
                         ELSE NULL END,
        'battery_plan', CASE WHEN OLD.battery_plan IS DISTINCT FROM NEW.battery_plan
                             THEN jsonb_build_object('old', OLD.battery_plan, 'new', NEW.battery_plan)
                             ELSE NULL END
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log battery updates (MAP/UNMAP/UPDATE)
DROP TRIGGER IF EXISTS log_battery_map_unmap_trigger ON batteries;
CREATE TRIGGER log_battery_map_unmap_trigger
AFTER UPDATE ON batteries
FOR EACH ROW
EXECUTE FUNCTION log_battery_map_event();

-- Trigger function to log DELETE event
CREATE OR REPLACE FUNCTION log_battery_delete_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battery_events (
    battery_id,
    event_type,
    vehicle_id,
    reason,
    performed_by,
    changes
  ) VALUES (
    OLD.battery_id,
    'DELETE',
    OLD.vehicle_id,
    'Battery deleted',
    current_user,
    jsonb_build_object(
      'battery_id', OLD.battery_id,
      'service_provider', OLD.service_provider,
      'vehicle_id', OLD.vehicle_id,
      'status', OLD.status
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log battery deletion
DROP TRIGGER IF EXISTS log_battery_delete_trigger ON batteries;
CREATE TRIGGER log_battery_delete_trigger
BEFORE DELETE ON batteries
FOR EACH ROW
EXECUTE FUNCTION log_battery_delete_event();

-- Add comments for documentation
COMMENT ON TABLE battery_events IS 'Audit log for battery lifecycle events: CREATE, MAP, UNMAP, UPDATE, DELETE';
COMMENT ON COLUMN battery_events.battery_id IS 'Reference to battery_id in batteries table';
COMMENT ON COLUMN battery_events.event_type IS 'Type of event: CREATE, MAP, UNMAP, UPDATE, DELETE';
COMMENT ON COLUMN battery_events.vehicle_id IS 'Vehicle ID for MAP events';
COMMENT ON COLUMN battery_events.previous_vehicle_id IS 'Previous vehicle ID for MAP/UNMAP events';
COMMENT ON COLUMN battery_events.reason IS 'Reason for the event/change';
COMMENT ON COLUMN battery_events.performed_by IS 'User who performed the action';
COMMENT ON COLUMN battery_events.changes IS 'JSON object containing field changes';
COMMENT ON COLUMN battery_events.created_at IS 'Timestamp of when event was recorded';
