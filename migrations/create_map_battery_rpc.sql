-- ============================================================================
-- Map Battery RPC Function
-- ============================================================================
--
-- Creates a remote procedure call (RPC) that atomically maps a battery to a vehicle.
--
-- Key Features:
-- - Atomic transaction: All operations succeed or fail together
-- - Row-level locking: Prevents race conditions
-- - Validation: Checks battery and vehicle state before mapping
-- - Audit logging: Automatically logs the MAP event
-- - Error handling: Returns clear error messages
--
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS map_battery(UUID, UUID, UUID) CASCADE;

-- ============================================================================
-- Main RPC Function
-- ============================================================================

CREATE FUNCTION map_battery(
  p_battery_id UUID,
  p_vehicle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_battery RECORD;
  v_vehicle RECORD;
  v_result JSONB;
BEGIN
  -- =========================================================================
  -- Validation Phase
  -- =========================================================================

  -- Validate battery exists and get its current state (with row lock)
  BEGIN
    SELECT
      id, battery_id, status, vehicle_id, service_provider, zone_id,
      created_at, updated_at
    INTO v_battery
    FROM batteries
    WHERE id = p_battery_id
    FOR UPDATE
    NOWAIT;

    IF v_battery IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'BATTERY_NOT_FOUND',
        'message', 'Battery does not exist'
      );
    END IF;

  EXCEPTION WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BATTERY_LOCKED',
      'message', 'Battery is currently being modified. Please try again.'
    );
  END;

  -- Validate battery status is ACTIVE or UNMAPPED
  IF v_battery.status NOT IN ('ACTIVE', 'UNMAPPED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_BATTERY_STATUS',
      'message', 'Battery status is ' || v_battery.status || '. Only ACTIVE or UNMAPPED batteries can be mapped.',
      'current_status', v_battery.status,
      'allowed_statuses', ARRAY['ACTIVE', 'UNMAPPED']
    );
  END IF;

  -- Validate battery is not already mapped to a different vehicle
  IF v_battery.vehicle_id IS NOT NULL AND v_battery.vehicle_id != p_vehicle_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BATTERY_ALREADY_MAPPED',
      'message', 'Battery is already mapped to another vehicle',
      'current_vehicle_id', v_battery.vehicle_id,
      'requested_vehicle_id', p_vehicle_id
    );
  END IF;

  -- Validate vehicle exists and get its current state (with row lock)
  BEGIN
    SELECT
      id, vehicle_number, status AS vehicle_status, rider_name,
      created_at, updated_at
    INTO v_vehicle
    FROM vehicles
    WHERE id = p_vehicle_id
    FOR UPDATE
    NOWAIT;

    IF v_vehicle IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'VEHICLE_NOT_FOUND',
        'message', 'Vehicle does not exist'
      );
    END IF;

  EXCEPTION WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VEHICLE_LOCKED',
      'message', 'Vehicle is currently being modified. Please try again.'
    );
  END;

  -- Validate vehicle doesn't already have a battery
  IF (
    SELECT battery_id IS NOT NULL
    FROM vehicles_with_batteries
    WHERE id = p_vehicle_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VEHICLE_ALREADY_HAS_BATTERY',
      'message', 'Vehicle already has a battery assigned',
      'vehicle_id', p_vehicle_id,
      'vehicle_number', v_vehicle.vehicle_number
    );
  END IF;

  -- =========================================================================
  -- Update Phase
  -- =========================================================================

  -- Update battery: assign to vehicle and mark as MAPPED
  UPDATE batteries
  SET
    vehicle_id = p_vehicle_id,
    status = 'MAPPED',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_battery_id;

  -- =========================================================================
  -- Audit Logging Phase
  -- =========================================================================

  -- Insert MAP event into battery_events
  INSERT INTO battery_events (
    battery_id,
    event_type,
    details,
    created_by,
    created_at
  )
  VALUES (
    p_battery_id,
    'MAP',
    jsonb_build_object(
      'battery_id', v_battery.battery_id,
      'battery_uuid', p_battery_id,
      'vehicle_id', p_vehicle_id,
      'vehicle_number', v_vehicle.vehicle_number,
      'previous_status', v_battery.status,
      'new_status', 'MAPPED',
      'previous_vehicle_id', v_battery.vehicle_id,
      'action', 'Battery mapped to vehicle'
    ),
    p_user_id,
    CURRENT_TIMESTAMP
  );

  -- =========================================================================
  -- Success Response
  -- =========================================================================

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Battery successfully mapped to vehicle',
    'battery', jsonb_build_object(
      'id', v_battery.id,
      'battery_id', v_battery.battery_id,
      'status', 'MAPPED',
      'vehicle_id', p_vehicle_id,
      'service_provider', v_battery.service_provider,
      'zone_id', v_battery.zone_id
    ),
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'vehicle_number', v_vehicle.vehicle_number,
      'rider_name', v_vehicle.rider_name
    ),
    'timestamp', CURRENT_TIMESTAMP
  );

  RETURN v_result;

  -- =========================================================================
  -- Exception Handling
  -- =========================================================================

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'UNEXPECTED_ERROR',
    'message', SQLERRM,
    'detail', SQLSTATE
  );

END $$;

-- ============================================================================
-- Function Metadata
-- ============================================================================

COMMENT ON FUNCTION map_battery(UUID, UUID, UUID) IS
'Atomically map a battery to a vehicle with validation and audit logging.

Parameters:
- p_battery_id: UUID of the battery to map
- p_vehicle_id: UUID of the vehicle to assign the battery to
- p_user_id: UUID of the user performing the mapping

Returns: JSONB object with success flag and details

Validation:
- Battery must be ACTIVE or UNMAPPED status
- Battery must not be already mapped to a different vehicle
- Vehicle must exist
- Vehicle must not already have a battery assigned

Behavior:
- Uses row-level locking (FOR UPDATE NOWAIT) to prevent race conditions
- Updates battery status to MAPPED
- Assigns vehicle_id to battery
- Logs the MAP event with full details
- All operations are atomic: all succeed or all fail

Error Codes:
- BATTERY_NOT_FOUND: Battery UUID does not exist
- BATTERY_LOCKED: Battery is being modified by another transaction
- INVALID_BATTERY_STATUS: Battery is not ACTIVE or UNMAPPED
- BATTERY_ALREADY_MAPPED: Battery is mapped to a different vehicle
- VEHICLE_NOT_FOUND: Vehicle UUID does not exist
- VEHICLE_LOCKED: Vehicle is being modified by another transaction
- VEHICLE_ALREADY_HAS_BATTERY: Vehicle already has a battery assigned
- UNEXPECTED_ERROR: Unexpected database error

Example:
  SELECT map_battery(
    ''550e8400-e29b-41d4-a716-446655440000'',
    ''550e8400-e29b-41d4-a716-446655440001'',
    ''550e8400-e29b-41d4-a716-446655440002''
  );
';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION map_battery(UUID, UUID, UUID) TO authenticated;

-- Allow service role (for admin operations)
GRANT EXECUTE ON FUNCTION map_battery(UUID, UUID, UUID) TO service_role;

-- ============================================================================
-- Index optimization
-- ============================================================================

-- Ensure vehicle_id index exists for fast lookup in vehicles_with_batteries view
CREATE INDEX IF NOT EXISTS idx_batteries_vehicle_id
ON batteries(vehicle_id)
WHERE vehicle_id IS NOT NULL;

-- Ensure status index exists for validation queries
CREATE INDEX IF NOT EXISTS idx_batteries_status
ON batteries(status);
