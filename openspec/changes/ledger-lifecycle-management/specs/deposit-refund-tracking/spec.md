# Deposit Refund Tracking - Specification

## Capability

Track whether a rider's security deposit was refunded during a pause period. This affects whether a new deposit is required on reactivation.

## ADDED Requirements

### Requirement: Deposit status column exists
The system SHALL support a `security_deposit_status` column on `rider_ledgers` table.

#### Scenario: Column exists with correct values
- **WHEN** querying security_deposit_status enum
- **THEN** allowed values SHALL be: `retained`, `refunded`, `partially_refunded`

#### Scenario: Default status is retained
- **WHEN** new ledger is created
- **THEN** security_deposit_status SHALL default to `retained`

### Requirement: Mark deposit as refunded
The system SHALL allow marking a deposit as refunded during pause.

#### Scenario: Full refund
- **WHEN** user marks deposit as refunded
- **THEN** security_deposit_status SHALL change to `refunded`
- **AND** `deposit_refunded_at` SHALL be set to current timestamp
- **AND** `deposit_refunded_amount` SHALL equal original `security_deposit_amount`

#### Scenario: Partial refund
- **WHEN** user marks deposit as partially refunded with amount
- **THEN** security_deposit_status SHALL change to `partially_refunded`
- **AND** `deposit_refunded_amount` SHALL equal the partial amount

#### Scenario: Cannot mark non-paused ledger deposit
- **WHEN** attempting to mark deposit as refunded for active ledger
- **THEN** operation SHALL fail with error "Only paused ledgers can have deposits refunded"

### Requirement: Reactivation deposit validation
The system SHALL validate deposit status during reactivation.

#### Scenario: Retained deposit - no new deposit required
- **GIVEN** security_deposit_status = `retained`
- **WHEN** reactivating ledger
- **THEN** new deposit amount MAY be zero
- **AND** reactivation SHALL proceed

#### Scenario: Refunded deposit - new deposit required
- **GIVEN** security_deposit_status = `refunded`
- **WHEN** reactivating ledger with deposit_amount = 0
- **THEN** reactivation SHALL fail with error "Security deposit required (previous deposit was refunded)"

#### Scenario: Refunded deposit - new deposit accepted
- **GIVEN** security_deposit_status = `refunded`
- **WHEN** reactivating ledger with deposit_amount > 0
- **THEN** reactivation SHALL succeed
- **AND** new security deposit payment SHALL be created

#### Scenario: Partially refunded - only difference required
- **GIVEN** security_deposit_status = `partially_refunded`
- **AND** original deposit = 5000, refunded_amount = 3000
- **WHEN** reactivating ledger with new deposit = 2000
- **THEN** reactivation SHALL succeed

### Requirement: Deposit status visible in UI
The system SHALL display deposit status in Ledger Management.

#### Scenario: Status badge shown
- **WHEN** viewing paused ledger
- **THEN** deposit status badge SHALL display: "Retained", "Refunded", or "Partial Refund"

#### Scenario: Refund action available for paused ledgers
- **WHEN** viewing paused ledger with deposit_status = `retained`
- **THEN** "Mark Refunded" action SHALL be available

## Database Migration Tests

```sql
-- TEST: Deposit status column exists
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'rider_ledgers'
AND column_name = 'security_deposit_status';
-- Expected: security_deposit_status, 'retained'
-- Failure means: Migration not run

-- TEST: Enum values exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'security_deposit_status')
ORDER BY enumsortorder;
-- Expected: retained, refunded, partially_refunded
-- Failure means: Enum migration incomplete

-- TEST: Refund tracking columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'rider_ledgers'
AND column_name IN ('deposit_refunded_at', 'deposit_refunded_amount');
-- Expected: 2 rows
-- Failure means: Migration not run
```

## Unit Tests

```typescript
describe('markDepositRefunded', () => {
  it('sets status to refunded for full refund')
  it('sets status to partially_refunded for partial refund')
  it('records deposit_refunded_at timestamp')
  it('records deposit_refunded_amount')
  it('throws if ledger is not paused')
  it('throws if refund amount exceeds original deposit')
})

describe('ReactivationDialog deposit validation', () => {
  it('allows zero deposit when status is retained')
  it('requires deposit > 0 when status is refunded')
  it('calculates minimum deposit for partial refund')
  it('shows deposit status badge in dialog')
})
```

## Integration Tests

```typescript
describe('Deposit tracking + Reactivation', () => {
  it('retained deposit allows reactivation without new payment')
  it('refunded deposit requires new security deposit payment')
  it('partial refund calculates remaining required')
})
```

## Failure Diagnosis

| Symptom | Layer | Diagnosis |
|---------|-------|-----------|
| "column security_deposit_status does not exist" | DB | Migration not run |
| "invalid input value for enum" | DB | Enum migration incomplete |
| Mark Refunded button not visible | Code | UI conditional wrong |
| Reactivation allows zero deposit when refunded | Code | Validation missing |
| Partial refund calculation wrong | Code | Math logic bug |
