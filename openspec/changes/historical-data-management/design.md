# Historical Data Management System - Technical Design

## Overview

This document describes the technical implementation for the Historical Data Management System, enabling point-in-time queries and retroactive data import for the fleet management platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HISTORICAL DATA ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   CSV Files      │    │  Import Engine   │    │   Database       │        │
│  │   (CL87, etc)   │───▶│  (5 Phases)     │───▶│  (Extended)     │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                            │
│  Database Extensions:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Core Tables (riders, vehicles, batteries, payments):               │  │
│  │  + effective_start_date TIMESTAMPTZ                                   │  │
│  │  + effective_end_date TIMESTAMPTZ (NULL = current)                   │  │
│  │  + is_historical_import BOOLEAN                                       │  │
│  │  + data_source TEXT                                                   │  │
│  │  + import_batch_id UUID                                                │  │
│  │  + confidence_score DECIMAL(3,2)                                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  New Tables:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  data_import_batches - Track import operations                         │  │
│  │  retroactive_events - Historical event log                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Columns for Core Tables

Add to: `riders`, `vehicles`, `batteries`, `payments`, `rental_ledgers`

```sql
-- Add historical tracking columns
ALTER TABLE riders ADD COLUMN effective_start_date TIMESTAMPTZ;
ALTER TABLE riders ADD COLUMN effective_end_date TIMESTAMPTZ;
ALTER TABLE riders ADD COLUMN is_historical_import BOOLEAN DEFAULT FALSE;
ALTER TABLE riders ADD COLUMN data_source TEXT DEFAULT 'PLATFORM';
ALTER TABLE riders ADD COLUMN import_batch_id UUID;
ALTER TABLE riders ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 1.00;

-- Set effective_start_date for existing records
UPDATE riders SET effective_start_date = created_at WHERE effective_start_date IS NULL;

-- Create indexes for point-in-time queries
CREATE INDEX idx_riders_effective_dates ON riders(rider_id, effective_start_date, effective_end_date);
CREATE INDEX idx_riders_import_batch ON riders(import_batch_id) WHERE import_batch_id IS NOT NULL;
```

### New Table: data_import_batches

```sql
CREATE TABLE data_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  source_file TEXT,
  import_date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  data_period_start DATE,
  data_period_end DATE,
  records_total INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_skipped INT DEFAULT 0,
  defaults_applied JSONB DEFAULT '{}',
  warnings JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  imported_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_import_batches_status ON data_import_batches(status);
CREATE INDEX idx_import_batches_period ON data_import_batches(data_period_start, data_period_end);
```

### New Table: retroactive_events

```sql
CREATE TABLE retroactive_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('rider', 'vehicle', 'battery', 'payment', 'ledger')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  effective_date DATE NOT NULL,
  recorded_date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  event_data JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  notes TEXT,
  import_batch_id UUID REFERENCES data_import_batches(id),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_retroactive_events_entity ON retroactive_events(entity_type, entity_id);
CREATE INDEX idx_retroactive_events_date ON retroactive_events(effective_date);
CREATE INDEX idx_retroactive_events_batch ON retroactive_events(import_batch_id);
```

## Point-in-Time Query Functions

### SQL Function: get_entity_state_at_date

```sql
CREATE OR REPLACE FUNCTION get_entity_state_at_date(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_date DATE
)
RETURNS TABLE (
  entity_data JSONB,
  confidence_score DECIMAL,
  data_source TEXT,
  is_historical BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(r.*) as entity_data,
    r.confidence_score,
    r.data_source,
    r.is_historical_import as is_historical
  FROM riders r
  WHERE r.rider_id = p_entity_id
    AND r.effective_start_date <= p_date
    AND (r.effective_end_date IS NULL OR r.effective_end_date > p_date);
END;
$$;
```

### SQL Function: get_active_riders_count_at_date

```sql
CREATE OR REPLACE FUNCTION get_active_riders_count_at_date(p_date DATE)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM riders
    WHERE status = 'active'
      AND effective_start_date <= p_date
      AND (effective_end_date IS NULL OR effective_end_date > p_date)
  );
END;
$$;
```

### SQL Function: get_revenue_by_period

```sql
CREATE OR REPLACE FUNCTION get_revenue_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  month DATE,
  total_revenue DECIMAL,
  avg_confidence DECIMAL,
  record_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', payment_date)::DATE as month,
    SUM(amount) as total_revenue,
    AVG(confidence_score) as avg_confidence,
    COUNT(*) as record_count
  FROM payments
  WHERE payment_date >= p_start_date
    AND payment_date <= p_end_date
  GROUP BY DATE_TRUNC('month', payment_date)
  ORDER BY month;
END;
$$;
```

## Confidence Score Rules

| Source | Score | Rationale |
|-------|-------|-----------|
| PLATFORM (live) | 1.00 | Definitive - captured by system |
| PAYMENT_RECORDS_CSV | 0.95 | Financial data - high accuracy |
| CL87_CSV | 0.90 | Official export from operations |
| BATTERY_SMART_EXPORT | 0.85 | External source - reliable |
| MANUAL_ENTRY | 0.70 | Human entered - moderate |
| ESTIMATED_DATE | 0.50 | Calculated from rules |
| DEFAULT_FILL | 0.30 | Assumed value - low confidence |

## Date Estimation Rules

