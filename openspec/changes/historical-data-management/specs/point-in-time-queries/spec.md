# Point-in-Time Queries

## ADDED Requirements

### Requirement: Query entity state at any historical date
The system SHALL provide functions to retrieve the state of any entity at a specific point in time.

#### Scenario: Query rider state at date
- **WHEN** user calls get_entity_state_at_date('rider', 'D231360', '2025-01-15')
- **THEN** system SHALL return the rider record where effective_start_date <= '2025-01-15' AND (effective_end_date IS NULL OR effective_end_date > '2025-01-15')

#### Scenario: Query vehicle state at date
- **WHEN** user calls get_entity_state_at_date('vehicle', 'EVP010', '2025-12-01')
- **THEN** system SHALL return the vehicle state including rider_id, status, and battery_id as they were on that date

#### Scenario: No state exists at date
- **WHEN** entity did not exist on the queried date
- **THEN** system SHALL return NULL with explanation "Entity not active at specified date"

### Requirement: Aggregate historical counts
The system SHALL provide functions to count active entities at any historical date.

#### Scenario: Count active riders at date
- **WHEN** user calls get_active_riders_count_at_date('2025-12-31')
- **THEN** system SHALL return COUNT of riders where status='active' AND effective_start_date <= '2025-12-31' AND (effective_end_date IS NULL OR effective_end_date > '2025-12-31')

#### Scenario: Count deployed vehicles at date
- **WHEN** user calls get_deployed_vehicles_count_at_date('2025-12-31')
- **THEN** system SHALL return COUNT of vehicles where status='Deployed' AND effective_start_date <= '2025-12-31' AND (effective_end_date IS NULL OR effective_end_date > '2025-12-31')

### Requirement: Historical revenue queries
The system SHALL provide functions to aggregate revenue by time period.

#### Scenario: Query revenue by month
- **WHEN** user calls get_revenue_by_period('2025-10-01', '2025-12-31')
- **THEN** system SHALL return monthly totals with SUM(amount), AVG(confidence_score), and COUNT of records

#### Scenario: Revenue with low confidence warning
- **WHEN** returned revenue data has average confidence_score < 0.70
- **THEN** system SHALL include a warning that data quality is moderate

### Requirement: Timeline reconstruction
The system SHALL provide functions to reconstruct entity lifecycle timelines.

#### Scenario: Get rider timeline
- **WHEN** user calls get_entity_timeline('rider', 'D231360')
- **THEN** system SHALL return chronological list of all state changes from rider_events and retroactive_events

#### Scenario: Timeline includes historical imports
- **WHEN** entity has retroactive_events from historical import
- **THEN** timeline SHALL include these events with source, confidence, and effective_date

### Requirement: Data quality indicators in results
The system SHALL include confidence scores in all historical query results.

#### Scenario: Include confidence in state query
- **WHEN** returning entity state from point-in-time query
- **THEN** result SHALL include confidence_score indicating data reliability

#### Scenario: Include data source in results
- **WHEN** returning historical data
- **THEN** result SHALL include data_source field indicating origin (PLATFORM, CL87_CSV, etc.)

### Requirement: UI supports date picker for historical views
The system SHALL provide a date picker in the UI to view historical states.

#### Scenario: Select historical date in dashboard
- **WHEN** user selects a date in the historical view date picker
- **THEN** all dashboard metrics SHALL update to show values as of that date

#### Scenario: Visual indicator for historical data
- **WHEN** viewing historical (non-current) data
- **THEN** UI SHALL display a visual indicator that this is historical data with the effective date
