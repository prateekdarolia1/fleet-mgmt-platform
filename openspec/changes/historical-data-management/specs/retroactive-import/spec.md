# Retroactive Import

## ADDED Requirements

### Requirement: CSV import workflow for historical data
The system SHALL provide a 5-phase import workflow for loading historical data: Prepare, Reconcile, Transform, Execute, Verify.

#### Scenario: Complete import workflow
- **WHEN** user uploads a historical CSV file
- **THEN** system SHALL guide through all 5 phases and create a data_import_batches record

#### Scenario: Preview before execution
- **WHEN** user reaches the Execute phase
- **THEN** system SHALL show a preview of all changes (creates, updates, conflicts) before applying

### Requirement: Reconciliation identifies data conflicts
The system SHALL compare CSV records against existing database records and categorize differences.

#### Scenario: Exact match detected
- **WHEN** CSV record matches existing database record exactly
- **THEN** system SHALL mark as EXACT_MATCH and skip during import

#### Scenario: Conflict detected
- **WHEN** CSV record differs from existing database record
- **THEN** system SHALL mark as CONFLICT and CSV data SHALL take precedence

#### Scenario: New record detected
- **WHEN** CSV record does not exist in database
- **THEN** system SHALL mark as NEW_RECORD and create with is_historical_import=TRUE

### Requirement: Date estimation rules applied automatically
The system SHALL apply business rules to estimate missing dates with appropriate confidence scores.

#### Scenario: Estimate rider onboarding date
- **WHEN** rider has no onboard_date but has vehicle assignments
- **THEN** system SHALL use MIN(battery_deployment_date) with confidence_score=0.50

#### Scenario: Estimate rider deboarding date
- **WHEN** rider status is 'deboarded' but no deboard_date
- **THEN** system SHALL use last_payment_date + 7 days with confidence_score=0.50

#### Scenario: Cannot estimate date
- **WHEN** no estimation rule applies
- **THEN** system SHALL flag record for manual review and NOT auto-fill

### Requirement: Ghost records created for missing entities
The system SHALL create placeholder records when CSV references entities not in the database.

#### Scenario: Create ghost rider
- **WHEN** CSV references rider_id D999999 not in database
- **THEN** system SHALL create rider with name="Imported Rider [D999999]", is_historical_import=TRUE, confidence_score=0.30

#### Scenario: Create ghost vehicle
- **WHEN** CSV references vehicle_number EVP999 not in database
- **THEN** system SHALL create vehicle with make/model="Unknown", is_historical_import=TRUE, confidence_score=0.30

#### Scenario: Create ghost battery
- **WHEN** CSV references battery_id B999999 not in database
- **THEN** system SHALL create battery with status="MAPPED", is_historical_import=TRUE, confidence_score=0.30

### Requirement: Import batch tracking
The system SHALL track all import operations in the data_import_batches table.

#### Scenario: Record import statistics
- **WHEN** import completes
- **THEN** batch record SHALL contain records_total, records_created, records_updated, records_skipped

#### Scenario: Track warnings and defaults
- **WHEN** import applies defaults or encounters issues
- **THEN** batch record SHALL contain defaults_applied and warnings JSONB fields

#### Scenario: Mark failed imports
- **WHEN** import encounters critical error
- **THEN** batch status SHALL be 'failed' and transaction SHALL be rolled back

### Requirement: Data source priority for conflicts
The system SHALL resolve conflicting data using the source priority hierarchy.

#### Scenario: Payment amount conflict
- **WHEN** payment amount differs between EXACT_REVENUE_CSV and platform data
- **THEN** EXACT_REVENUE_CSV value SHALL be used (highest priority)

#### Scenario: Vehicle mapping conflict
- **WHEN** vehicle-battery-rider mapping differs between CL87_CSV and platform
- **THEN** CL87_CSV mapping SHALL be used
