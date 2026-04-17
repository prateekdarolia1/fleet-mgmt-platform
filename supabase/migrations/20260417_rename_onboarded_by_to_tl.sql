-- ============================================================================
-- Migration: Rename onboarded_by values from SHUBHAM/VAIBHAV to TL1/TL2
-- Date: 2026-04-17
-- ============================================================================

-- Drop existing CHECK constraint on onboarded_by (name is auto-generated, so look it up)
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.riders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%onboarded_by%'
  LOOP
    EXECUTE 'ALTER TABLE public.riders DROP CONSTRAINT ' || quote_ident(con_name);
  END LOOP;
END $$;

-- Migrate existing data
UPDATE public.riders SET onboarded_by = 'TL1' WHERE onboarded_by = 'SHUBHAM';
UPDATE public.riders SET onboarded_by = 'TL2' WHERE onboarded_by = 'VAIBHAV';

-- Add new CHECK constraint: allow NULL or TL1/TL2
ALTER TABLE public.riders
  ADD CONSTRAINT riders_onboarded_by_check
  CHECK (onboarded_by IS NULL OR onboarded_by IN ('TL1', 'TL2'));

DO $$ BEGIN
  RAISE NOTICE 'Migration complete: onboarded_by values migrated to TL1/TL2';
END $$;
