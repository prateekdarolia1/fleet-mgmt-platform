-- ============================================================================
-- Migration: Move Swap Limit from Batteries to Rider Ledgers
-- Description: Refactor swaps_allowed_per_month from battery property to rider
--              service agreement property in rider_ledgers table
-- Date: 2026-01-10
-- ============================================================================

-- ============================================================================
-- PHASE 1: Add swaps_allowed_per_month to rider_ledgers table
-- ============================================================================

-- Add swaps_allowed_per_month to rider_ledgers table (Service Agreement Value Object)
-- Business Rule: Swap limit is part of the rider's rental/service agreement (0-99 per month)
ALTER TABLE public.rider_ledgers
ADD COLUMN IF NOT EXISTS swaps_allowed_per_month INTEGER
  CHECK (swaps_allowed_per_month >= 0 AND swaps_allowed_per_month <= 99)
  DEFAULT 4;

COMMENT ON COLUMN public.rider_ledgers.swaps_allowed_per_month IS
  'Service Agreement: Number of battery swaps allowed per month (0-99). Defaults based on rental_frequency: daily=2, weekly=4, monthly=8.';

-- ============================================================================
-- PHASE 2: Mark batteries.swaps_allowed_per_month as deprecated
-- ============================================================================

COMMENT ON COLUMN public.batteries.swaps_allowed_per_month IS
  'DEPRECATED: Swap limits are now managed via rider_ledgers.swaps_allowed_per_month. This column is kept for backward compatibility only.';

-- ============================================================================
-- PHASE 3: Set default values based on rental_frequency
-- ============================================================================

-- Update existing ledgers with defaults based on rental_frequency
UPDATE public.rider_ledgers
SET swaps_allowed_per_month = CASE
  WHEN rental_frequency = 'daily' THEN 2
  WHEN rental_frequency = 'weekly' THEN 4
  WHEN rental_frequency = 'monthly' THEN 8
  ELSE 4
END
WHERE swaps_allowed_per_month IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Swap limit moved to rider_ledgers';
  RAISE NOTICE '  - Added swaps_allowed_per_month to rider_ledgers table';
  RAISE NOTICE '  - Set defaults: daily=2, weekly=4, monthly=8';
  RAISE NOTICE '  - Marked batteries.swaps_allowed_per_month as DEPRECATED';
END $$;
