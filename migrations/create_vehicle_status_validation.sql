-- ============================================================================
-- Vehicle Status Validation - Ready for Deployment Rule
-- ============================================================================
--
-- Business Rule: A vehicle cannot be marked "Ready for Deployment" unless
-- it has a battery assigned.
--
-- Implementation:
-- 1. UPDATE trigger to block invalid status changes
-- 2. RPC function for validated status updates
--
-- ============================================================================

-- ============================================================================
-- Layer 1: BEFORE UPDATE TRIGGER - Direct Update Prevention
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_vehicle_status_before_update ON vehicles CASCADE;
DROP FUNCTION IF EXISTS validate_vehicle_status_change() CASCADE;

CREATE FUNCTION validate_vehicle_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate if status is being changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Rule: Cannot mark as "Ready for Deployment" without a battery
    IF NEW.status = 'Ready for Deployment' THEN
      -- Check if vehicle has a battery assigned
      IF NOT EXISTS (
        SELECT 1 FROM batteries
        WHERE vehicle_id = NEW.id
        AND status = 'MAPPED'
      ) THEN
        RAISE EXCEPTION
          'Vehicle % cannot be marked "Ready for Deployment" without a battery assigned',
          NEW.vehicle_number;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_vehicle_status_before_update
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION validate_vehicle_status_change();

COMMENT ON FUNCTION validate_vehicle_status_change() IS
'Validates that vehicle status changes comply with business rules.
Specifically prevents marking a vehicle as "Ready for Deployment" without a battery.';

-- ============================================================================
-- Layer 2: RPC FUNCTION - Application Layer Validation
-- ============================================================================

DROP FUNCTION IF EXISTS update_vehicle_status(UUID, TEXT, UUID) CASCADE;

CREATE FUNCTION update_vehicle_status(
  p_vehicle_id UUID,
  p_new_status TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_vehicle RECORD;
  v_has_battery BOOLEAN;
  v_result JSONB;
BEGIN
  -- =========================================================================
  -- Validation Phase
  -- =========================================================================

  -- Validate new status is valid enum value
  IF p_new_status NOT IN ('Ready for Deployment', 'Deployed', 'Under Maintenance') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', 'Invalid status. Must be one of: Ready for Deployment, Deployed, Under Maintenance',
      'provided_status', p_new_status,
      'valid_statuses', ARRAY['Ready for Deployment', 'Deployed', 'Under Maintenance']
    );
  END IF;

  -- Fetch vehicle with row lock
  BEGIN
    SELECT
      id, vehicle_number, status AS current_status,
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

  -- Check if status is actually changing
  IF v_vehicle.current_status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Vehicle status is already ' || p_new_status,
      'vehicle', jsonb_build_object(
        'id', v_vehicle.id,
        'vehicle_number', v_vehicle.vehicle_number,
        'status', p_new_status
      ),
      'action', 'no_change'
    );
  END IF;

  -- =========================================================================
  -- Business Rule Validation: Ready for Deployment requires battery
  -- =========================================================================

  IF p_new_status = 'Ready for Deployment' THEN
    -- Check if vehicle has a battery assigned
    SELECT EXISTS (
      SELECT 1 FROM batteries
      WHERE vehicle_id = p_vehicle_id
      AND status = 'MAPPED'
    ) INTO v_has_battery;

    IF NOT v_has_battery THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'MISSING_BATTERY',
        'message', 'Vehicle cannot be marked "Ready for Deployment" without a battery assigned',
        'vehicle_id', p_vehicle_id,
        'vehicle_number', v_vehicle.vehicle_number,
        'reason', 'Battery is required for deployment readiness',
        'action', 'assign_battery_first'
      );
    END IF;
  END IF;

  -- =========================================================================
  -- Update Phase
  -- =========================================================================

  UPDATE vehicles
  SET
    status = p_new_status,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_vehicle_id;

  -- =========================================================================
  -- Audit Logging Phase
  -- =========================================================================

  -- Insert status change event into vehicle_events (if table exists)
  -- For now, we'll just return success response
  -- Can be extended with a vehicle_events table for full audit trail

  -- =========================================================================
  -- Success Response
  -- =========================================================================

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Vehicle status updated successfully',
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'vehicle_number', v_vehicle.vehicle_number,
      'previous_status', v_vehicle.current_status,
      'new_status', p_new_status
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

COMMENT ON FUNCTION update_vehicle_status(UUID, TEXT, UUID) IS
'Safely update vehicle status with validation.

