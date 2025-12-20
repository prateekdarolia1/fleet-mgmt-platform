-- ============================================================================
-- Unmap Battery RPC Function
-- ============================================================================
--
-- Creates a remote procedure call (RPC) that atomically unmaps a battery from a vehicle.
--
-- Key Features:
-- - Atomic transaction: All operations succeed or fail together
-- - Row-level locking: Prevents race conditions
-- - Validation: Checks battery and vehicle state before unmapping
-- - Reason requirement: Captures reason for unmapping (max 200 chars)
-- - Audit logging: Automatically logs the UNMAP event with reason
-- - Error handling: Returns clear error messages
--
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS unmap_battery(UUID, TEXT, UUID) CASCADE;

-- ============================================================================
-- Main RPC Function
-- ============================================================================

CREATE FUNCTION unmap_battery(
  p_battery_id UUID,
  p_reason TEXT,
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

  -- Validate reason is provided and not too long
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MISSING_REASON',
      'message', 'Reason for unmapping is required'
    );
  END IF;

  IF LENGTH(TRIM(p_reason)) > 200 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REASON_TOO_LONG',
      'message', 'Reason must be 200 characters or less',
      'provided_length', LENGTH(TRIM(p_reason)),
      'max_length', 200
    );
  END IF;

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

  -- Validate battery status is MAPPED
  IF v_battery.status != 'MAPPED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_BATTERY_STATUS',
      'message', 'Battery status is ' || v_battery.status || '. Only MAPPED batteries can be unmapped.',
      'current_status', v_battery.status
    );
  END IF;

  -- Validate battery is actually mapped to a vehicle
  IF v_battery.vehicle_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BATTERY_NOT_MAPPED',
      'message', 'Battery is not mapped to any vehicle'
    );
  END IF;

  -- Validate vehicle exists and get its current state (with row lock)
  BEGIN
    SELECT
      id, vehicle_number, status AS vehicle_status, rider_name,
      created_at, updated_at
    INTO v_vehicle
    FROM vehicles
    WHERE id = v_battery.vehicle_id
    FOR UPDATE
    NOWAIT;

    IF v_vehicle IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'VEHICLE_NOT_FOUND',
        'message', 'Vehicle associated with battery does not exist'
      );
    END IF;

  EXCEPTION WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VEHICLE_LOCKED',
      'message', 'Vehicle is currently being modified. Please try again.'
    );
  END;

  -- =========================================================================
  -- Update Phase
  -- =========================================================================

  -- Update battery: remove vehicle assignment and mark as UNMAPPED
  UPDATE batteries
  SET
    vehicle_id = NULL,
    status = 'UNMAPPED',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_battery_id;

  -- =========================================================================
  -- Audit Logging Phase
  -- =========================================================================

  -- Insert UNMAP event into battery_events
  INSERT INTO battery_events (
    battery_id,
    event_type,
    details,
    created_by,
    created_at
  )
  VALUES (
    p_battery_id,
    'UNMAP',
    jsonb_build_object(
      'battery_id', v_battery.battery_id,
      'battery_uuid', p_battery_id,
      'vehicle_id', v_battery.vehicle_id,
      'vehicle_number', v_vehicle.vehicle_number,
      'previous_status', v_battery.status,
      'new_status', 'UNMAPPED',
      'reason', TRIM(p_reason),
      'action', 'Battery unmapped from vehicle'
    ),
    p_user_id,
    CURRENT_TIMESTAMP
  );

  -- =========================================================================
  -- Success Response
  -- =========================================================================

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Battery successfully unmapped from vehicle',
    'battery', jsonb_build_object(
      'id', v_battery.id,
      'battery_id', v_battery.battery_id,
      'status', 'UNMAPPED',
      'vehicle_id', NULL,
      'service_provider', v_battery.service_provider,
      'zone_id', v_battery.zone_id
    ),
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'vehicle_number', v_vehicle.vehicle_number,
      'rider_name', v_vehicle.rider_name
    ),
    'reason', TRIM(p_reason),
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

COMMENT ON FUNCTION unmap_battery(UUID, TEXT, UUID) IS
'Atomically unmap a battery from a vehicle with validation and audit logging.

Parameters:
- p_battery_id: UUID of the battery to unmap
- p_reason: Reason for unmapping (required, max 200 characters)
- p_user_id: UUID of the user performing the unmapping

Returns: JSONB object with success flag and details

Validation:
- Reason must be provided and not exceed 200 characters
- Battery must exist and have MAPPED status
- Battery must be assigned to a vehicle
- Vehicle must exist and be accessible

Behavior:
- Uses row-level locking (FOR UPDATE NOWAIT) to prevent race conditions
- Clears vehicle_id from battery record
- Updates battery status to UNMAPPED
- Logs the UNMAP event with full details including reason
- All operations are atomic: all succeed or all fail

Error Codes:
- MISSING_REASON: Reason not provided
- REASON_TOO_LONG: Reason exceeds 200 characters
- BATTERY_NOT_FOUND: Battery UUID does not exist
- BATTERY_LOCKED: Battery is being modified by another transaction
- INVALID_BATTERY_STATUS: Battery is not MAPPED status
- BATTERY_NOT_MAPPED: Battery is not mapped to any vehicle
- VEHICLE_NOT_FOUND: Vehicle UUID does not exist
- VEHICLE_LOCKED: Vehicle is being modified by another transaction
- UNEXPECTED_ERROR: Unexpected database error

Example:
  SELECT unmap_battery(
    ''550e8400-e29b-41d4-a716-446655440000'',
    ''Battery failed diagnostics'',
    ''550e8400-e29b-41d4-a716-446655440002''
  );
';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION unmap_battery(UUID, TEXT, UUID) TO authenticated;

-- Allow service role (for admin operations)
GRANT EXECUTE ON FUNCTION unmap_battery(UUID, TEXT, UUID) TO service_role;

-- ============================================================================
-- Index optimization
-- ============================================================================

-- Ensure vehicle_id index exists for fast lookup when unmapping
CREATE INDEX IF NOT EXISTS idx_batteries_vehicle_id
ON batteries(vehicle_id)
WHERE vehicle_id IS NOT NULL;

-- Ensure status index exists for validation queries
CREATE INDEX IF NOT EXISTS idx_batteries_status
ON batteries(status);
