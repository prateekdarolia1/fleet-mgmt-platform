# Historical Data Management System

## Why

The fleet management platform is going live on **April 1, 2026**, but operational data (riders, vehicles, batteries, payments) exists from as early as **July 2025**. We need to import this historical data to enable:

1. **Point-in-time queries**: "What was rider D231360's status on 15/Jan/2025?"
2. **Historical revenue tracking**: Exact amounts from payment records before platform deployment
3. **Complete audit trails**: Full lifecycle visibility from pre-platform era
4. **Data reconciliation**: CL87 CSV and other exports must be merged with platform data

Without this system, we lose months of operational history and cannot generate accurate historical reports.

## What Changes

### Database Schema Changes
- Add `effective_start_date` and `effective_end_date` columns to core tables (riders, vehicles, batteries, payments, rental_ledgers)
- Add `is_historical_import` boolean flag to identify retroactive records
- Add `confidence_score` (DECIMAL 0.00-1.00) to track data quality
- Add `data_source` text field to identify origin (CL87_CSV, PLATFORM, MANUAL, etc.)
- Add `import_batch_id` UUID to link records to import batches

### New Tables
- **`data_import_batches`**: Track each import operation with metadata, status, and statistics
- **`retroactive_events`**: Store historical events that occurred before platform deployment

### New Functions
- Point-in-time query functions (SQL): `get_entity_state_at_date()`, `get_active_riders_count_at_date()`, `get_revenue_by_period()`
- Date estimation rules engine for filling missing dates
- Import workflow (5 phases: Prepare → Reconcile → Transform → Execute → Verify)

### UI Components
- Historical data import panel (extends existing upload panel)
- Point-in-time query interface for reports
- Data quality dashboard showing confidence scores

## Capabilities

### New Capabilities

- `historical-data-tracking`: Point-in-time data versioning with effective dates, confidence scoring, and source tracking
- `retroactive-import`: CSV import workflow for pre-platform data with reconciliation, transformation, and verification phases
- `point-in-time-queries`: SQL functions and UI for querying entity states at any historical date

### Modified Capabilities

- `rider-management`: Adds effective dates and historical flags to rider records
- `vehicle-management`: Adds effective dates and historical flags to vehicle records
- `battery-management`: Adds effective dates and historical flags to battery records
- `payment-tracking`: Adds effective dates, confidence scores, and historical import flags to payment records

## Impact

### Database
- Migration required to add 6 new columns to 5 core tables
- 2 new tables to create
- 3+ new SQL functions for point-in-time queries
- Indexes on `effective_start_date`, `effective_end_date`, `import_batch_id`

### Codebase
- New TypeScript types for historical fields
- Import workflow module (`src/lib/import/historicalImport.ts`)
- Date estimation rules engine (`src/lib/import/dateEstimation.ts`)
- Point-in-time query hooks (`src/hooks/usePointInTimeQueries.ts`)
- UI components for import panel

### Existing Systems
- Event tracking system (rider_events, vehicle_events) - will receive retroactive events
- Payment tracking - will receive historical payments with confidence scores
- Dashboard - will show historical data statistics

### Data Sources (Priority Order)
1. EXACT_REVENUE_CSV (payment amounts) - highest priority
2. CL87_CSV (vehicle-battery-rider mappings)
3. BATTERY_SMART_EXPORTS (performance data)
4. PLATFORM_DATA (existing database records)
5. ESTIMATED/DEFAULT (derived values) - lowest priority
