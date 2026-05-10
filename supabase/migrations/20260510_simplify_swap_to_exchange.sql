-- Simplify the swap workflow to a permanent vehicle exchange.
--
-- Reality on the ground: when a rider's bike breaks, the "temp" replacement almost
-- always becomes their new permanent bike. The return path was rarely (never) taken
-- and produced corruption when operators flipped statuses outside the RPCs.
--
-- This migration:
--   1. Force-resolves the 2 currently-open swaps as permanent reassignments
--      (whoever's on the temp keeps it; rental_ledgers.vehicle_id follows).
--   2. Drops riders.original_vehicle_assigned and riders.swapped_at.
--   3. Drops perform_vehicle_swap, perform_swap_return, perform_swap_abort.
--   4. Creates perform_vehicle_exchange — atomic permanent reassignment that also
--      updates the active rental ledger and emits vehicle_events + rider_events.

-- 1. Force-resolve open swaps -----------------------------------------------
-- Point each rider's active rental_ledger at the vehicle they're now on.
UPDATE public.rental_ledgers rl
   SET vehicle_id = v.id
  FROM public.riders r
  JOIN public.vehicles v ON v.vehicle_number = r.vehicle_assigned
 WHERE rl.rider_id = r.rider_id
   AND rl.status = 'active'
   AND r.original_vehicle_assigned IS NOT NULL;

UPDATE public.riders
   SET original_vehicle_assigned = NULL,
       swapped_at = NULL,
       updated_at = NOW()
 WHERE original_vehicle_assigned IS NOT NULL;

-- 2. Drop swap-tracking columns ---------------------------------------------
ALTER TABLE public.riders DROP COLUMN IF EXISTS original_vehicle_assigned;
ALTER TABLE public.riders DROP COLUMN IF EXISTS swapped_at;

-- 3. Drop the old swap RPCs --------------------------------------------------
DROP FUNCTION IF EXISTS public.perform_vehicle_swap(UUID, UUID);
DROP FUNCTION IF EXISTS public.perform_swap_return(UUID);
DROP FUNCTION IF EXISTS public.perform_swap_abort(UUID);

-- 4. New exchange RPC --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perform_vehicle_exchange(
  p_rider_id UUID,
  p_new_vehicle_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider RECORD;
  v_old_vehicle RECORD;
  v_new_vehicle RECORD;
BEGIN
  SELECT id, rider_id, name, status, vehicle_assigned
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

  IF v_rider.vehicle_assigned IS NULL THEN
    RAISE EXCEPTION 'Rider % has no vehicle assigned — cannot exchange', v_rider.rider_id;
  END IF;

  SELECT id, vehicle_number, status
    INTO v_old_vehicle
  FROM public.vehicles
  WHERE vehicle_number = v_rider.vehicle_assigned
  FOR UPDATE;

  IF v_old_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'Current vehicle % not found', v_rider.vehicle_assigned;
  END IF;

  SELECT v.id, v.vehicle_number, v.status, v.rider_id, b.id AS battery_uuid
    INTO v_new_vehicle
  FROM public.vehicles v
  LEFT JOIN public.batteries b ON b.vehicle_id = v.id
  WHERE v.id = p_new_vehicle_id
  FOR UPDATE OF v;

  IF v_new_vehicle.id IS NULL THEN
    RAISE EXCEPTION 'New vehicle not found: %', p_new_vehicle_id;
  END IF;

  IF v_new_vehicle.id = v_old_vehicle.id THEN
    RAISE EXCEPTION 'New vehicle must be different from current vehicle';
  END IF;

  IF v_new_vehicle.status <> 'Ready for Deployment' THEN
    RAISE EXCEPTION 'New vehicle % is not Ready for Deployment (status=%)',
      v_new_vehicle.vehicle_number, v_new_vehicle.status;
  END IF;

  IF v_new_vehicle.battery_uuid IS NULL THEN
    RAISE EXCEPTION 'New vehicle % has no battery mapped', v_new_vehicle.vehicle_number;
  END IF;

  IF v_new_vehicle.rider_id IS NOT NULL THEN
    RAISE EXCEPTION 'New vehicle % is already assigned to rider %',
      v_new_vehicle.vehicle_number, v_new_vehicle.rider_id;
  END IF;

  UPDATE public.vehicles
     SET status = 'Under Maintenance',
         rider_id = NULL,
         rider_name = NULL,
         updated_at = NOW()
   WHERE id = v_old_vehicle.id;

  UPDATE public.vehicles
     SET status = 'Deployed',
         rider_id = v_rider.rider_id,
         rider_name = v_rider.name,
         updated_at = NOW()
   WHERE id = v_new_vehicle.id;

  UPDATE public.riders
     SET vehicle_assigned = v_new_vehicle.vehicle_number,
         updated_at = NOW()
   WHERE id = v_rider.id;

  UPDATE public.rental_ledgers
     SET vehicle_id = v_new_vehicle.id
   WHERE rider_id = v_rider.rider_id
     AND status = 'active';

  INSERT INTO public.vehicle_events
    (vehicle_id, event_type, rider_id, previous_status, new_status, changes)
  VALUES (
    v_old_vehicle.id,
    'EXCHANGE_OUT',
    v_rider.id,
    v_old_vehicle.status,
    'Under Maintenance',
    jsonb_build_object(
      'rider_code', v_rider.rider_id,
      'rider_name', v_rider.name,
      'old_vehicle', v_old_vehicle.vehicle_number,
      'new_vehicle', v_new_vehicle.vehicle_number
    )
  );

  INSERT INTO public.vehicle_events
    (vehicle_id, event_type, rider_id, previous_status, new_status, changes)
  VALUES (
    v_new_vehicle.id,
    'EXCHANGE_IN',
    v_rider.id,
    v_new_vehicle.status,
    'Deployed',
    jsonb_build_object(
      'rider_code', v_rider.rider_id,
      'rider_name', v_rider.name,
      'old_vehicle', v_old_vehicle.vehicle_number,
      'new_vehicle', v_new_vehicle.vehicle_number
    )
  );

  INSERT INTO public.rider_events
    (rider_id, event_type, vehicle_id, changes)
  VALUES (
    v_rider.id,
    'VEHICLE_EXCHANGED',
    v_new_vehicle.id,
    jsonb_build_object(
      'old_vehicle_id', v_old_vehicle.id,
      'old_vehicle_number', v_old_vehicle.vehicle_number,
      'new_vehicle_id', v_new_vehicle.id,
      'new_vehicle_number', v_new_vehicle.vehicle_number
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_vehicle_exchange(UUID, UUID) TO authenticated, service_role;
