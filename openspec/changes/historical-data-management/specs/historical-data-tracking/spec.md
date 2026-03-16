# Historical Data Tracking

## ADDED Requirements

### Requirement: Entity records support point-in-time versioning
The system SHALL track when each entity state became effective and when it ended, enabling point-in-time queries.

#### Scenario: Query rider state at specific date
- **WHEN** user queries "What was rider D231360's status on 15/Jan/2025?"
- **THEN** system returns the rider state that was active on that date using effective_start_date and effective_end_date

#### Scenario: Current state has null end date
- **WHEN** a record represents the current state of an entity
- **THEN** effective_end_date SHALL be NULL

### Requirement: Historical imports are flagged
The system SHALL clearly identify records that were imported retroactively vs captured live.

#### Scenario: Identify historical import
- **WHEN** a record was imported from a CSV file (not captured by platform)
- **THEN** is_historical_import SHALL be TRUE and data_source SHALL contain the source identifier

#### Scenario: Platform-captured record
- **WHEN** a record was created through normal platform operations
- **THEN** is_historical_import SHALL be FALSE and data_source SHALL be 'PLATFORM'

### Requirement: Confidence scores indicate data quality
The system SHALL assign confidence scores to historical data to indicate reliability.

#### Scenario: High confidence platform data
- **WHEN** data was captured by the platform in real-time
- **THEN** confidence_score SHALL be 1.00

#### Scenario: Low confidence estimated data
- **WHEN** a date was estimated using business rules
- **THEN** confidence_score SHALL be 0.50 or lower

#### Scenario: Filter low confidence records
- **WHEN** user queries historical data
- **THEN** system SHALL allow filtering by minimum confidence threshold

### Requirement: Import batches are tracked
The system SHALL group all records from a single import operation under a batch ID for traceability.

#### Scenario: Link records to import batch
- **WHEN** records are imported from a CSV file
- **THEN** all records SHALL have the same import_batch_id linking to data_import_batches table

#### Scenario: Query all records from a batch
- **WHEN** user wants to review an import
- **THEN** system SHALL allow querying all records by import_batch_id

### Requirement: Retroactive events are logged
The system SHALL create event records for historical state changes to build complete timelines.

#### Scenario: Log rider onboarding event
- **WHEN** a rider's onboarding date is imported from historical data
- **THEN** a retroactive_event SHALL be created with entity_type='rider', event_type='ONBOARD', and effective_date

#### Scenario: Log rider deboarding event
- **WHEN** a rider's deboarding date is identified from historical data
- **THEN** a retroactive_event SHALL be created with entity_type='rider', event_type='DEBOARD', and effective_date
