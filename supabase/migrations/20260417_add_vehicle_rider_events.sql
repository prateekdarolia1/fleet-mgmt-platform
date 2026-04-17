-- ============================================================================
-- Migration: Add vehicle_events and rider_events tables
-- Date: 2026-04-17
-- Run this after 20260417_add_battery_events_and_map_battery_rpc.sql
-- ============================================================================


-- ============================================================================
-- vehicle_events
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
-- rider_events
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
-- DONE
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Migration complete: vehicle_events and rider_events tables created';
END $$;
