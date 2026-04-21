-- Add Mooving and Sun Mobility to service_provider enum
ALTER TYPE service_provider ADD VALUE IF NOT EXISTS 'MOOVING';
ALTER TYPE service_provider ADD VALUE IF NOT EXISTS 'SUN_MOBILITY';
