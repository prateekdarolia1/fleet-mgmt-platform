-- Migration: Add create_rental_ledger RPC function
-- Description: Creates a rental ledger when a rider is activated
-- Part of: auto-create-rental-ledger change

-- Create the function
CREATE OR REPLACE FUNCTION create_rental_ledger(
  p_rider_id TEXT,
  p_vehicle_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider_name TEXT;
  v_vehicle_number TEXT;
  v_rental_amount DECIMAL(10,2);
  v_ledger_id UUID;
BEGIN
  -- Validate rider exists and get info
  SELECT
    r.name,
    COALESCE(
      CASE r.rental_plan
        WHEN 'daily' THEN 500
        WHEN 'weekly' THEN 2000
        WHEN 'monthly' THEN 8000
        ELSE 0
      END,
      0
    ) as rental_amount
  INTO v_rider_name, v_rental_amount
  FROM riders r
  WHERE r.rider_id = p_rider_id;

  IF v_rider_name IS NULL THEN
    RAISE EXCEPTION 'Rider not found with rider_id: %', p_rider_id;
  END IF;

  -- Check if there's already an active ledger for this rider
  IF EXISTS (
    SELECT 1 FROM rental_ledgers
    WHERE rider_id = p_rider_id
      AND status IN ('pending_start', 'active', 'suspended')
  ) THEN
    RAISE EXCEPTION 'Rider % already has an active rental ledger', p_rider_id;
  END IF;

  -- Get vehicle number if vehicle provided
  IF p_vehicle_id IS NOT NULL THEN
    SELECT vehicle_number INTO v_vehicle_number
    FROM vehicles
    WHERE id = p_vehicle_id;
  END IF;

  -- Create the ledger
  INSERT INTO rental_ledgers (
    rider_id,
    rider_name,
    vehicle_id,
    vehicle_number,
    rental_amount,
    status,
    created_by
  ) VALUES (
    p_rider_id,
    v_rider_name,
    p_vehicle_id,
    v_vehicle_number,
    v_rental_amount,
    'pending_start',
    p_created_by
  )
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_rental_ledger(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_rental_ledger(TEXT, UUID, UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION create_rental_ledger(TEXT, UUID, UUID) IS
'Creates a rental ledger when a rider is activated. Returns the new ledger UUID. Raises error if rider not found or already has active ledger.';
