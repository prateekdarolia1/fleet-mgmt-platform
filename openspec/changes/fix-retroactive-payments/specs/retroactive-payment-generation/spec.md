# Spec: Retroactive Payment Generation

## ADDED Requirements

### Requirement: Generate payments for past start dates
When creating a new ledger with a rental start date in the past, the system SHALL automatically generate all payment entries from the start date to the current date, with appropriate status based on due dates.

#### Scenario: Weekly ledger created 2 months ago
- **WHEN** user creates a weekly ledger with rental start date of January 18, 2026, and today is March 26, 2026
- **THEN** system generates approximately 10 weekly payment entries
- **AND** payments due before today have status "overdue"
- **AND** the next upcoming payment has status "pending"

#### Scenario: Daily ledger created 1 week ago
- **WHEN** user creates a daily ledger with rental start date 7 days ago
- **THEN** system generates 7 daily payment entries
- **AND** all 7 payments have status "overdue"
- **AND** the 8th payment (tomorrow) has status "pending"

#### Scenario: Monthly ledger with past start date
- **WHEN** user creates a monthly ledger with rental start date 3 months ago
- **THEN** system generates 3 monthly payment entries
- **AND** each payment uses the rental_amount from the ledger
- **AND** each payment's due_date is calculated as start_date + (n × 30 days)

#### Scenario: Future start date (not retroactive)
- **WHEN** user creates a ledger with rental start date in the future
- **THEN** system generates only the first 2 payments
- **AND** both payments have status "pending"

### Requirement: Calculate payment periods based on rental frequency
The system SHALL calculate the number of payment periods based on the rental frequency (daily, weekly, monthly) and generate one payment per period.

#### Scenario: Weekly frequency calculation
- **WHEN** ledger has rental_frequency="weekly" and start date is 14 days ago
- **THEN** system generates 2 weekly payments
- **AND** each payment is due 7 days apart

#### Scenario: Daily frequency calculation
- **WHEN** ledger has rental_frequency="daily" and start date is 5 days ago
- **THEN** system generates 5 daily payments
- **AND** each payment is due 1 day apart

#### Scenario: Monthly frequency calculation
- **WHEN** ledger has rental_frequency="monthly" and start date is 60 days ago
- **THEN** system generates 2 monthly payments
- **AND** each payment uses 30-day periods

### Requirement: Set payment status based on due date
The system SHALL set payment status to "overdue" for payments due before the current date, and "pending" for payments due on or after the current date.

#### Scenario: Past due date
- **WHEN** payment due_date is before today's date
- **THEN** payment status is set to "overdue"

#### Scenario: Future due date
- **WHEN** payment due_date is on or after today's date
- **THEN** payment status is set to "pending"

#### Scenario: Mixed statuses in single ledger
- **WHEN** ledger created with start date 3 weeks ago
- **THEN** first 3 payments have status "overdue"
- **AND** 4th payment (current week) has status "pending"

### Requirement: Include security deposit as first payment
The system SHALL create the security deposit payment entry before generating rental payments, regardless of retroactive status.

#### Scenario: Security deposit creation
- **WHEN** user creates a ledger with security_deposit_amount > 0
- **THEN** system creates a security deposit payment entry first
- **AND** this payment has the transaction_id as its payment_id
- **AND** rental payments are generated after security deposit

### Requirement: Limit retroactive generation for performance
The system SHALL limit retroactive payment generation to a maximum of 6 months (approximately 26 weekly periods) from the start date to prevent performance issues.

#### Scenario: Start date within limit
- **WHEN** user creates ledger with start date 3 months ago
- **THEN** system generates all payment entries for the 3-month period

#### Scenario: Start date beyond limit
- **WHEN** user creates ledger with start date more than 6 months ago
- **THEN** system generates payments for only the most recent 6 months
- **AND** system displays a warning about omitted historical payments
