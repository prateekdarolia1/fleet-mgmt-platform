-- ============================================================================
-- Migration: Add Battery Mapping Fields and Event History
-- Description: Domain-driven design for Battery, Vehicle, and Rider domains
-- Principles: SOLID, DRY, DDD
-- Date: 2026-01-05
-- ============================================================================

-- ============================================================================
-- DOMAIN: BATTERY AGGREGATE
-- ============================================================================

-- Add swaps_allowed_per_month to batteries table (Value Object)
-- Business Rule: Battery swap limit is a battery characteristic (0-99 per month)
ALTER TABLE public.batteries
ADD COLUMN IF NOT EXISTS swaps_allowed_per_month INTEGER
  CHECK (swaps_allowed_per_month >= 0 AND swaps_allowed_per_month <= 99)
  DEFAULT 4;

COMMENT ON COLUMN public.batteries.swaps_allowed_per_month IS
  'Domain Value Object: Number of battery swaps allowed per month (0-99). Part of Battery service agreement.';

-- ============================================================================
-- DOMAIN: VEHICLE AGGREGATE - Event Sourcing
-- ============================================================================

-- Create vehicle_events table (Event Store Pattern)
-- DDD: Captures all domain events for Vehicle aggregate
CREATE TABLE IF NOT EXISTS public.vehicle_events (
  -- Identity
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  -- Event Type (Domain Events)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATE',           -- Vehicle created
    'MAP_BATTERY',      -- Battery assigned to vehicle
    'UNMAP_BATTERY',    -- Battery removed from vehicle
    'UPDATE',           -- Vehicle details updated
    'DELETE',           -- Vehicle deleted
    'STATUS_CHANGE',    -- Status transition
    'ASSIGN_RIDER',     -- Rider assigned
    'UNASSIGN_RIDER'    -- Rider unassigned
  )),

  -- Related Aggregates (Aggregate References)
  battery_id UUID NULL REFERENCES public.batteries(id) ON DELETE SET NULL,
  rider_id UUID NULL REFERENCES public.riders(id) ON DELETE SET NULL,

  -- State Transition (Value Objects)
  previous_status TEXT NULL,
  new_status TEXT NULL,

  -- Audit Trail (DDD: Domain Event Metadata)
  reason TEXT NULL,
  performed_by TEXT NULL,
  changes JSONB NULL,

  -- Temporal
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vehicle_events IS
  'Domain Event Store: Captures all vehicle aggregate events for audit and event sourcing';

-- Indexes for Event Queries (Performance Optimization)
CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_id
  ON public.vehicle_events(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_created_at
  ON public.vehicle_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_event_type
  ON public.vehicle_events(event_type);

-- ============================================================================
-- DOMAIN: RIDER AGGREGATE - Event Sourcing
-- ============================================================================

-- Create rider_events table (Event Store Pattern)
-- DDD: Captures all domain events for Rider aggregate
CREATE TABLE IF NOT EXISTS public.rider_events (
  -- Identity
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,

  -- Event Type (Domain Events)
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATE',               -- Rider onboarded
    'UPDATE',               -- Rider details updated
    'DELETE',               -- Rider deboarded
    'STATUS_CHANGE',        -- Rider status changed (active/inactive)
    'DUTY_STATUS_CHANGE',   -- Duty status changed (LIVE/IDLE)
    'ASSIGN_VEHICLE',       -- Vehicle assigned to rider
    'UNASSIGN_VEHICLE'      -- Vehicle unassigned from rider
  )),

  -- Related Aggregates (Aggregate References)
  vehicle_id UUID NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- State Transitions (Value Objects)
  previous_status TEXT NULL,
  new_status TEXT NULL,
  previous_duty_status TEXT NULL,
  new_duty_status TEXT NULL,

  -- Audit Trail (DDD: Domain Event Metadata)
  reason TEXT NULL,
  performed_by TEXT NULL,
  changes JSONB NULL,

  -- Temporal
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rider_events IS
  'Domain Event Store: Captures all rider aggregate events for audit and event sourcing';

-- Indexes for Event Queries (Performance Optimization)
CREATE INDEX IF NOT EXISTS idx_rider_events_rider_id
  ON public.rider_events(rider_id);

CREATE INDEX IF NOT EXISTS idx_rider_events_created_at
  ON public.rider_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rider_events_event_type
  ON public.rider_events(event_type);

