-- Historical Data Management System - New Tables
-- Creates data_import_batches and retroactive_events tables
-- Enables tracking of historical imports and timeline reconstruction

-- ============================================================================
-- 1. DATA_IMPORT_BATCHES TABLE
-- Tracks each import operation with statistics and metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    import_date TIMESTAMPTZ DEFAULT NOW(),
    data_period_start DATE,
    data_period_end DATE,
    records_total INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_skipped INT DEFAULT 0,
    defaults_applied JSONB DEFAULT '{}',
    warnings JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    imported_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE data_import_batches IS 'Tracks all historical data import operations';
COMMENT ON COLUMN data_import_batches.batch_name IS 'Human-readable name for the import batch';
COMMENT ON COLUMN data_import_batches.source_file IS 'Original file name or path';
COMMENT ON COLUMN data_import_batches.import_date IS 'When the import was executed';
COMMENT ON COLUMN data_import_batches.data_period_start IS 'Earliest date covered by imported data';
COMMENT ON COLUMN data_import_batches.data_period_end IS 'Latest date covered by imported data';
COMMENT ON COLUMN data_import_batches.defaults_applied IS 'JSON object mapping field names to default values used';
COMMENT ON COLUMN data_import_batches.warnings IS 'JSON array of warning messages encountered during import';
COMMENT ON COLUMN data_import_batches.status IS 'Current status: pending, in_progress, completed, failed, rolled_back';

-- Indexes for data_import_batches
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON data_import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_date ON data_import_batches(import_date DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_period ON data_import_batches(data_period_start, data_period_end);

-- ============================================================================
-- 2. RETROACTIVE_EVENTS TABLE
-- Stores historical events that were imported retroactively
-- ============================================================================

CREATE TABLE IF NOT EXISTS retroactive_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('rider', 'vehicle', 'battery', 'payment', 'rental_ledger')),
    entity_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    recorded_date TIMESTAMPTZ DEFAULT NOW(),
    event_data JSONB DEFAULT '{}',
    source TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 1.00,
    notes TEXT,
    import_batch_id UUID REFERENCES data_import_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE retroactive_events IS 'Stores historical events imported retroactively for timeline reconstruction';
COMMENT ON COLUMN retroactive_events.entity_type IS 'Type of entity: rider, vehicle, battery, payment, rental_ledger';
COMMENT ON COLUMN retroactive_events.entity_id IS 'ID of the entity this event relates to';
COMMENT ON COLUMN retroactive_events.event_type IS 'Type of event: ONBOARD, DEBOARD, ASSIGN, UNASSIGN, DEPLOY, PAYMENT, etc.';
COMMENT ON COLUMN retroactive_events.effective_date IS 'When the event actually occurred (historical date)';
COMMENT ON COLUMN retroactive_events.recorded_date IS 'When this event was recorded in the system';
COMMENT ON COLUMN retroactive_events.event_data IS 'JSON object with event-specific data (previous_state, new_state, etc.)';
COMMENT ON COLUMN retroactive_events.source IS 'Data source: PLATFORM, CL87_CSV, PAYMENT_RECORDS_CSV, etc.';
COMMENT ON COLUMN retroactive_events.confidence IS 'Data quality score 0.00-1.00';
COMMENT ON COLUMN retroactive_events.import_batch_id IS 'Link to the import batch that created this event';

-- Indexes for retroactive_events
CREATE INDEX IF NOT EXISTS idx_retroactive_events_entity ON retroactive_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_retroactive_events_effective_date ON retroactive_events(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_retroactive_events_type ON retroactive_events(event_type);
CREATE INDEX IF NOT EXISTS idx_retroactive_events_batch ON retroactive_events(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_retroactive_events_timeline ON retroactive_events(entity_type, entity_id, effective_date);

-- ============================================================================
-- 3. TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_import_batches_updated_at
    BEFORE UPDATE ON data_import_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
