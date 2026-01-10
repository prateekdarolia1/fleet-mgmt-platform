-- ============================================================================
-- Migration: Update map_battery RPC to remove deprecated swap limit parameter
-- Description: Swap limits are now managed via rider_ledgers, not during
--              battery-vehicle mapping
-- Date: 2026-01-10
-- ============================================================================

-- Drop and recreate map_battery function without swap limit parameter
DROP FUNCTION IF EXISTS map_battery(UUID, UUID, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION map_battery(
  p_battery_id UUID,
  p_vehicle_id UUID,
  p_battery_smart_id TEXT,
  p_user_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_battery RECORD;
  v_vehicle RECORD;
BEGIN
  -- Lock Battery Aggregate (Pessimistic Locking)
  SELECT * INTO v_battery
  FROM batteries
  WHERE id = p_battery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BATTERY_NOT_FOUND',
      'message', 'Battery aggregate not found'
    );
  END IF;

  -- Business Rule: Only ACTIVE or UNMAPPED batteries can be mapped
  IF v_battery.status NOT IN ('ACTIVE', 'UNMAPPED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_BATTERY_STATUS',
      'message', 'Battery must be ACTIVE or UNMAPPED to map',
      'current_status', v_battery.status
    );
  END IF;

  -- Business Rule: Battery cannot be mapped to multiple vehicles
  IF v_battery.vehicle_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BATTERY_ALREADY_MAPPED',
      'message', 'Battery is already mapped to another vehicle'
    );
  END IF;

  -- Lock Vehicle Aggregate (Pessimistic Locking)
  SELECT * INTO v_vehicle
  FROM vehicles
  WHERE id = p_vehicle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VEHICLE_NOT_FOUND',
      'message', 'Vehicle aggregate not found'
    );
  END IF;

  -- Business Rule: Vehicle can only have one battery at a time
  IF v_vehicle.battery_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VEHICLE_ALREADY_HAS_BATTERY',
      'message', 'Vehicle already has a battery assigned'
    );
  END IF;

  -- Update Battery Aggregate State (no longer update swaps_allowed_per_month here)
  UPDATE batteries
  SET
    status = 'MAPPED',
    vehicle_id = p_vehicle_id,
    updated_at = now()
  WHERE id = p_battery_id;

  -- Update Vehicle Aggregate State
  UPDATE vehicles
  SET
    battery_id = p_battery_id,
    battery_smart_id = p_battery_smart_id,
    updated_at = now()
  WHERE id = p_vehicle_id;

  -- Publish Domain Events (Event Sourcing)
  INSERT INTO battery_events (battery_id, event_type, vehicle_id, performed_by)
  VALUES (p_battery_id, 'MAP', p_vehicle_id, p_user_id);

  INSERT INTO vehicle_events (vehicle_id, event_type, battery_id, performed_by)
  VALUES (p_vehicle_id, 'MAP_BATTERY', p_battery_id, p_user_id);

  -- Success Response (DTO)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Battery successfully mapped to vehicle',
    'battery', jsonb_build_object(
      'id', p_battery_id,
      'battery_id', v_battery.battery_id,
      'status', 'MAPPED'
    ),
    'vehicle', jsonb_build_object(
      'id', p_vehicle_id,
      'vehicle_number', v_vehicle.vehicle_number
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION map_battery IS
  'Domain Service: Coordinates battery-vehicle mapping across aggregates. Note: Swap limits now managed via rider_ledgers table.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: map_battery RPC updated';
  RAISE NOTICE '  - Removed p_swaps_allowed_per_month parameter';
  RAISE NOTICE '  - Function no longer updates batteries.swaps_allowed_per_month';
  RAISE NOTICE '  - Swap limits are now managed via rider_ledgers table';
END $$;