-- ============================================================================
-- SECURITY: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on event tables
ALTER TABLE public.vehicle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Read access for everyone (public dashboard)
CREATE POLICY "vehicle_events_select_policy"
  ON public.vehicle_events
  FOR SELECT
  USING (true);

CREATE POLICY "rider_events_select_policy"
  ON public.rider_events
  FOR SELECT
  USING (true);

-- RLS Policy: Write access for all (app creates events)
CREATE POLICY "vehicle_events_insert_policy"
  ON public.vehicle_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "rider_events_insert_policy"
  ON public.rider_events
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- DOMAIN SERVICE: Battery-Vehicle Mapping (Updated)
-- ============================================================================

-- Drop existing function to recreate with new signature
DROP FUNCTION IF EXISTS map_battery(UUID, UUID, TEXT);

-- Domain Service: Map Battery to Vehicle (Aggregate Coordination)
-- SOLID: Single Responsibility - Coordinates Battery and Vehicle aggregates
-- DDD: Domain Service that enforces business rules across aggregates
CREATE OR REPLACE FUNCTION map_battery(
  p_battery_id UUID,
  p_vehicle_id UUID,
  p_battery_smart_id TEXT,
  p_swaps_allowed_per_month INTEGER,
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

  -- Update Battery Aggregate State
  UPDATE batteries
  SET
    status = 'MAPPED',
    vehicle_id = p_vehicle_id,
    swaps_allowed_per_month = p_swaps_allowed_per_month,
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

  -- Battery Domain Event
  INSERT INTO battery_events (battery_id, event_type, vehicle_id, performed_by)
  VALUES (p_battery_id, 'MAP', p_vehicle_id, p_user_id);

  -- Vehicle Domain Event
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
  'Domain Service: Coordinates battery-vehicle mapping across aggregates with business rule validation';

-- ============================================================================
-- DOMAIN SERVICE: Vehicle Status Update (Updated Business Rules)
-- ============================================================================

-- Drop existing function to recreate with updated business rules
DROP FUNCTION IF EXISTS update_vehicle_status(UUID, TEXT, TEXT);

-- Domain Service: Update Vehicle Status
-- SOLID: Single Responsibility - Manages vehicle status transitions
-- DDD: Enforces domain invariants and business rules
CREATE OR REPLACE FUNCTION update_vehicle_status(
  p_vehicle_id UUID,
  p_new_status TEXT,
  p_user_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
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

  -- Business Rule Change: "Ready for Deployment" NO LONGER requires battery
  -- Business Rule: "Deployed" REQUIRES battery
  IF p_new_status = 'Deployed' AND v_vehicle.battery_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MISSING_BATTERY',
      'message', 'Vehicle cannot be deployed without a battery assigned. Please map a battery first.'
    );
  END IF;

  -- Update Vehicle Status
  UPDATE vehicles
  SET
    status = p_new_status::vehicle_status,
    updated_at = now()
  WHERE id = p_vehicle_id;

  -- Publish Domain Event (Event Sourcing)
  INSERT INTO vehicle_events (
    vehicle_id,
    event_type,
    previous_status,
    new_status,
    performed_by
  )
  VALUES (
    p_vehicle_id,
    'STATUS_CHANGE',
    v_vehicle.status,
    p_new_status,
    p_user_id
  );

  -- Success Response (DTO)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Vehicle status updated successfully',
    'vehicle', jsonb_build_object(
      'id', p_vehicle_id,
      'previous_status', v_vehicle.status,
      'new_status', p_new_status
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_vehicle_status IS
  'Domain Service: Manages vehicle status transitions with updated business rules (Deployed requires battery, Ready for Deployment does not)';

-- ============================================================================
-- DATA QUALITY: Validate Existing Data
-- ============================================================================

-- Ensure all existing batteries have default swap values
UPDATE public.batteries
SET swaps_allowed_per_month = 4
WHERE swaps_allowed_per_month IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Battery mapping fields and event history added';
  RAISE NOTICE 'Domain-Driven Design principles applied:';
  RAISE NOTICE '  - Battery Domain: Added swaps_allowed_per_month value object';
  RAISE NOTICE '  - Vehicle Domain: Created vehicle_events event store';
  RAISE NOTICE '  - Rider Domain: Created rider_events event store';
  RAISE NOTICE '  - Domain Services: Updated map_battery and update_vehicle_status with new business rules';
  RAISE NOTICE 'Business Rule Changes:';
  RAISE NOTICE '  - Ready for Deployment: NO LONGER requires battery';
  RAISE NOTICE '  - Deployed: STILL requires battery';
END $$;
