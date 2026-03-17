# Historical Data Management System - Implementation Tasks

## 1. Database Schema Migration

- [x] 1.1 Create migration file `add_historical_tracking_columns.sql`
- [x] 1.2 Add effective_start_date, effective_end_date columns to riders table
- [x] 1.3 Add is_historical_import, data_source, import_batch_id, confidence_score columns to riders table
- [x] 1.4 Add historical tracking columns to vehicles table
- [x] 1.5 Add historical tracking columns to batteries table
- [x] 1.6 Add historical tracking columns to payments table
- [x] 1.7 Add historical tracking columns to rental_ledgers table
- [x] 1.8 Set effective_start_date = created_at for existing records
- [x] 1.9 Create indexes on (entity_id, effective_start_date, effective_end_date)
- [x] 1.10 Create indexes on import_batch_id for all tables

## 2. New Tables Creation

- [x] 2.1 Create data_import_batches table with all columns
- [x] 2.2 Create retroactive_events table with FK to data_import_batches
- [x] 2.3 Add indexes for point-in-time query performance
- [ ] 2.4 Run migration and verify tables created

## 3. SQL Functions for Point-in-Time Queries

- [x] 3.1 Create get_entity_state_at_date(entity_type, entity_id, date) function
- [x] 3.2 Create get_active_riders_count_at_date(date) function
- [x] 3.3 Create get_deployed_vehicles_count_at_date(date) function
- [x] 3.4 Create get_revenue_by_period(start_date, end_date) function
- [x] 3.5 Create get_entity_timeline(entity_type, entity_id) function
- [ ] 3.6 Test all SQL functions with sample data

## 4. TypeScript Types and Interfaces

- [x] 4.1 Update Supabase types with new columns
- [x] 4.2 Create HistoricalRecord interface in src/types/historical.ts
- [x] 4.3 Create DataSource type union
- [x] 4.4 Create DataImportBatch interface
- [x] 4.5 Create RetroactiveEvent interface
- [x] 4.6 Extend existing entity types (Rider, Vehicle, Battery, Payment) with historical fields

## 5. Date Estimation Rules Engine

- [x] 5.1 Create src/lib/import/dateEstimation.ts
- [x] 5.2 Implement estimateOnboardDate(rider, assignments) function
- [x] 5.3 Implement estimateDeboardDate(rider, payments, events) function
- [x] 5.4 Implement estimateAssignmentDate(vehicle, battery) function
- [x] 5.5 Implement estimateDueDate(payment, ledger, weekNumber) function
- [x] 5.6 Create getConfidenceScore(estimationType) helper
- [ ] 5.7 Add unit tests for all estimation rules

## 6. Reconciliation Engine

- [x] 6.1 Create src/lib/import/reconciliationEngine.ts
- [x] 6.2 Implement matchRecords(csvData, dbData) function
- [x] 6.3 Implement categorizeMatch(csvRecord, dbRecord) returning EXACT_MATCH | CONFLICT | NEW_RECORD | MISSING_IN_CSV
- [x] 6.4 Implement resolveConflict(csvValue, dbValue, sourcePriority) function
- [x] 6.5 Implement generatePreviewReport(matches) function
- [ ] 6.6 Add unit tests for reconciliation logic

## 7. Transform Engine

- [x] 7.1 Create src/lib/import/transformEngine.ts
- [x] 7.2 Implement applyDateEstimation(records, rules) function
- [x] 7.3 Implement createGhostEntity(entityType, csvRecord) function
- [x] 7.4 Implement calculateEffectiveDates(records) function
- [x] 7.5 Implement generateRetroactiveEvents(records) function
- [ ] 7.6 Add unit tests for transformation logic

## 8. Historical Import Orchestrator

- [ ] 8.1 Create src/lib/import/historicalImport.ts
- [ ] 8.2 Implement createImportBatch(batchName, sourceFile) function
- [ ] 8.3 Implement executeImport(csvContent, options) orchestrator
- [ ] 8.4 Implement phase 1: prepare(csvContent) function
- [ ] 8.5 Implement phase 2: reconcile(prepareResult) function
- [ ] 8.6 Implement phase 3: transform(reconcileResult) function
- [ ] 8.7 Implement phase 4: execute(transformResult) function with transaction
- [ ] 8.8 Implement phase 5: verify(executeResult) function
- [ ] 8.9 Implement rollbackImport(batchId) function
- [ ] 8.10 Add integration tests for full import workflow

## 9. React Query Hooks
- [x] 9.1 Create src/hooks/usePointInTimeQueries.ts
- [x] 9.2 Implement useEntityStateAtDate(entityType, entityId, date) hook
- [x] 9.3 Implement useActiveRidersCountAtDate(date) hook
- [x] 9.4 Implement useRevenueByPeriod(startDate, endDate) hook
- [x] 9.5 Implement useEntityTimeline(entityType, entityId) hook
- [x] 9.6 Create src/hooks/useImportBatch.ts
- [x] 9.7 Implement useImportBatch(batchId) hook
- [x] 9.8 Implement useCreateImportBatch() mutation hook
- [x] 9.9 Implement useUpdateImportBatch() mutation hook

## 10. Import UI Components

- [x] 10.1 Create src/components/import/HistoricalImportPanel.tsx
- [x] 10.2 Create src/components/import/ImportPreview.tsx with conflict display
- [x] 10.3 Create src/components/import/ImportProgress.tsx with phase indicators
- [x] 10.4 Create src/components/import/ImportSummary.tsx with results table
- [x] 10.5 Create src/components/import/ConflictResolutionDialog.tsx
- [x] 10.6 Create src/components/import/LowConfidenceWarning.tsx
- [x] 10.7 Integrate HistoricalImportPanel into existing upload panel

## 11. Historical Data Dashboard

- [x] 11.1 Create src/components/historical/HistoricalDatePicker.tsx
- [x] 11.2 Create src/components/historical/HistoricalMetricsCard.tsx
- [x] 11.3 Create src/components/historical/DataQualityIndicator.tsx
- [x] 11.4 Add historical view toggle to main dashboard
- [x] 11.5 Update dashboard metrics to use point-in-time queries when historical date selected

## 12. CL87 CSV Import Integration

- [x] 12.1 Update src/lib/sync/cl87Sync.ts to use historical import system
- [x] 12.2 Add confidence scores to CL87 CSV parsing
- [x] 12.3 Generate retroactive events during CL87 sync
- [x] 12.4 Track CL87 imports in data_import_batches
- [x] 12.5 Test CL87 import with historical tracking enabled

## 13. Testing

- [x] 13.1 Create test fixtures with historical CSV data
- [x] 13.2 Write unit tests for date estimation rules
- [x] 13.3 Write unit tests for reconciliation engine
- [x] 13.4 Write unit tests for transform engine
- [x] 13.5 Write integration tests for full import workflow
- [ ] 13.6 Write E2E tests for historical import UI
- [x] 13.7 Write tests for point-in-time query functions

## 14. Documentation

- [ ] 14.1 Update CLAUDE.md with historical data system overview
- [ ] 14.2 Create docs/historical-data/IMPORT_GUIDE.md
- [ ] 14.3 Create docs/historical-data/POINT_IN_TIME_QUERIES.md
- [ ] 14.4 Create docs/historical-data/DATE_ESTIMATION_RULES.md
- [ ] 14.5 Add JSDoc comments to all public functions
