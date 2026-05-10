-- riders.name and vehicles.vehicle_number are denormalized into multiple child
-- tables (payments, rental_ledgers, rider_ledgers, vehicles, etc.). Updating
-- the source row used to leave those copies stale, breaking detail popups.
--
-- This migration:
--   1. Backfills stale copies from the source rows.
--   2. Adds AFTER UPDATE triggers that propagate future name / vehicle_number
--      changes to every denormalized copy.

UPDATE public.payments p        SET rider_name = r.name FROM public.riders r WHERE p.rider_id = r.rider_id        AND p.rider_name        IS DISTINCT FROM r.name;
UPDATE public.rental_ledgers rl SET rider_name = r.name FROM public.riders r WHERE rl.rider_id = r.rider_id      AND rl.rider_name       IS DISTINCT FROM r.name;
UPDATE public.rider_ledgers  rl SET rider_name = r.name FROM public.riders r WHERE rl.rider_id = r.rider_id      AND rl.rider_name       IS DISTINCT FROM r.name;
UPDATE public.vehicles v        SET rider_name = r.name FROM public.riders r WHERE v.rider_id = r.rider_id        AND v.rider_name        IS DISTINCT FROM r.name;

UPDATE public.rental_ledgers rl
   SET vehicle_number = v.vehicle_number
  FROM public.vehicles v
 WHERE v.id = rl.vehicle_id
   AND rl.vehicle_number IS DISTINCT FROM v.vehicle_number;

CREATE OR REPLACE FUNCTION public.sync_rider_name_to_copies()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.payments        SET rider_name = NEW.name WHERE rider_id = NEW.rider_id;
    UPDATE public.rental_ledgers  SET rider_name = NEW.name WHERE rider_id = NEW.rider_id;
    UPDATE public.rider_ledgers   SET rider_name = NEW.name WHERE rider_id = NEW.rider_id;
    UPDATE public.vehicles        SET rider_name = NEW.name WHERE rider_id = NEW.rider_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS riders_sync_name_to_copies ON public.riders;
CREATE TRIGGER riders_sync_name_to_copies
AFTER UPDATE OF name ON public.riders
FOR EACH ROW
EXECUTE FUNCTION public.sync_rider_name_to_copies();

CREATE OR REPLACE FUNCTION public.sync_vehicle_number_to_copies()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.vehicle_number IS DISTINCT FROM OLD.vehicle_number THEN
    UPDATE public.rental_ledgers SET vehicle_number = NEW.vehicle_number WHERE vehicle_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vehicles_sync_number_to_copies ON public.vehicles;
CREATE TRIGGER vehicles_sync_number_to_copies
AFTER UPDATE OF vehicle_number ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.sync_vehicle_number_to_copies();
