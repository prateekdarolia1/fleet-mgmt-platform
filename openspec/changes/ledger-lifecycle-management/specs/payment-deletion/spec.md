# Payment Deletion - Specification

## Capability

Allow users to delete individual payment records from the Edit Payment modal. Deletion is a soft delete (status change to `cancelled`) with full audit trail.

## ADDED Requirements

### Requirement: Cancelled payment status exists
The system SHALL support a `cancelled` status in the `payment_status` enum.

#### Scenario: Payment status enum includes cancelled
- **WHEN** database migration runs
- **THEN** `payment_status` enum SHALL include values: `pending`, `paid`, `overdue`, `partial`, `cancelled`

### Requirement: Soft delete with audit trail
The system SHALL mark payments as cancelled (not hard delete) when user requests deletion.

#### Scenario: Delete pending payment
- **WHEN** user deletes a payment with status `pending`
- **THEN** payment status SHALL change to `cancelled`
- **AND** `cancelled_at` SHALL be set to current timestamp
- **AND** `cancelled_by` SHALL record user identifier
- **AND** payment record SHALL remain in database

#### Scenario: Delete overdue payment
- **WHEN** user deletes a payment with status `overdue`
- **THEN** payment status SHALL change to `cancelled`
- **AND** all audit fields SHALL be populated

#### Scenario: Cannot delete paid payment
- **WHEN** user attempts to delete a payment with status `paid`
- **THEN** operation SHALL fail with error "Cannot delete paid payments"
- **AND** payment status SHALL remain `paid`

### Requirement: Delete button in Edit Payment modal
The system SHALL provide a Delete button in the Edit Payment dialog.

#### Scenario: Delete button visible for cancellable payments
- **WHEN** user opens Edit Payment modal for pending or overdue payment
- **THEN** Delete button SHALL be visible and enabled

#### Scenario: Delete button hidden for paid payments
- **WHEN** user opens Edit Payment modal for paid payment
- **THEN** Delete button SHALL NOT be visible

#### Scenario: Delete requires confirmation
- **WHEN** user clicks Delete button
- **THEN** confirmation dialog SHALL appear with message "Cancel this payment? This cannot be undone."
- **AND** payment SHALL NOT be cancelled until confirmed

### Requirement: Cancelled payments excluded from calculations
The system SHALL exclude cancelled payments from all financial calculations and overdue counts.

#### Scenario: Cancelled payments not counted as overdue
- **WHEN** calculating overdue payment count
- **THEN** payments with status `cancelled` SHALL NOT be included

#### Scenario: Cancelled payments not in total due
- **WHEN** calculating total amount due
- **THEN** sum SHALL exclude payments with status `cancelled`

## Database Migration Tests

These tests verify the migration ran successfully. If they fail, the issue is in the database layer.

```sql
-- TEST: Enum value exists
SELECT EXISTS (
  SELECT 1 FROM pg_enum
  WHERE enumlabel = 'cancelled'
  AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
);
-- Expected: true
-- Failure means: Migration not run

-- TEST: Columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'payments'
AND column_name IN ('cancelled_at', 'cancelled_by');
-- Expected: 2 rows
-- Failure means: Migration not run
```

## Unit Tests

These tests verify code logic. If migration tests pass but these fail, the issue is in the code layer.

```typescript
describe('deletePayment', () => {
  it('throws error when trying to delete paid payment')
  it('sets status to cancelled for pending payment')
  it('sets cancelled_at timestamp')
  it('records cancelled_by user')
  it('returns updated payment with cancelled status')
})

describe('PaymentEditModal', () => {
  it('shows delete button for pending payment')
  it('hides delete button for paid payment')
  it('shows confirmation dialog on delete click')
  it('calls deletePayment on confirmation')
})
```

## Failure Diagnosis

| Symptom | Layer | Diagnosis |
|---------|-------|-----------|
| "invalid input value for enum payment_status: cancelled" | DB | Migration not run |
| Column "cancelled_at" does not exist | DB | Migration not run |
| Delete button not showing | Code | UI component bug |
| "Cannot delete paid payments" error for pending payment | Code | Status check logic wrong |
| Cancelled payments still in overdue count | Code | Query filter missing |
