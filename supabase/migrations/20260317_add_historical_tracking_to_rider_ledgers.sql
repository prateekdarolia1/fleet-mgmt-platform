-- Add historical tracking columns to rider_ledgers table
-- This is for the CreateLedgerForm retroactive entry feature

ALTER TABLE rider_ledgers ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;
ALTER TABLE rider_ledgers ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE rider_ledgers ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;
ALTER TABLE rider_ledgers ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE rider_ledgers ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;

-- Set effective_start_date for existing records
UPDATE rider_ledgers SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comments
COMMENT ON COLUMN rider_ledgers.is_historical IS 'Flag for retroactively entered data';
COMMENT ON COLUMN rider_ledgers.data_source IS 'Origin: PLATFORM, MANUAL_ENTRY, etc';
COMMENT ON COLUMN rider_ledgers.confidence_score IS 'Data quality score 0.00-1.00';
COMMENT ON COLUMN rider_ledgers.effective_start_date IS 'When this ledger became effective';
COMMENT ON COLUMN rider_ledgers.effective_end_date IS 'When this ledger ended (NULL = current)';

-- Create index
CREATE INDEX IF NOT EXISTS idx_rider_ledgers_historical ON rider_ledgers(is_historical) WHERE is_historical = TRUE;