### Rule 1: Rider Onboarding Date
```typescript
// IF: rider.onboard_date is unknown
// THEN: Use earliest battery deployment date for their vehicles
function estimateOnboardDate(rider: Rider, assignments: Assignment[]): Date {
  const deploymentDates = assignments
    .filter(a => a.rider_id === rider.rider_id)
    .map(a => a.battery_deployment_date);

  if (deploymentDates.length > 0) {
    return new Date(Math.min(...deploymentDates));
  }
  return null; // Cannot estimate
}
// confidence = 0.50
```

### Rule 2: Rider Deboarding Date
```typescript
// IF: rider.status = 'deboarded' but date unknown
// THEN: Use last_payment_date + 7 days OR last_vehicle_unassignment_date
function estimateDeboardDate(rider: Rider, payments: Payment[], events: Event[]): Date {
  const lastPayment = payments
    .filter(p => p.rider_id === rider.rider_id)
    .sort((a, b) => b.payment_date - a.payment_date)[0];

  if (lastPayment) {
    const date = new Date(lastPayment.payment_date);
    date.setDate(date.getDate() + 7);
    return date;
  }
  return null;
}
// confidence = 0.50
```

### Rule 3: Vehicle Assignment Date
```typescript
// IF: vehicle.rider_id set but no assignment date
// THEN: Use battery_deployment_date
function estimateAssignmentDate(vehicle: Vehicle, battery: Battery): Date {
  if (battery?.retrofit_date) {
    return new Date(battery.retrofit_date);
  }
  return null;
}
// confidence = 0.70
```

### Rule 4: Payment Due Dates
```typescript
// IF: payment exists but due_date unclear
// THEN: Use rental_plan start_date + weekly offset
function estimateDueDate(payment: Payment, ledger: Ledger, weekNumber: number): Date {
  if (ledger?.rental_start_date) {
    const date = new Date(ledger.rental_start_date);
    date.setDate(date.getDate() + (weekNumber * 7));
    return date;
  }
  return null;
}
// confidence = 0.60
```

## Import Workflow

### Phase 1: PREPARE
1. Create import batch record in `data_import_batches`
2. Upload CSV file to temporary storage
3. Parse and validate CSV structure
4. Identify date range in data
5. Calculate confidence scores per column

### Phase 2: RECONCILE
1. Query existing records from database
2. Match CSV records to DB records by ID
3. Categorize matches:
   - **EXACT_MATCH**: Same data, skip
   - **CONFLICT**: Different data, CSV wins
   - **NEW_RECORD**: Not in DB, create with historical flag
   - **MISSING_IN_CSV**: In DB only, keep and flag

### Phase 3: TRANSFORM
1. Apply date estimation rules
2. Create missing entities (ghost records with low confidence)
3. Calculate effective_start_date and effective_end_date
4. Set confidence_score for each field
5. Generate retroactive_events for timeline

### Phase 4: EXECUTE
1. Start database transaction
2. INSERT/UPDATE records with historical flags
3. INSERT retroactive_events
4. Update import_batch status
5. Commit or rollback on error

### Phase 5: VERIFY
1. Run point-in-time queries to verify data
2. Generate import summary report
3. Flag low-confidence records (< 0.50) for manual review
4. Update dashboard with historical data statistics

## TypeScript Types

```typescript
// Extended types for historical tracking
export interface HistoricalRecord {
  effective_start_date: string;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number; // 0.00 - 1.00
}

export type DataSource =
  | 'PLATFORM'
  | 'PAYMENT_RECORDS_CSV'
  | 'CL87_CSV'
  | 'BATTERY_SMART_EXPORT'
  | 'MANUAL_ENTRY'
  | 'ESTIMATED_DATE'
  | 'DEFAULT_FILL';

export interface DataImportBatch {
  id: string;
  batch_name: string;
  source_file: string | null;
  import_date: string;
  data_period_start: string | null;
  data_period_end: string | null;
  records_total: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  defaults_applied: Record<string, any>;
  warnings: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  imported_by: string | null;
  notes: string | null;
}

export interface RetroactiveEvent {
  id: string;
  entity_type: 'rider' | 'vehicle' | 'battery' | 'payment' | 'ledger';
  entity_id: string;
  event_type: string;
  effective_date: string;
  recorded_date: string;
  event_data: Record<string, any>;
  source: DataSource;
  confidence: number;
  notes: string | null;
  import_batch_id: string | null;
}
```

## File Structure

```
src/lib/import/
├── historicalImport.ts          # Main import orchestrator
├── dateEstimation.ts           # Date estimation rules
├── reconciliationEngine.ts     # CSV vs DB comparison
├── transformEngine.ts          # Data transformation
└── importValidators.ts         # CSV validation

src/hooks/
├── usePointInTimeQueries.ts    # Point-in-time query hooks
├── useImportBatch.ts           # Import batch tracking
└── useHistoricalData.ts        # Historical data queries

src/components/import/
├── HistoricalImportPanel.tsx   # Main import UI
├── ImportPreview.tsx           # Preview before import
├── ImportProgress.tsx          # Progress indicator
└── ImportSummary.tsx           # Results summary
```

## Migration Path

1. **Migration 1**: Add columns to core tables
2. **Migration 2**: Create `data_import_batches` table
3. **Migration 3**: Create `retroactive_events` table
4. **Migration 4**: Create point-in-time query functions
5. **Migration 5**: Add indexes for performance

## Rollback Strategy

If issues arise:
1. Set `effective_end_date` on imported records to NOW
2. Delete records where `is_historical_import = true`
3. Delete `retroactive_events` by `import_batch_id`
4. Update `data_import_batches.status = 'rolled_back'`
