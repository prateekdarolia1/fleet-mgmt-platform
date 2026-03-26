# Design: Fix Retroactive Payment Generation

## Context

### Current State
The fleet management platform has a dual-table architecture for ledgers/payments:
- **UI Layer**: Uses `rider_ledgers` + `payments` tables via `useRiderLedgers` hook
- **RPC Layer**: Uses `rental_ledgers` + `rental_payments` tables via Supabase RPC functions

These two systems don't communicate, causing:
- Payment generation code exists in `useRiderLedgers.ts` but fails silently
- RPC functions like `confirm_rental_start` only generate 2 payments
- UNIQUE constraint violations on `payment_id` during bulk inserts
- No retroactive payment generation for gap periods

### Constraints
- Must maintain backward compatibility with existing ledgers
- Cannot use database-level auto-increment (payment_id is not serial/identity)
- RLS policies are currently disabled but may be re-enabled
- Migration must handle existing data without data loss

## Goals / Non-Goals

**Goals:**
- Fix payment generation for retroactive ledger creation (past start dates)
- Generate gap-period payments when reactivating paused ledgers
- Eliminate payment_id UNIQUE constraint violations
- Provide clear error messages for debugging
- **Make `rider_ledgers`/`payments` and `rental_ledgers`/`rental_payments` sync properly**
- **Ensure reactivation works correctly across both table systems**

**Non-Goals:**
- UI/UX redesign of activation vs reactivation workflows
- Database-level payment_id sequencing (using application-level solution)

## Decisions

### 1. Application-Level Payment ID Sequencing
**Decision**: Use `MAX(payment_id) + 1` with transaction-safe lock instead of database sequence.

**Rationale**:
- `payment_id` uses `P###` format (e.g., P001, P002) which doesn't map to PostgreSQL sequences
- Adding a sequence would require schema migration and breaking existing format
- Application-level approach allows immediate fix without migration

**Alternatives Considered**:
- Database serial/identity column: Would require breaking P### format
- UUID-based IDs: Not user-friendly for display/reference
- Composite key: Would require changing foreign key references

### 2. Batch Insert with Transaction Rollback
**Decision**: Wrap payment inserts in a Supabase transaction; if any insert fails due to ID collision, re-calculate the next ID and retry.

**Rationale**:
- UNIQUE constraint violations can still occur with concurrent requests
- Transaction ensures atomicity - all payments succeed or none do
- Retry logic handles edge cases where MAX changes between read and write

**Implementation**:
```typescript
const insertPaymentsWithRetry = async (payments: Payment[], maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: maxId } = await supabase
      .from('payments')
      .select('payment_id')
      .order('payment_id', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = maxId ? parseInt(maxId.payment_id.substring(1)) + 1 : 1;
    const paymentsWithIds = payments.map((p, i) => ({
      ...p,
      payment_id: `P${(nextNumber + i).toString().padStart(3, '0')}`
    }));

    const { error } = await supabase
      .from('payments')
      .insert(paymentsWithIds);

    if (!error) return { success: true };
    if (!error.message.includes('unique constraint')) break;
  }
  throw new Error('Failed to insert payments after retries');
};
```

### 3. Retroactive Payment Calculation Algorithm
**Decision**: Calculate number of periods between start date and current date, generate payments with appropriate status (overdue for past, pending for future).

**Rationale**:
- Weekly frequency: Generate payment for every 7-day period
- Daily frequency: Generate payment for every day
- Monthly frequency: Generate payment for every calendar month
- Status logic: Past payments = `overdue`, current/future = `pending`

**Algorithm**:
```typescript
const generateRetroactivePayments = (ledger: Ledger, startDate: Date, today: Date) => {
  const payments: Payment[] = [];
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let periodDays: number;
  switch (ledger.rental_frequency) {
    case 'daily': periodDays = 1; break;
    case 'weekly': periodDays = 7; break;
    case 'monthly': periodDays = 30; break;
  }

  const numPeriods = Math.ceil(diffDays / periodDays);

  for (let i = 0; i <= numPeriods; i++) {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * periodDays));

    const status = dueDate < today ? 'overdue' : 'pending';

    payments.push({
      rider_id: ledger.rider_id,
      ledger_id: ledger.id,
      due_date: dueDate.toISOString().split('T')[0],
      amount_due: ledger.rental_amount,
      status,
      week_number: i + 1
    });
  }

  return payments;
};
```

### 4. Gap Period Payment Generation on Reactivation
**Decision**: When reactivating a paused ledger, calculate the gap between `paused_at` and new `start_date`, generate payments for that period with `overdue` status.

**Rationale**:
- Rider was using the vehicle during the gap period (rental continued)
- Business logic: payments should have been generated but weren't due to pause
- Status as `overdue` reflects that these payments are late

