# Spec: Gap Period Payments

## ADDED Requirements

### Requirement: Generate payments for pause-reactivate gap
When reactivating a paused ledger, the system SHALL generate payment entries for the time period between when the ledger was paused and the new start date.

#### Scenario: Reactivate after 1 month pause
- **WHEN** ledger was paused on January 1, 2026
- **AND** user reactivates with new start date of February 1, 2026
- **THEN** system generates 4 weekly gap payments (Jan 1 to Feb 1)
- **AND** all gap payments have status "overdue"
- **AND** system generates 6 future payments from February 1 onwards

#### Scenario: Reactivate after 2 week pause (weekly ledger)
- **WHEN** weekly ledger was paused 14 days ago
- **AND** user reactivates with today's date
- **THEN** system generates 2 gap payments for the 2-week period
- **AND** both gap payments have status "overdue"

#### Scenario: Daily ledger reactivation
- **WHEN** daily ledger was paused 7 days ago
- **AND** user reactivates with today's date
- **THEN** system generates 7 gap payments (one per day)
- **AND** all 7 gap payments have status "overdue"

### Requirement: Validate new start date is not before pause date
The system SHALL validate that the reactivation start date is on or after the pause date before generating gap payments.

#### Scenario: Valid start date
- **WHEN** ledger was paused on January 15, 2026
- **AND** user provides start date of February 1, 2026
- **THEN** validation passes
- **AND** gap payments are generated

#### Scenario: Invalid start date (before pause)
- **WHEN** ledger was paused on January 15, 2026
- **AND** user provides start date of January 10, 2026
- **THEN** validation fails
- **AND** system displays error: "Start date cannot be before pause date"
- **AND** reactivation is blocked

### Requirement: Use paused_at timestamp for gap calculation
The system SHALL use the `paused_at` timestamp from the ledger record to calculate the start of the gap period.

#### Scenario: Paused ledger with paused_at set
- **WHEN** ledger has paused_at = "2026-01-15T10:30:00Z"
- **AND** user reactivates with start_date = "2026-02-01"
- **THEN** gap period is calculated from January 15 to February 1
- **AND** payments are generated for this period

#### Scenario: Paused ledger without paused_at (edge case)
- **WHEN** ledger has status = "paused" but paused_at is null
- **THEN** system does not generate gap payments
- **AND** system only generates future payments from new start date

### Requirement: Set gap payment status to overdue
All gap period payments SHALL have status "overdue" since they represent payments that should have been collected during the paused period.

#### Scenario: All gap payments are overdue
- **WHEN** system generates gap payments for pause-reactivate period
- **THEN** every gap payment has status = "overdue"
- **AND** gap payments are clearly distinguishable in payment history

### Requirement: Generate future payments after gap period
After generating gap period payments, the system SHALL continue generating the standard 6 future payments from the new start date onwards.

#### Scenario: Full reactivation payment sequence
- **WHEN** weekly ledger is reactivated after 1 month pause
- **THEN** system generates: 4 overdue gap payments + 6 pending future payments
- **AND** total 10 payments are created
- **AND** payment week_numbers are sequential (1-10)

### Requirement: Delete existing pending payments before reactivation
The system SHALL delete any existing pending payments for the ledger before generating gap and future payments to avoid duplicates.

#### Scenario: Clean slate before reactivation
- **WHEN** ledger has existing pending payments from before pause
- **AND** user reactivates the ledger
- **THEN** system deletes all existing pending payments
- **AND** system generates new gap + future payments
- **AND** no duplicate payment_ids exist

### Requirement: Prevent double reactivation
The system SHALL prevent reactivation if `reactivated_at` is already set (indicating the ledger was previously reactivated).

#### Scenario: Already reactivated ledger
- **WHEN** ledger has reactivated_at timestamp set
- **AND** user attempts to reactivate again
- **THEN** system displays error: "Ledger has already been reactivated"
- **AND** reactivation is blocked
