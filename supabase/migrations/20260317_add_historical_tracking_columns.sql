-- Historical Data Management System - Migration
-- Adds point-in-time tracking columns to core tables
-- Enables retroactive data import with confidence scoring

-- ============================================================================
-- 1. ADD HISTORICAL TRACKING COLUMNS TO RIDERS TABLE
-- ============================================================================

ALTER TABLE riders ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE riders ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE riders SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comment
COMMENT ON COLUMN riders.effective_start_date IS 'When this entity state became effective';
COMMENT ON COLUMN riders.effective_end_date IS 'When this entity state ended (NULL = current)';
COMMENT ON COLUMN riders.is_historical_import IS 'Flag for retroactively imported data';
COMMENT ON COLUMN riders.data_source IS 'Origin: PLATFORM, CL87_CSV, PAYMENT_RECORDS_CSV, etc';
COMMENT ON COLUMN riders.import_batch_id IS 'Link to data_import_batches table';
COMMENT ON COLUMN riders.confidence_score IS 'Data quality score 0.00-1.00';

-- ============================================================================
-- 2. ADD HISTORICAL TRACKING COLUMNS TO VEHICLES TABLE
-- ============================================================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE vehicles SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comments
COMMENT ON COLUMN vehicles.effective_start_date IS 'When this entity state became effective';
COMMENT ON COLUMN vehicles.effective_end_date IS 'When this entity state ended (NULL = current)';
COMMENT ON COLUMN vehicles.is_historical_import IS 'Flag for retroactively imported data';
COMMENT ON COLUMN vehicles.data_source IS 'Origin: PLATFORM, CL87_CSV, etc';
COMMENT ON COLUMN vehicles.import_batch_id IS 'Link to data_import_batches table';
COMMENT ON COLUMN vehicles.confidence_score IS 'Data quality score 0.00-1.00';

-- ============================================================================
-- 3. ADD HISTORICAL TRACKING COLUMNS TO BATTERIES TABLE
-- ============================================================================

ALTER TABLE batteries ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE batteries ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;
ALTER TABLE batteries ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE batteries ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE batteries ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE batteries ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE batteries SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comments
COMMENT ON COLUMN batteries.effective_start_date IS 'When this entity state became effective';
COMMENT ON COLUMN batteries.effective_end_date IS 'When this entity state ended (NULL = current)';
COMMENT ON COLUMN batteries.is_historical_import IS 'Flag for retroactively imported data';
COMMENT ON COLUMN batteries.data_source IS 'Origin: PLATFORM, BATTERY_SMART_EXPORT, etc';
COMMENT ON COLUMN batteries.import_batch_id IS 'Link to data_import_batches table';
COMMENT ON COLUMN batteries.confidence_score IS 'Data quality score 0.00-1.00';

-- ============================================================================
-- 4. ADD HISTORICAL TRACKING COLUMNS TO PAYMENTS TABLE
-- ============================================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE payments SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comments
COMMENT ON COLUMN payments.effective_start_date IS 'When this entity state became effective';
COMMENT ON COLUMN payments.effective_end_date IS 'When this entity state ended (NULL = current)';
COMMENT ON COLUMN payments.is_historical_import IS 'Flag for retroactively imported data';
COMMENT ON COLUMN payments.data_source IS 'Origin: PLATFORM, PAYMENT_RECORDS_CSV, etc';
COMMENT ON COLUMN payments.import_batch_id IS 'Link to data_import_batches table';
COMMENT ON COLUMN payments.confidence_score IS 'Data quality score 0.00-1.00';

-- ============================================================================
-- 5. ADD HISTORICAL TRACKING COLUMNS TO RENTAL_LEDGERS TABLE
-- ============================================================================

ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS effective_start_date TIMESTAMPTZ;
ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS effective_end_date TIMESTAMPTZ;
ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE rental_ledgers ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE rental_ledgers SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Add comments
COMMENT ON COLUMN rental_ledgers.effective_start_date IS 'When this entity state became effective';
COMMENT ON COLUMN rental_ledgers.effective_end_date IS 'When this entity state ended (NULL = current)';
COMMENT ON COLUMN rental_ledgers.is_historical_import IS 'Flag for retroactively imported data';
COMMENT ON COLUMN rental_ledgers.data_source IS 'Origin: PLATFORM, CL87_CSV, etc';
COMMENT ON COLUMN rental_ledgers.import_batch_id IS 'Link to data_import_batches table';
COMMENT ON COLUMN rental_ledgers.confidence_score IS 'Data quality score 0.00-1.00';

-- ============================================================================
-- 6. CREATE INDEXES FOR POINT-IN-TIME QUERIES
-- ============================================================================

-- Indexes for riders
CREATE INDEX IF NOT EXISTS idx_riders_effective_dates ON riders(rider_id, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_riders_import_batch ON riders(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_riders_historical ON riders(is_historical_import) WHERE is_historical_import = TRUE;

-- Indexes for vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_effective_dates ON vehicles(vehicle_number, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_import_batch ON vehicles(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_historical ON vehicles(is_historical_import) WHERE is_historical_import = TRUE;

-- Indexes for batteries
CREATE INDEX IF NOT EXISTS idx_batteries_effective_dates ON batteries(battery_id, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_batteries_import_batch ON batteries(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batteries_historical ON batteries(is_historical_import) WHERE is_historical_import = TRUE;

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_effective_dates ON payments(payment_id, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_payments_import_batch ON payments(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_historical ON payments(is_historical_import) WHERE is_historical_import = TRUE;

-- Indexes for rental_ledgers
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_effective_dates ON rental_ledgers(id, effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_import_batch ON rental_ledgers(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_historical ON rental_ledgers(is_historical_import) WHERE is_historical_import = TRUE;
