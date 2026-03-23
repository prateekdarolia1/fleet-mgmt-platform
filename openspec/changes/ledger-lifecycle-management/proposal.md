# Ledger Lifecycle Management

## Why

Riders sometimes pause their rental service (go home, take breaks) and return later. Currently, there's no way to:
1. Remove unneeded payment records for paused periods
2. Pause a ledger to stop automatic payment generation
3. Reactivate a paused ledger when the rider returns

This creates data clutter, incorrect overdue counts, and forces workarounds like deleting entire ledgers.

## What Changes

### 1. Payment Deletion from Edit Modal
- Add "Delete" button to Edit Payment dialog
- Users can selectively remove payments 1-by-1 (pending/overdue only)
- Soft delete with audit trail (mark as `cancelled` status, not hard delete)
- **BREAKING**: Adds `cancelled` to `payment_status` enum

### 2. Ledger Pause Functionality
- New "Pause Ledger" action on active ledgers
- Status transitions: `active` → `paused`
- Stops automatic payment generation (cron job respects `paused` status)
- Does NOT delete existing payments (user does this manually)

### 3. Ledger Reactivation
- New "Reactivate Ledger" action (only for paused ledgers)
- **Eligibility validation**: rider exists + has paused ledger + `duty_status = 'IDLE'`
- Updates EXISTING ledger record (not new record)
- Handles rental cycle changes (e.g., Wednesday → Friday)
- Regenerates future pending payments from new start date

### 4. Security Deposit Refund Tracking
- Track if deposit was refunded during pause
- Field: `security_deposit_status` with values: `retained` | `refunded` | `partially_refunded`
- Reactivation validation checks deposit status

## Capabilities

### New Capabilities

| Capability | Description | Testable? |
|------------|-------------|-----------|
| `payment-deletion` | Delete individual payments from edit modal | ✅ Unit + Integration |
| `ledger-pause` | Pause active ledgers, stop payment generation | ✅ Unit + Integration |
| `ledger-reactivation` | Reactivate paused ledgers with validation | ✅ Unit + Integration |
| `deposit-refund-tracking` | Track security deposit refund status | ✅ Unit |

### Modified Capabilities

| Capability | Change |
|------------|--------|
| `rental-ledger` | Adds `paused` status, `paused_at`, `paused_reason`, `reactivated_at` fields |
| (payment enum) | Adds `cancelled` to `payment_status` enum |

## Impact

### Database Migrations Required
```
1. rider_ledgers table:
   - ADD status VARCHAR DEFAULT 'active'
   - ADD paused_at TIMESTAMP NULL
   - ADD paused_reason TEXT NULL
   - ADD reactivated_at TIMESTAMP NULL
   - ADD security_deposit_status VARCHAR DEFAULT 'retained'

2. payment_status enum:
   - ADD 'cancelled' value

3. payments table:
   - ADD cancelled_at TIMESTAMP NULL
   - ADD cancelled_by TEXT NULL
```

### Code Changes
- `src/hooks/usePayments.ts` - Add `deletePayment()` function
- `src/hooks/useRiderLedgers.ts` - Add `pauseLedger()`, `reactivateLedger()` functions
- `src/components/fleet/PaymentTracking.tsx` - Add delete button to edit modal
- `src/components/fleet/LedgerManagement.tsx` - Add pause/reactivate buttons

### Downstream Effects
- Payment cron job: Skip ledgers with `status = 'paused'`
- Overdue calculations: Exclude `status = 'cancelled'` payments
- Dashboard stats: Count paused ledgers separately

## Test Strategy

### Unit Tests (Code Layer)
Each capability has isolated unit tests:
```typescript
// payment-deletion.spec.ts
describe('deletePayment', () => {
  it('marks payment as cancelled (not hard delete)')
  it('only allows cancelling pending/overdue payments')
  it('records cancelled_at timestamp')
})

// ledger-pause.spec.ts
describe('pauseLedger', () => {
  it('sets status to paused')
  it('sets paused_at timestamp')
  it('throws if ledger not active')
})

// ledger-reactivation.spec.ts
describe('reactivateLedger', () => {
  it('validates rider duty_status is IDLE')
  it('throws if ledger not paused')
  it('regenerates payments from new start date')
  it('handles rental frequency change (wed → fri)')
})
```

### Integration Tests (Database + Code)
Tests that verify database + code work together:
```typescript
// ledger-lifecycle.integration.spec.ts
describe('Full lifecycle', () => {
  it('active → pause → reactivation flow works end-to-end')
  it('paused ledger is skipped by payment generation cron')
  it('cancelled payments excluded from overdue count')
})
```

### Migration Verification Tests
Tests that detect migration vs code failures:
```typescript
// migrations.spec.ts
describe('Database migrations', () => {
  it('rider_ledgers.status column exists')
  it('rider_ledgers.status default is active')
  it('payment_status enum includes cancelled')
  it('security_deposit_status column exists')

  // These fail if migration didn't run
  it('can insert ledger with status=paused')
  it('can insert payment with status=cancelled')
})
```

### Failure Diagnosis Matrix

| Symptom | Migration Issue | Code Issue |
|---------|-----------------|------------|
| "column status does not exist" | Migration not run | N/A |
| "invalid input value for enum" | Enum not updated | N/A |
| Pause button not showing | N/A | UI not implemented |
| Payment still generated after pause | N/A | Cron not checking status |
| Reactivation validation passes incorrectly | N/A | Missing duty_status check |

## Risks

| Risk | Mitigation |
|------|------------|
| Accidental payment deletion | Soft delete only, audit trail, confirmation dialog |
| Cron job still generates payments | Add integration test for cron skip logic |
| Deposit tracking inconsistent | Single source of truth in ledger record |
| Cycle change confuses users | Show "Previous: Wed, New: Fri" in reactivation UI |

## Dependencies

- Existing `useRiderLedgers` hook
- Existing `usePayments` hook
- Payment generation cron job (needs modification)
- Rider `duty_status` field (already exists)
