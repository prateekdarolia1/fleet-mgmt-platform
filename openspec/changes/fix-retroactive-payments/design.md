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

**Non-Goals:**
- Full unification of dual-table system (deferred to separate change)
- Migration of existing `rental_ledgers`/`rental_payments` data
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

### Risk 4: Dual-Table Architecture Confusion
**Risk**: Developers may continue using `rental_ledgers`/`rental_payments` not realizing they're disconnected.

**Mitigation**:
- Add deprecation warnings to RPC function comments
- Document architecture decision in code
- Plan future cleanup change (out of scope for this fix)

## Migration Plan

### Phase 1: Payment ID Sequencing (Week 1)
1. Update `createLedger()` in `useRiderLedgers.ts` to use transaction-safe ID generation
2. Add retry logic for UNIQUE constraint violations
3. Test with concurrent ledger creation

### Phase 2: Retroactive Payment Generation (Week 1)
1. Implement `generateRetroactivePayments()` algorithm
2. Update `createLedger()` to call this for past start dates
3. Add loading indicator during payment generation
4. Test with various start dates (1 week ago, 1 month ago, 6 months ago)

### Phase 3: Gap Period Payments (Week 2)
1. Update `reactivateLedger()` to calculate gap period
2. Generate overdue payments for gap between `paused_at` and new `start_date`
3. Add validation to prevent `start_date < paused_at`
4. Test reactivation flow

### Phase 4: Error Handling (Week 2)
1. Replace generic error messages with actual Supabase errors
2. Add toast notifications for success/failure
3. Add console logging for debugging

### Rollback Strategy
- All changes are in application code (no schema changes)
- Revert `useRiderLedgers.ts` to previous version if issues arise
- No data migration required

## Open Questions

1. **Max Retroactive Period**: Should we cap retroactive payment generation at 6 months? 1 year? No limit?
   - **Recommendation**: Start with 6-month limit, monitor performance, adjust as needed.

2. **Dual-Table Cleanup**: Should we deprecate `rental_ledgers`/`rental_payments` entirely or migrate to unified system?
   - **Recommendation**: Defer to separate change after this fix is stable.

3. **Payment ID Format**: Should we keep `P###` format or switch to numeric-only for easier sequencing?
   - **Recommendation**: Keep `P###` for backward compatibility; it's user-friendly.