Parameters:
- p_vehicle_id: UUID of the vehicle to update
- p_new_status: New status (''Ready for Deployment'', ''Deployed'', or ''Under Maintenance'')
- p_user_id: UUID of the user performing the update

Returns: JSONB object with success flag and details

Validation:
- New status must be a valid enum value
- Vehicle must exist
- If status is "Ready for Deployment", vehicle must have a battery assigned

Behavior:
- Uses row-level locking (FOR UPDATE NOWAIT) to prevent race conditions
- Updates vehicle status and timestamp
- Returns clear error messages for validation failures
- Returns success details on completion

Error Codes:
- INVALID_STATUS: Status is not a valid enum value
- VEHICLE_NOT_FOUND: Vehicle does not exist
- VEHICLE_LOCKED: Vehicle is being modified by another transaction
- MISSING_BATTERY: Cannot mark as "Ready for Deployment" without a battery
- UNEXPECTED_ERROR: Unexpected database error

Example:
  SELECT update_vehicle_status(
    ''550e8400-e29b-41d4-a716-446655440000'',
    ''Ready for Deployment'',
    ''550e8400-e29b-41d4-a716-446655440002''
  );
';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION update_vehicle_status(UUID, TEXT, UUID) TO authenticated;

-- Allow service role (for admin operations)
GRANT EXECUTE ON FUNCTION update_vehicle_status(UUID, TEXT, UUID) TO service_role;

-- ============================================================================
-- Index optimization
-- ============================================================================

-- Ensure battery vehicle_id index exists for fast lookup
CREATE INDEX IF NOT EXISTS idx_batteries_vehicle_id_status
ON batteries(vehicle_id, status)
WHERE vehicle_id IS NOT NULL;

-- Ensure vehicle status index exists for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status
ON vehicles(status);

-- ============================================================================
-- Documentation
-- ============================================================================

/*
BUSINESS RULE ENFORCEMENT:
"Vehicle cannot be marked READY_FOR_DEPLOYMENT unless battery_id IS NOT NULL"

This rule is enforced through a three-layer defense system:

LAYER 1: Trigger (validate_vehicle_status_before_update)
- Prevents direct SQL UPDATE statements that violate the rule
- Blocks even admin-level direct database updates
- Error: "Vehicle X cannot be marked Ready for Deployment without a battery assigned"

LAYER 2: RPC Function (update_vehicle_status)
- Provides application-level validation with detailed error messages
- Returns structured error codes for frontend handling
- Supports audit logging extension
- Recommended way to update vehicle status from application

LAYER 3: Application Code (useVehicles hook)
- Uses the RPC function instead of direct updates
- Shows error messages to users
- Prevents UI from offering invalid status transitions

VALIDATION FLOW:
Vehicle Status Change Request
    ↓
Application calls update_vehicle_status() RPC
    ↓
RPC validates:
    1. Status is valid enum
    2. Vehicle exists and is not locked
    3. If "Ready for Deployment":
       - Check batteries table for MAPPED battery
       - If missing: Return error with action: "assign_battery_first"
    ↓
If all validations pass:
    - Update vehicle.status
    - Return success response
    ↓
If validation fails:
    - Return error with clear message
    - No database changes made

EXAMPLE FLOWS:

1. VALID FLOW:
   Vehicle has battery → Try to mark "Ready" → Success

2. INVALID FLOW:
   Vehicle has NO battery → Try to mark "Ready"
   → Error: "Cannot mark Ready without battery"
   → User must: Map battery first → Then mark Ready

3. BYPASS ATTEMPT:
   Direct SQL UPDATE vehicles SET status = 'Ready for Deployment' ...
   → Trigger blocks: "Cannot mark Ready without battery"
   → Direct update fails

4. LOCKING/CONCURRENT FLOW:
   Another transaction updating same vehicle
   → Error: "Vehicle is currently being modified"
   → User should retry

DEPLOYMENT NOTES:
- Run this migration to enable the rule
- Existing vehicles already "Ready for Deployment" without batteries will pass
  (no validation of existing data)
- New status changes going forward will be validated
- Can optionally create a data cleanup migration if needed

FUTURE ENHANCEMENTS:
- Add vehicle_events table for full audit trail of status changes
- Add timestamp tracking for how long vehicle is in each status
- Add approval workflow for certain status transitions
- Add reason/comment field for status changes
*/
