-- Extend the event_type CHECK constraints on vehicle_events / rider_events
-- to allow the values emitted by perform_vehicle_exchange.
-- Was missed in 20260510_simplify_swap_to_exchange.sql; the inserts inside
-- the new RPC failed with constraint violation 23514 until this was added.

ALTER TABLE public.vehicle_events DROP CONSTRAINT IF EXISTS vehicle_events_event_type_check;
ALTER TABLE public.vehicle_events ADD CONSTRAINT vehicle_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'CREATE'::text, 'MAP_BATTERY'::text, 'UNMAP_BATTERY'::text, 'UPDATE'::text, 'DELETE'::text,
    'STATUS_CHANGE'::text, 'ASSIGN_RIDER'::text, 'UNASSIGN_RIDER'::text,
    'EXCHANGE_OUT'::text, 'EXCHANGE_IN'::text
  ]));

ALTER TABLE public.rider_events DROP CONSTRAINT IF EXISTS rider_events_event_type_check;
ALTER TABLE public.rider_events ADD CONSTRAINT rider_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'CREATE'::text, 'UPDATE'::text, 'DELETE'::text,
    'STATUS_CHANGE'::text, 'DUTY_STATUS_CHANGE'::text,
    'ASSIGN_VEHICLE'::text, 'UNASSIGN_VEHICLE'::text,
    'VEHICLE_EXCHANGED'::text
  ]));
