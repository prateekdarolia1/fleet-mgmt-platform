-- ============================================================================
-- Migration: Add battery_events table and map_battery RPC
-- Date: 2026-04-17
--
-- What this does:
--   1. Creates battery_event_type enum
--   2. Creates battery_events table (battery_id as UUID FK to batteries.id)
--   3. Adds RLS policies + indexes
--   4. Drops old map_battery variants and creates the current 4-param version
-- ============================================================================


-- ============================================================================
-- STEP 1: Enum
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE battery_event_type AS ENUM ('CREATE', 'MAP', 'UNMAP', 'UPDATE', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already exists, skip
END $$;


-- ============================================================================
-- STEP 2: vehicle_events table (if not already deployed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_events (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id       UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN (
                     'CREATE', 'MAP_BATTERY', 'UNMAP_BATTERY', 'UPDATE',
                     'DELETE', 'STATUS_CHANGE', 'ASSIGN_RIDER', 'UNASSIGN_RIDER'
                   )),
  battery_id       UUID NULL REFERENCES public.batteries(id) ON DELETE SET NULL,
  rider_id         UUID NULL REFERENCES public.riders(id) ON DELETE SET NULL,
  previous_status  TEXT NULL,
  new_status       TEXT NULL,
  reason           TEXT NULL,
  performed_by     TEXT NULL,
  changes          JSONB NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_id
  ON public.vehicle_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_created_at
  ON public.vehicle_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_event_type
  ON public.vehicle_events(event_type);

ALTER TABLE public.vehicle_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "vehicle_events_select_policy"
    ON public.vehicle_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "vehicle_events_insert_policy"
    ON public.vehicle_events FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- STEP 3: rider_events table (if not already deployed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rider_events (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id              UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL CHECK (event_type IN (
                          'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
                          'DUTY_STATUS_CHANGE', 'ASSIGN_VEHICLE', 'UNASSIGN_VEHICLE'
                        )),
  vehicle_id            UUID NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,
  previous_status       TEXT NULL,
  new_status            TEXT NULL,
  previous_duty_status  TEXT NULL,
  new_duty_status       TEXT NULL,
  reason                TEXT NULL,
  performed_by          TEXT NULL,
  changes               JSONB NULL,
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_events_rider_id
  ON public.rider_events(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_events_created_at
  ON public.rider_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rider_events_event_type
  ON public.rider_events(event_type);

ALTER TABLE public.rider_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "rider_events_select_policy"
    ON public.rider_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "rider_events_insert_policy"
    ON public.rider_events FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- STEP 4: battery_events table
-- Note: battery_id is UUID FK to batteries.id (NOT batteries.battery_id)
--       because the map_battery RPC receives the UUID primary key.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.battery_events (
  id                 UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battery_id         UUID                 NOT NULL REFERENCES public.batteries(id) ON DELETE CASCADE,
  event_type         battery_event_type   NOT NULL,
  vehicle_id         UUID                 NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,
  previous_vehicle_id UUID               NULL,
  reason             TEXT                 NULL,
  performed_by       TEXT                 NULL,
  changes            JSONB                NULL,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.battery_events IS
  'Audit log for battery lifecycle events: CREATE, MAP, UNMAP, UPDATE, DELETE';
COMMENT ON COLUMN public.battery_events.battery_id IS
  'UUID FK to batteries.id (primary key of battery record)';
COMMENT ON COLUMN public.battery_events.vehicle_id IS
  'Vehicle this battery was mapped to / unmapped from';
COMMENT ON COLUMN public.battery_events.previous_vehicle_id IS
  'Previous vehicle for MAP/UNMAP transitions';


-- ============================================================================
-- STEP 5: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_battery_events_battery_id
  ON public.battery_events(battery_id);

CREATE INDEX IF NOT EXISTS idx_battery_events_event_type
  ON public.battery_events(event_type);

CREATE INDEX IF NOT EXISTS idx_battery_events_vehicle_id
  ON public.battery_events(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_battery_events_created_at
  ON public.battery_events(created_at DESC);


-- ============================================================================
-- STEP 6: RLS — open policies (consistent with vehicle_events/rider_events)
-- ============================================================================

ALTER TABLE public.battery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "battery_events_select_policy"
  ON public.battery_events FOR SELECT USING (true);

CREATE POLICY "battery_events_insert_policy"
  ON public.battery_events FOR INSERT WITH CHECK (true);


-- ============================================================================
-- STEP 5: map_battery RPC (4-param version)
-- Drops all older signatures before creating the current one.
-- ============================================================================

-- Drop old 3-param version (from create_map_battery_rpc.sql)
DROP FUNCTION IF EXISTS public.map_battery(UUID, UUID, TEXT);

-- Drop old 5-param version (had p_swaps_allowed_per_month)
DROP FUNCTION IF EXISTS public.map_battery(UUID, UUID, TEXT, INTEGER, TEXT);

-- Drop current 4-param version so we can recreate cleanly
DROP FUNCTION IF EXISTS public.map_battery(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.map_battery(
  p_battery_id        UUID,
  p_vehicle_id        UUID,
  p_battery_smart_id  TEXT,
  p_user_id           TEXT
) RETURNS JSONB AS $$
DECLARE
  v_battery RECORD;
  v_vehicle RECORD;
BEGIN

  -- Lock battery row
  SELECT * INTO v_battery
  FROM public.batteries
  WHERE id = p_battery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'BATTERY_NOT_FOUND',
      'message', 'Battery not found'
    );
  END IF;

  -- Only ACTIVE or UNMAPPED batteries can be mapped
  IF v_battery.status NOT IN ('ACTIVE', 'UNMAPPED') THEN
    RETURN jsonb_build_object(
      'success',        false,
      'error',          'INVALID_BATTERY_STATUS',
      'message',        'Battery must be ACTIVE or UNMAPPED to map',
      'current_status', v_battery.status
    );
  END IF;

  -- Battery must not already be mapped to another vehicle
  IF v_battery.vehicle_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'BATTERY_ALREADY_MAPPED',
      'message', 'Battery is already mapped to another vehicle'
    );
  END IF;

  -- Lock vehicle row
  SELECT * INTO v_vehicle
  FROM public.vehicles
  WHERE id = p_vehicle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'VEHICLE_NOT_FOUND',
      'message', 'Vehicle not found'
    );
  END IF;

  -- Vehicle must not already have a battery
  IF v_vehicle.battery_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'VEHICLE_ALREADY_HAS_BATTERY',
      'message', 'Vehicle already has a battery assigned'
    );
  END IF;

  -- Update battery
  UPDATE public.batteries
  SET
    status     = 'MAPPED',
    vehicle_id = p_vehicle_id,
    updated_at = now()
  WHERE id = p_battery_id;

  -- Update vehicle
  UPDATE public.vehicles
  SET
    battery_id      = p_battery_id,
    battery_smart_id = p_battery_smart_id,
    updated_at      = now()
  WHERE id = p_vehicle_id;

  -- Log battery event
  INSERT INTO public.battery_events (battery_id, event_type, vehicle_id, performed_by)
  VALUES (p_battery_id, 'MAP', p_vehicle_id, p_user_id);

  -- Log vehicle event
  INSERT INTO public.vehicle_events (vehicle_id, event_type, battery_id, performed_by)
  VALUES (p_vehicle_id, 'MAP_BATTERY', p_battery_id, p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Battery mapped successfully',
    'battery', jsonb_build_object(
      'id',         p_battery_id,
      'battery_id', v_battery.battery_id,
      'status',     'MAPPED'
    ),
    'vehicle', jsonb_build_object(
      'id',             p_vehicle_id,
      'vehicle_number', v_vehicle.vehicle_number
    )
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.map_battery IS
  'Atomically maps a battery to a vehicle. Validates status, locks both rows, updates both tables, logs events.';


-- ============================================================================
-- DONE
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Migration complete: battery_events table created, map_battery RPC deployed';
END $$;
