-- Vehicle Swap feature
-- Adds two columns on riders to track an in-flight swap, plus three RPCs:
--   perform_vehicle_swap   — swap rider onto a temp vehicle (original → Under Maintenance)
--   perform_swap_return    — happy path: original vehicle is fixed, return temp and put rider back on original
--   perform_swap_abort     — cleanup path: rider is leaving (deactivation) while swap is open

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS original_vehicle_assigned TEXT,
  ADD COLUMN IF NOT EXISTS swapped_at TIMESTAMPTZ;

COMMENT ON COLUMN public.riders.original_vehicle_assigned IS
  'When a swap is open, holds the vehicle_number of the rider''s real (broken) vehicle. NULL when no swap.';
COMMENT ON COLUMN public.riders.swapped_at IS
  'Timestamp when current swap began. NULL when no swap.';


CREATE OR REPLACE FUNCTION perform_vehicle_swap(
  p_rider_id UUID,
  p_temp_vehicle_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider RECORD;
  v_original_vehicle RECORD;
  v_temp_vehicle RECORD;
BEGIN
  SELECT id, rider_id, name, status, vehicle_assigned, original_vehicle_assigned
    INTO v_rider
  FROM public.riders
  WHERE id = p_rider_id
  FOR UPDATE;

  IF v_rider.id IS NULL THEN
    RAISE EXCEPTION 'Rider not found: %', p_rider_id;
  END IF;

  IF v_rider.status <> 'active' THEN
    RAISE EXCEPTION 'Rider % is not active (status=%)', v_rider.rider_id, v_rider.status;
  END IF;

  IF v_rider.original_vehicle_assigned IS NOT NULL THEN
    RAISE EXCEPTION 'Rider % already has an open swap (original vehicle: %)',
      v_rider.rider_id, v_rider.original_vehicle_assigned;
  END IF;

  IF v_rider.vehicle_assigned IS NULL THEN
    RAISE EXCEPTION 'Rider % has no vehicle assigned — cannot swap', v_rider.rider_id;
  END IF;

  SELECT id, vehicle_number, status, rider_id
    INTO v_original_vehicle
  FROM public.vehicles
  WHERE vehicle_number = v_rider.vehicle_assigned
  FOR UPDATE;

  IF v_original_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Original vehicle % not found', v_rider.vehicle_assigned;
  END IF;

  SELECT v.id, v.vehicle_number, v.status, v.rider_id, b.id AS battery_uuid
    INTO v_temp_vehicle
  FROM public.vehicles v
  LEFT JOIN public.batteries b ON b.vehicle_id = v.id
  WHERE v.id = p_temp_vehicle_id
  FOR UPDATE OF v;

  IF v_temp_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Temp vehicle not found: %', p_temp_vehicle_id;
  END IF;

  IF v_temp_vehicle.id = v_original_vehicle.id THEN
    RAISE EXCEPTION 'Temp vehicle must be different from current vehicle';
  END IF;

  IF v_temp_vehicle.status <> 'Ready for Deployment' THEN
    RAISE EXCEPTION 'Temp vehicle % is not Ready for Deployment (status=%)',
      v_temp_vehicle.vehicle_number, v_temp_vehicle.status;
  END IF;

  IF v_temp_vehicle.battery_uuid IS NULL THEN
    RAISE EXCEPTION 'Temp vehicle % has no battery mapped', v_temp_vehicle.vehicle_number;
  END IF;

  IF v_temp_vehicle.rider_id IS NOT NULL THEN
    RAISE EXCEPTION 'Temp vehicle % is already assigned to rider %',
      v_temp_vehicle.vehicle_number, v_temp_vehicle.rider_id;
  END IF;

  UPDATE public.vehicles
     SET status = 'Under Maintenance',
         rider_id = NULL,
         rider_name = NULL,
         updated_at = NOW()
   WHERE id = v_original_vehicle.id;

  UPDATE public.vehicles
     SET status = 'Deployed',
         rider_id = v_rider.rider_id,
         rider_name = v_rider.name,
         updated_at = NOW()
   WHERE id = v_temp_vehicle.id;

  UPDATE public.riders
     SET vehicle_assigned = v_temp_vehicle.vehicle_number,
         original_vehicle_assigned = v_original_vehicle.vehicle_number,
         swapped_at = NOW(),
         updated_at = NOW()
   WHERE id = v_rider.id;
END;
$$;


CREATE OR REPLACE FUNCTION perform_swap_return(
  p_rider_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider RECORD;
  v_temp_vehicle RECORD;
  v_original_vehicle RECORD;
BEGIN
  SELECT id, rider_id, name, vehicle_assigned, original_vehicle_assigned
    INTO v_rider
  FROM public.riders
  WHERE id = p_rider_id
  FOR UPDATE;

  IF v_rider.id IS NULL THEN
    RAISE EXCEPTION 'Rider not found: %', p_rider_id;
  END IF;

  IF v_rider.original_vehicle_assigned IS NULL THEN
    RAISE EXCEPTION 'Rider % has no open swap', v_rider.rider_id;
  END IF;

  SELECT id, vehicle_number
    INTO v_temp_vehicle
  FROM public.vehicles
  WHERE vehicle_number = v_rider.vehicle_assigned
  FOR UPDATE;

  SELECT id, vehicle_number
    INTO v_original_vehicle
  FROM public.vehicles
  WHERE vehicle_number = v_rider.original_vehicle_assigned
  FOR UPDATE;

  IF v_temp_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Temp vehicle % not found', v_rider.vehicle_assigned;
  END IF;

  IF v_original_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Original vehicle % not found', v_rider.original_vehicle_assigned;
  END IF;

  UPDATE public.vehicles
     SET status = 'Ready for Deployment',
         rider_id = NULL,
         rider_name = NULL,
         updated_at = NOW()
   WHERE id = v_temp_vehicle.id;

  UPDATE public.vehicles
     SET status = 'Deployed',
         rider_id = v_rider.rider_id,
         rider_name = v_rider.name,
         updated_at = NOW()
   WHERE id = v_original_vehicle.id;

  UPDATE public.riders
     SET vehicle_assigned = v_original_vehicle.vehicle_number,
         original_vehicle_assigned = NULL,
         swapped_at = NULL,
         updated_at = NOW()
   WHERE id = v_rider.id;
END;
$$;


-- Cleanup path: rider is being deactivated while a swap is open.
-- Temp vehicle returns to Ready for Deployment, original vehicle stays Under Maintenance
-- (it's not actually fixed), and the rider is fully unassigned.
CREATE OR REPLACE FUNCTION perform_swap_abort(
  p_rider_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider RECORD;
  v_temp_vehicle RECORD;
BEGIN
  SELECT id, rider_id, vehicle_assigned, original_vehicle_assigned
    INTO v_rider
  FROM public.riders
  WHERE id = p_rider_id
  FOR UPDATE;

  IF v_rider.id IS NULL THEN
    RAISE EXCEPTION 'Rider not found: %', p_rider_id;
  END IF;

  IF v_rider.original_vehicle_assigned IS NULL THEN
    RAISE EXCEPTION 'Rider % has no open swap to abort', v_rider.rider_id;
  END IF;

  SELECT id INTO v_temp_vehicle
  FROM public.vehicles
  WHERE vehicle_number = v_rider.vehicle_assigned
  FOR UPDATE;

  IF v_temp_vehicle.id IS NOT NULL THEN
    UPDATE public.vehicles
       SET status = 'Ready for Deployment',
           rider_id = NULL,
           rider_name = NULL,
           updated_at = NOW()
     WHERE id = v_temp_vehicle.id;
  END IF;

  UPDATE public.riders
     SET vehicle_assigned = NULL,
         original_vehicle_assigned = NULL,
         swapped_at = NULL,
         updated_at = NOW()
   WHERE id = v_rider.id;
END;
$$;


GRANT EXECUTE ON FUNCTION perform_vehicle_swap(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION perform_swap_return(UUID)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION perform_swap_abort(UUID)         TO authenticated, service_role;
