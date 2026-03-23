# Ledger Reactivation - Specification

## Capability

Allow users to reactivate paused ledgers when riders return. Validates eligibility, handles rental cycle changes (e.g., Wednesday → Friday), and regenerates future payments from new start date.

## ADDED Requirements

### Requirement: Reactivation eligibility validation
The system SHALL validate three conditions before allowing reactivation.

#### Scenario: All conditions met
- **WHEN** rider exists AND has paused ledger AND duty_status = 'IDLE'
- **THEN** reactivation SHALL be allowed

#### Scenario: Rider not IDLE
- **WHEN** rider duty_status is not 'IDLE'
- **THEN** reactivation SHALL fail with error "Rider must be IDLE to reactivate ledger"

#### Scenario: No paused ledger
- **WHEN** rider has no ledger with status `paused`
- **THEN** reactivation SHALL fail with error "No paused ledger found for this rider"

#### Scenario: Rider does not exist
- **WHEN** rider_id does not exist in riders table
- **THEN** reactivation SHALL fail with error "Rider not found"

### Requirement: Reactivation updates existing ledger
The system SHALL update the existing paused ledger record (not create new ledger).

#### Scenario: Ledger record reused
- **WHEN** reactivation completes
- **THEN** ledger.id SHALL remain unchanged
- **AND** ledger.status SHALL change to `active`
- **AND** `reactivated_at` SHALL be set to current timestamp

#### Scenario: Rental amount may change
- **WHEN** user specifies different rental_amount during reactivation
- **THEN** ledger.rental_amount SHALL be updated
- **AND** new payments SHALL use updated amount

#### Scenario: Rental frequency may change
- **WHEN** user specifies different rental_frequency during reactivation
- **THEN** ledger.rental_frequency SHALL be updated
- **AND** new payments SHALL follow new frequency

### Requirement: Rental cycle change handling
The system SHALL handle changes to the payment due day of week.

#### Scenario: Cycle day changes (Wednesday → Friday)
- **GIVEN** original payments were due every Wednesday
- **AND** reactivation start date is Friday 2024-03-15
- **WHEN** reactivation completes
- **THEN** new payments SHALL be due on Fridays
- **AND** first payment due_date SHALL be the reactivation start date

#### Scenario: Daily frequency unchanged
- **GIVEN** rental_frequency = 'daily'
- **WHEN** reactivation completes
- **THEN** payments SHALL continue daily from start date

### Requirement: Delete old pending payments before regeneration
The system SHALL delete existing pending payments before generating new ones.

#### Scenario: Pending payments deleted
- **GIVEN** paused ledger has 3 pending payments
- **WHEN** reactivation completes
- **THEN** payments with status `pending` SHALL be deleted
- **AND** new payments SHALL be generated from new start date

#### Scenario: Paid and overdue payments preserved
- **GIVEN** paused ledger has 2 paid and 1 overdue payment
- **WHEN** reactivation completes
- **THEN** paid payments SHALL remain unchanged
- **AND** overdue payments SHALL remain unchanged

### Requirement: Reactivation requires new start date
The system SHALL require a rental start date for reactivation.

#### Scenario: Start date required
- **WHEN** user submits reactivation without start date
- **THEN** validation SHALL fail with error "Rental start date is required"

#### Scenario: Start date cannot be before pause date
- **WHEN** user enters start date before paused_at
- **THEN** validation SHALL fail with error "Start date cannot be before pause date"

#### Scenario: Start date determines first payment due
- **WHEN** reactivation start date is 2024-03-15
- **THEN** first generated payment due_date SHALL be 2024-03-15

### Requirement: Reactivation records audit trail
The system SHALL track reactivation events.

#### Scenario: Reactivation audit fields populated
- **WHEN** reactivation completes
- **THEN** `reactivated_at` SHALL be set
- **AND** ledger status SHALL be `active`

## Database Migration Tests

```sql
-- TEST: Reactivation columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'rider_ledgers'
AND column_name IN ('reactivated_at');
-- Expected: 1 row
-- Failure means: Migration not run

-- TEST: Can query rider duty_status
SELECT column_name FROM information_schema.columns
WHERE table_name = 'riders' AND column_name = 'duty_status';
-- Expected: 1 row (column exists)
-- Failure means: Unexpected schema state
```

## Unit Tests

```typescript
describe('reactivateLedger', () => {
  it('throws if rider duty_status is not IDLE')
  it('throws if no paused ledger exists')
  it('throws if rider does not exist')
  it('updates ledger status to active')
  it('sets reactivated_at timestamp')
  it('updates rental_amount if provided')
  it('updates rental_frequency if provided')
  it('deletes existing pending payments')
  it('preserves paid and overdue payments')
  it('generates new payments from start date')
  it('generates payments on correct day of week (cycle change)')
})

describe('ReactivationDialog UI', () => {
  it('shows only for paused ledgers')
  it('requires start date input')
  it('allows changing rental amount')
  it('allows changing rental frequency')
  it('shows warning about cycle day change')
  it('validates start date >= pause date')
})
```

## Integration Tests

```typescript
describe('Full reactivation flow', () => {
  it('active → pause → reactivate returns to active')
  it('new payments generated on correct cycle after reactivation')
  it('deposit validation works with deposit tracking')
})

describe('Cycle change scenarios', () => {
  it('daily → daily continues daily')
  it('weekly (Wed) → weekly (Fri) generates Friday payments')
  it('monthly (1st) → monthly (15th) generates 15th payments')
})
```

## Failure Diagnosis

| Symptom | Layer | Diagnosis |
|---------|-------|-----------|
| "column reactivated_at does not exist" | DB | Migration not run |
| Reactivation succeeds for non-IDLE rider | Code | Validation missing |
| "No paused ledger found" for paused ledger | Code | Query filter wrong |
| New payments on wrong day of week | Code | Cycle calculation bug |
| Old pending payments not deleted | Code | Delete logic missing |
| Paid payments deleted | Code | Delete filter missing (should only delete pending) |