**Edge Case**: If `reactivated_at` is set (already reactivated before), skip gap payment generation to avoid duplicates.

### 5. Error Handling & User Feedback
**Decision**: Catch Supabase errors and display actual error messages via toast notifications instead of generic "failed to create ledger".

**Implementation**:
```typescript
try {
  await createLedger(ledgerData);
  toast.success('Ledger created successfully');
} catch (error) {
  console.error('Ledger creation error:', error);
  toast.error(`Failed to create ledger: ${error.message}`);
}
```

### 6. Dual-Table Synchronization Strategy
**Decision**: Make `rider_ledgers`/`payments` (UI layer) the **source of truth** and sync to `rental_ledgers`/`rental_payments` (RPC layer) via database triggers.

**Rationale**:
- UI layer is where all user interactions happen (create, pause, reactivate)
- RPC layer is legacy but may still be used by Edge Functions or external services
- Triggers ensure automatic sync without application code complexity
- Single source of truth prevents data divergence

**Sync Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  useRiderLedgers.ts (React Hook)                                │
│    ├─ createLedger()    → writes to rider_ledgers               │
│    ├─ pauseLedger()     → updates rider_ledgers.status          │
│    └─ reactivateLedger() → updates rider_ledgers + generates    │
│                            payments for both tables             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ application writes here
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Layer (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐         triggers          ┌─────────────────────┐│
│  │  rider_ledgers      │──────────────────────────▶│  rental_ledgers      ││
│  │  (source of truth)  │   sync on INSERT/UPDATE  │  (synced copy)      ││
│  └─────────────────────┘                          └─────────────────────┘│
│           │                                               │          │
│           │ FK                                             │ FK       │
│           ▼                                               ▼          │
│  ┌─────────────────────┐         triggers          ┌─────────────────────┐│
│  │  payments           │──────────────────────────▶│  rental_payments    ││
│  │  (source of truth)  │   sync on INSERT/UPDATE  │  (synced copy)      ││
│  └─────────────────────┘                          └─────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Implementation via Database Triggers**:

```sql
-- Trigger: Sync rider_ledgers → rental_ledgers
CREATE OR REPLACE FUNCTION sync_rider_ledger_to_rental()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rental_ledgers (
    id, rider_id, rider_name, rental_amount, rental_frequency,
    rental_start_date, status, security_deposit_amount,
    paused_at, paused_reason, reactivated_at
  ) VALUES (
    NEW.id, NEW.rider_id, NEW.rider_name, NEW.rental_amount,
    NEW.rental_frequency, NEW.rental_start_date, NEW.status,
    NEW.security_deposit_amount, NEW.paused_at, NEW.paused_reason,
    NEW.reactivated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    paused_at = EXCLUDED.paused_at,
    reactivated_at = EXCLUDED.reactivated_at,
    rental_amount = EXCLUDED.rental_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_rider_to_rental
  AFTER INSERT OR UPDATE ON rider_ledgers
  FOR EACH ROW EXECUTE FUNCTION sync_rider_ledger_to_rental();

-- Trigger: Sync payments → rental_payments
CREATE OR REPLACE FUNCTION sync_payment_to_rental()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rental_payments (
    id, ledger_id, week_number, due_date, amount_due, status
  ) VALUES (
    NEW.id, NEW.ledger_id, NEW.week_number, NEW.due_date,
    NEW.amount_due, NEW.status
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    amount_due = EXCLUDED.amount_due;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_payment_to_rental
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_payment_to_rental();
```

### 7. Reverse Sync for Reactivation Edge Case
**Decision**: When `reactivateLedger()` generates gap payments, write to BOTH `payments` and `rental_payments` explicitly to ensure reactivation never fails.

**Rationale**:
- Triggers handle normal sync, but bulk gap payment generation is time-sensitive
- Writing to both tables explicitly ensures retroactive payments appear in both systems immediately
- Prevents race conditions where RPC functions might read stale data

**Implementation**:
```typescript
const reactivateLedger = async (ledgerId: string, params: ReactivationParams) => {
  // Generate gap payments
  const gapPayments = generateGapPayments(ledger, params);

  // Insert into BOTH tables explicitly
  await Promise.all([
    supabase.from('payments').insert(gapPayments),
    supabase.from('rental_payments').insert(gapPayments.map(toRentalPaymentFormat))
  ]);
};
```

## Risks / Trade-offs

### Risk 1: Concurrent Payment ID Collisions
**Risk**: Two users create ledgers simultaneously, both read MAX(payment_id) at the same time, generate duplicate IDs.

**Mitigation**: Transaction-based retry logic (up to 3 attempts). If all retries fail, surface the error to user with retry option.

### Risk 2: Performance of Bulk Payment Inserts
**Risk**: Generating 50+ retroactive payments for a year-old ledger could timeout or slow down the UI.

**Mitigation**:
- Limit retroactive generation to max 6 months (configurable)
- Show loading indicator during payment generation
- Consider background job for large batches (future enhancement)

### Risk 3: Incorrect Gap Period Calculation
**Risk**: If `paused_at` is null or new `start_date` is before `paused_at`, calculation could generate wrong payments.

**Mitigation**:
- Validation: require `start_date >= paused_at` in reactivation dialog
- Null check: only generate gap payments if `paused_at` exists
- Add unit tests for edge cases

### Risk 4: Trigger Failure Causes Silent Sync Failures
**Risk**: If database triggers fail (e.g., permission issues, schema changes), `rider_ledgers` updates succeed but `rental_ledgers` doesn't sync.

**Mitigation**:
- Wrap trigger logic in BEGIN/EXCEPTION blocks to log failures
- Add monitoring for sync lag (compare row counts between tables)
- Create a sync repair function that can be run manually
- Log trigger failures to a dedicated `sync_errors` table

### Risk 5: Schema Drift Between Tables
**Risk**: `rider_ledgers` has columns that `rental_ledgers` doesn't (or vice versa), causing trigger failures.

**Mitigation**:
- Audit both schemas before implementing triggers
- Add missing columns to `rental_ledgers`/`rental_payments` first
- Use COALESCE in triggers for optional columns

### Risk 6: Performance Impact of Triggers
**Risk**: Every INSERT/UPDATE to `rider_ledgers`/`payments` now triggers additional writes, potentially slowing down operations.

**Mitigation**:
- Benchmark trigger performance with bulk inserts (50+ payments)
- Consider using DEFERRED triggers if performance is unacceptable
- Add timing logs to measure trigger execution duration

## Migration Plan

### Phase 1: Schema Audit & Alignment (Day 1)
1. Audit column differences between `rider_ledgers` vs `rental_ledgers`
2. Audit column differences between `payments` vs `rental_payments`
3. Add missing columns to `rental_ledgers`/`rental_payments` as needed
4. Verify foreign key relationships are compatible

### Phase 2: Database Triggers (Day 1-2)
1. Create `sync_rider_ledger_to_rental()` function
2. Create `sync_payment_to_rental()` function
3. Install triggers on `rider_ledgers` (INSERT, UPDATE)
4. Install triggers on `payments` (INSERT, UPDATE)
5. Test triggers with sample data
6. Add `sync_errors` table for trigger failure logging

### Phase 3: Payment ID Sequencing (Day 2-3)
1. Update `createLedger()` in `useRiderLedgers.ts` to use transaction-safe ID generation
2. Add retry logic for UNIQUE constraint violations
3. Test with concurrent ledger creation
4. Verify IDs sync to `rental_payments` via triggers

### Phase 4: Retroactive Payment Generation (Day 3-4)
1. Implement `generateRetroactivePayments()` algorithm
2. Update `createLedger()` to call this for past start dates
3. Add loading indicator during payment generation
4. Test with various start dates (1 week ago, 1 month ago, 6 months ago)
5. Verify payments sync to `rental_payments` via triggers

### Phase 5: Gap Period Payments with Dual-Write (Day 4-5)
1. Update `reactivateLedger()` to calculate gap period
2. Generate overdue payments for gap between `paused_at` and new `start_date`
3. Add validation to prevent `start_date < paused_at`
4. Implement dual-write: insert into `payments` AND `rental_payments` explicitly
5. Test reactivation flow
6. Verify both tables have identical gap payments

### Phase 6: Error Handling & Monitoring (Day 5)
1. Replace generic error messages with actual Supabase errors
2. Add toast notifications for success/failure
3. Add console logging for debugging
4. Create sync repair function for manual trigger failure recovery
5. Add row count comparison monitoring

### Rollback Strategy
- **Triggers**: Can be dropped instantly if they cause issues (`DROP TRIGGER ...`)
- **Application code**: Revert `useRiderLedgers.ts` to previous version
- **Data**: No data migration = no rollback risk
- **Dual-writes**: If dual-write causes issues, fall back to trigger-only sync

## Open Questions

1. **Max Retroactive Period**: Should we cap retroactive payment generation at 6 months? 1 year? No limit?
   - **Recommendation**: Start with 6-month limit, monitor performance, adjust as needed.

2. **Payment ID Format**: Should we keep `P###` format or switch to numeric-only for easier sequencing?
   - **Recommendation**: Keep `P###` for backward compatibility; it's user-friendly.

3. **Trigger Performance**: At what bulk insert size should we switch from triggers to application-level dual-write?
   - **Recommendation**: Benchmark with 10, 25, 50, 100 payment inserts. If triggers take >500ms for bulk inserts, use dual-write for bulk operations only.
