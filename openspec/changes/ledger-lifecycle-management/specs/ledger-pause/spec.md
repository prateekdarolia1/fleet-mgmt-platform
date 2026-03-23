# Ledger Pause - Specification

## Capability

Allow users to pause active rental ledgers when riders take breaks. Paused ledgers stop automatic payment generation but preserve all existing payment records.

## ADDED Requirements

### Requirement: Ledger status column exists
The system SHALL support a `status` column on `rider_ledgers` table.

#### Scenario: Status column with correct values
- **WHEN** querying ledger status
- **THEN** allowed values SHALL be: `active`, `paused`, `closed`

#### Scenario: Default status is active
- **WHEN** new ledger is created
- **THEN** status SHALL default to `active`

### Requirement: Pause action available for active ledgers
The system SHALL provide a "Pause Ledger" action in Ledger Management.

#### Scenario: Pause button visible for active ledger
- **WHEN** viewing ledger with status `active`
- **THEN** "Pause Ledger" button SHALL be visible and enabled

#### Scenario: Pause button hidden for non-active ledgers
- **WHEN** viewing ledger with status `paused` or `closed`
- **THEN** "Pause Ledger" button SHALL NOT be visible

### Requirement: Pause requires confirmation with reason
The system SHALL require user confirmation and a reason before pausing.

#### Scenario: Pause confirmation dialog
- **WHEN** user clicks "Pause Ledger"
- **THEN** confirmation dialog SHALL appear
- **AND** dialog SHALL require reason text input
- **AND** dialog SHALL NOT proceed without reason

#### Scenario: Pause cancelled
- **WHEN** user cancels pause confirmation
- **THEN** ledger status SHALL remain unchanged

### Requirement: Pause updates ledger record
The system SHALL update ledger status and record audit fields.

#### Scenario: Status changes to paused
- **WHEN** pause is confirmed
- **THEN** ledger.status SHALL change to `paused`
- **AND** `paused_at` SHALL be set to current timestamp
- **AND** `paused_reason` SHALL contain user-provided text

#### Scenario: Cannot pause non-active ledger
- **WHEN** attempting to pause ledger with status `paused` or `closed`
- **THEN** operation SHALL fail with error "Only active ledgers can be paused"

### Requirement: Paused ledgers excluded from payment generation
The system SHALL NOT generate new rental payments for paused ledgers.

#### Scenario: Cron skips paused ledgers
- **WHEN** payment generation cron job runs
- **THEN** ledgers with status `paused` SHALL be excluded from query
- **AND** no new payments SHALL be created for paused ledgers

#### Scenario: Existing payments preserved
- **WHEN** ledger is paused
- **THEN** all existing payment records SHALL remain unchanged
- **AND** pending payments SHALL still show in PaymentTracking
- **AND** overdue payments SHALL still show in PaymentTracking

## Database Migration Tests

```sql
-- TEST: Status column exists
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'rider_ledgers'
AND column_name = 'status';
-- Expected: status, 'active'
-- Failure means: Migration not run

-- TEST: Enum values exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_status')
ORDER BY enumsortorder;
-- Expected: active, paused, closed
-- Failure means: Enum migration incomplete

-- TEST: Pause audit columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'rider_ledgers'
AND column_name IN ('paused_at', 'paused_reason');
-- Expected: 2 rows
-- Failure means: Migration not run
```

## Unit Tests

```typescript
describe('pauseLedger', () => {
  it('sets status to paused for active ledger')
  it('throws error when pausing non-active ledger')
  it('sets paused_at timestamp')
  it('stores paused_reason text')
  it('does not modify existing payments')
})

describe('LedgerManagement UI', () => {
  it('shows Pause button for active ledger')
  it('hides Pause button for paused ledger')
  it('shows confirmation dialog with reason input')
  it('requires reason text before confirming')
})
```

## Integration Tests

```typescript
describe('Pause + Cron integration', () => {
  it('paused ledger is skipped by payment generation')
  it('active ledger continues generating payments')
  it('reactivated ledger resumes payment generation')
})
```

## Failure Diagnosis

| Symptom | Layer | Diagnosis |
|---------|-------|-----------|
| "column status does not exist" | DB | Migration not run |
| "invalid input value for enum ledger_status: paused" | DB | Enum not updated |
| Pause button not visible | Code | UI conditional wrong |
| "Only active ledgers can be paused" for active ledger | Code | Status check wrong |
| Payments still generated after pause | Code | Cron query missing filter |
| paused_at is NULL after pause | Code | Timestamp not set in code |
