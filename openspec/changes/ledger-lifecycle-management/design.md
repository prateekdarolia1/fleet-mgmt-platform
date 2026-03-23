# Ledger Lifecycle Management - Design

## Context

The Fleet Management Platform currently supports creating rental ledgers and generating payments, but lacks lifecycle management for riders who temporarily leave and return. This creates:

- **Stale payments**: Pending/overdue payments accumulate during absence
- **No pause mechanism**: No way to stop payment generation temporarily
- **Manual workarounds**: Staff delete entire ledgers instead of pausing

**Current Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Current Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Create Ledger ──▶ Generate Payments ──▶ Cron (ongoing)     │
│        │                                                    │
│        └──▶ NO pause option                                 │
│        └──▶ NO selective payment deletion                   │
│        └──▶ NO reactivation workflow                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Stakeholders:**
- Fleet managers (use UI to pause/reactivate)
- Riders (expect correct payment records)
- Finance team (needs accurate overdue counts)

## Goals / Non-Goals

**Goals:**
1. Enable selective deletion of pending/overdue payments
2. Implement ledger pause with audit trail
3. Implement ledger reactivation with eligibility validation
4. Track security deposit refund status during pauses
5. Maintain backward compatibility with existing ledgers

**Non-Goals:**
- Bulk payment deletion (future consideration)
- Automated pause based on rider inactivity
- Refund processing (tracking only)
- Editing historical payment records

## Decisions

### D1: Soft Delete vs Hard Delete for Payments

**Decision:** Soft delete (status = `cancelled`)

**Rationale:**
- Preserves audit trail for financial records
- Allows "undo" functionality in future
- Maintains referential integrity with ledger

**Alternatives Considered:**
| Approach | Pros | Cons |
|----------|------|------|
| Hard delete | Cleaner data | No audit trail, FK issues |
| Soft delete | Audit trail, reversible | More queries need filtering |
| Archive table | Clean main table | Additional complexity |

**Implementation:**
```sql
-- Add cancelled status to enum
ALTER TYPE payment_status ADD VALUE 'cancelled';

-- Add audit columns
ALTER TABLE payments
  ADD COLUMN cancelled_at TIMESTAMP NULL,
  ADD COLUMN cancelled_by TEXT NULL;
```

### D2: Ledger Status Column vs Separate State Table

**Decision:** Add `status` column to `rider_ledgers` table

**Rationale:**
- Simpler queries (single table)
- Follows existing patterns (riders.status, vehicles.status)
- Easier to add indexes

**Alternatives Considered:**
| Approach | Pros | Cons |
|----------|------|------|
| Status column | Simple, familiar | Migration required |
| State table | History tracking | Complex joins |
| JSON field | Flexible | No type safety, no indexes |

**Schema:**
```sql
CREATE TYPE ledger_status AS ENUM ('active', 'paused', 'closed');

ALTER TABLE rider_ledgers
  ADD COLUMN status ledger_status DEFAULT 'active',
  ADD COLUMN paused_at TIMESTAMP NULL,
  ADD COLUMN paused_reason TEXT NULL,
  ADD COLUMN reactivated_at TIMESTAMP NULL;
```

### D3: Reactivation Eligibility Check Location

**Decision:** Client-side validation + server-side enforcement

**Rationale:**
- Immediate UI feedback (no network call for basic checks)
- Server-side ensures data integrity
- Follows existing patterns (createLedger validation)

**Implementation:**
```typescript
// Client-side (useRiderLedgers.ts)
const canReactivate = async (riderId: string) => {
  const { data: rider } = await supabase
    .from('riders')
    .select('rider_id, duty_status')
    .eq('rider_id', riderId)
    .single();

  const { data: ledger } = await supabase
    .from('rider_ledgers')
    .select('id, status')
    .eq('rider_id', riderId)
    .eq('status', 'paused')
    .single();

  return {
    eligible: rider?.duty_status === 'IDLE' && ledger?.status === 'paused',
    reasons: [
      !rider && 'Rider not found',
      rider?.duty_status !== 'IDLE' && 'Rider must be IDLE',
      !ledger && 'No paused ledger found',
    ].filter(Boolean),
  };
};
```

### D4: Payment Regeneration on Reactivation

**Decision:** Delete pending payments, regenerate from new start date

**Rationale:**
- Clean slate avoids duplicate/conflicting payments
- New cycle day (e.g., Wed → Fri) requires new payment dates
- Preserves paid/overdue history

**Implementation:**
```typescript
const reactivateLedger = async (ledgerId: string, params: ReactivationParams) => {
  // 1. Validate eligibility
  await validateReactivationEligibility(params.rider_id);

  // 2. Delete pending payments (preserve paid/overdue)
  await supabase
    .from('payments')
    .delete()
    .eq('ledger_id', ledgerId)
    .eq('status', 'pending');

  // 3. Update ledger
  await supabase
    .from('rider_ledgers')
    .update({
      status: 'active',
      reactivated_at: new Date().toISOString(),
      rental_amount: params.rental_amount,
      rental_frequency: params.rental_frequency,
    })
    .eq('id', ledgerId);

  // 4. Generate new payments from start date
  await generateRentalPayments(ledgerId, params.start_date);
};
```

### D5: Security Deposit Status Tracking

**Decision:** Add `security_deposit_status` enum column

**Rationale:**
- Simple 3-state model (retained/refunded/partial)
- Enables validation on reactivation
- Single source of truth

**Schema:**
```sql
CREATE TYPE security_deposit_status AS ENUM ('retained', 'refunded', 'partially_refunded');

ALTER TABLE rider_ledgers
  ADD COLUMN security_deposit_status security_deposit_status DEFAULT 'retained',
  ADD COLUMN deposit_refunded_at TIMESTAMP NULL,
  ADD COLUMN deposit_refunded_amount NUMERIC NULL;
```

## Architecture

### State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LEDGER STATE MACHINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐                                                       │
│   │    ACTIVE    │◄─────────────────────────────────────────┐           │
│   │              │                                          │           │
│   │  • Generate  │           Pause Ledger                  │           │
│   │    payments  │───────────────────────┐                 │           │
│   │  • Cron      │                       │                 │           │
│   │    processes │                       ▼                 │           │
│   └──────┬───────┘              ┌──────────────┐           │           │
│          │                      │    PAUSED    │           │           │
│          │                      │              │───────────┘           │
│          │ Close                │  • No new    │  Reactivate           │
│          │                      │    payments  │  Ledger               │
│          ▼                      │  • Cron      │                        │
│   ┌──────────────┐              │    skips     │                        │
│   │    CLOSED    │              └──────────────┘                        │
│   │              │                                                      │
│   │  • No        │                                                      │
│   │    activity  │                                                      │
│   └──────────────┘                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UI LAYER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │  LedgerManagement   │    │  PaymentTracking    │                     │
│  │                     │    │                     │                     │
│  │  • Pause button     │    │  • Delete button    │                     │
│  │  • Reactivate btn   │    │    in Edit modal    │                     │
│  │  • Deposit status   │    │  • Confirmation     │                     │
│  └──────────┬──────────┘    └──────────┬──────────┘                     │
│             │                          │                                 │
│             ▼                          ▼                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ PauseLedgerDialog   │    │ DeletePaymentDialog │                     │
│  │ ReactivateDialog    │    │                     │                     │
│  └──────────┬──────────┘    └──────────┬──────────┘                     │
│             │                          │                                 │
└─────────────┼──────────────────────────┼─────────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          HOOKS LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │  useRiderLedgers    │    │   usePayments       │                     │
│  │                     │    │                     │                     │
│  │  • pauseLedger()    │    │  • deletePayment()  │                     │
│  │  • reactivateLedger│    │  • canDelete()      │                     │
│  │  • canReactivate()  │    │                     │                     │
│  └──────────┬──────────┘    └──────────┬──────────┘                     │
│             │                          │                                 │
└─────────────┼──────────────────────────┼─────────────────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   rider_ledgers     │    │     payments        │                     │
│  │                     │    │                     │                     │
│  │  • status           │    │  • status (enum)    │                     │
│  │  • paused_at        │    │    + 'cancelled'    │                     │
│  │  • paused_reason    │    │  • cancelled_at     │                     │
│  │  • reactivated_at   │    │  • cancelled_by     │                     │
│  │  • security_        │    │                     │                     │
│  │    deposit_status   │    │                     │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Reactivation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACTIVATION DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User clicks "Reactivate"                                            │
│         │                                                                │
│         ▼                                                                │
│  2. Validate eligibility                                                │
│         │                                                                │
│         ├──▶ rider exists?                                              │
│         ├──▶ ledger status = paused?                                    │
│         ├──▶ duty_status = IDLE?                                        │
│         └──▶ deposit validation (if refunded, require new deposit)      │
│         │                                                                │
│         ▼                                                                │
│  3. Collect reactivation params                                         │
│         │                                                                │
│         ├──▶ new start date (required)                                  │
│         ├──▶ rental amount (optional, defaults to current)              │
│         └──▶ rental frequency (optional, defaults to current)           │
│         │                                                                │
│         ▼                                                                │
│  4. Delete pending payments                                             │
│         │                                                                │
│         └──▶ DELETE FROM payments WHERE ledger_id = ? AND status = ?    │
│              AND status = 'pending'                                      │
│         │                                                                │
│         ▼                                                                │
│  5. Update ledger record                                                │
│         │                                                                │
│         └──▶ status = 'active', reactivated_at = NOW()                  │
│         │                                                                │
│         ▼                                                                │
│  6. Generate new payments from start date                               │
│         │                                                                │
│         └──▶ Use existing generateRentalPayments logic                  │
│         │                                                                │
│         ▼                                                                │
│  7. UI refreshes with updated ledger                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Migration Plan

### Phase 1: Database Migration (Low Risk)

```sql
-- Run during low-traffic period
-- Estimated time: < 1 second for small tables

BEGIN;

-- 1. Add ledger status enum and column
CREATE TYPE ledger_status AS ENUM ('active', 'paused', 'closed');
ALTER TABLE rider_ledgers
  ADD COLUMN status ledger_status DEFAULT 'active';

-- 2. Add pause tracking columns
ALTER TABLE rider_ledgers
  ADD COLUMN paused_at TIMESTAMP NULL,
  ADD COLUMN paused_reason TEXT NULL;

-- 3. Add reactivation tracking
ALTER TABLE rider_ledgers
  ADD COLUMN reactivated_at TIMESTAMP NULL;

-- 4. Add deposit tracking
CREATE TYPE security_deposit_status AS ENUM ('retained', 'refunded', 'partially_refunded');
ALTER TABLE rider_ledgers
  ADD COLUMN security_deposit_status security_deposit_status DEFAULT 'retained',
  ADD COLUMN deposit_refunded_at TIMESTAMP NULL,
  ADD COLUMN deposit_refunded_amount NUMERIC NULL;

-- 5. Add payment cancellation
ALTER TYPE payment_status ADD VALUE 'cancelled';
ALTER TABLE payments
  ADD COLUMN cancelled_at TIMESTAMP NULL,
  ADD COLUMN cancelled_by TEXT NULL;

-- 6. Add indexes for common queries
CREATE INDEX idx_ledgers_status ON rider_ledgers(status);
CREATE INDEX idx_payments_status ON payments(status);

COMMIT;
```

**Rollback:**
```sql
-- Note: Cannot remove enum values in PostgreSQL
-- Must recreate enum type or leave unused value
ALTER TABLE rider_ledgers DROP COLUMN status;
ALTER TABLE rider_ledgers DROP COLUMN paused_at;
ALTER TABLE rider_ledgers DROP COLUMN paused_reason;
ALTER TABLE rider_ledgers DROP COLUMN reactivated_at;
ALTER TABLE rider_ledgers DROP COLUMN security_deposit_status;
ALTER TABLE rider_ledgers DROP COLUMN deposit_refunded_at;
ALTER TABLE rider_ledgers DROP COLUMN deposit_refunded_amount;
ALTER TABLE payments DROP COLUMN cancelled_at;
ALTER TABLE payments DROP COLUMN cancelled_by;
DROP INDEX idx_ledgers_status;
DROP INDEX idx_payments_status;
```

### Phase 2: Hook Updates (Medium Risk)

1. Add `deletePayment()` to `usePayments.ts`
2. Add `pauseLedger()`, `reactivateLedger()` to `useRiderLedgers.ts`
3. Update payment queries to exclude `cancelled` status
4. Update cron job to exclude `paused` ledgers

### Phase 3: UI Updates (Low Risk)

1. Add Delete button to PaymentEditDialog
2. Add Pause/Reactivate buttons to LedgerManagement
3. Add deposit status badges and actions

### Phase 4: Testing & Validation

1. Run migration verification tests
2. Run unit tests for each capability
3. Manual testing of full lifecycle flow

## Risks / Trade-offs

### R1: Cancelled payments still in database
**Risk:** Queries may accidentally include cancelled payments
**Mitigation:**
- Add default scope to payment queries
- Create database view for active payments only
- Document filtering requirement in code comments

### R2: Cron job race condition
**Risk:** Ledger paused while cron is processing
**Mitigation:**
- Add status check inside cron transaction
- Use row-level locking during payment generation

### R3: Reactivation with wrong start date
**Risk:** User enters incorrect date, generates wrong payments
**Mitigation:**
- Show confirmation with calculated payment dates
- Add "undo" capability within 24 hours (future)

### R4: Deposit tracking inconsistency
**Risk:** Manual refund not recorded in system
**Mitigation:**
- Make "Mark Refunded" action prominent
- Add to pause workflow checklist
- Show warning if paused > 30 days with retained deposit

## Open Questions

1. **Q: Should we allow reactivation with different rider?**
   - Current design: No, ledger stays with original rider
   - Alternative: Transfer ledger to new rider
   - **Resolution needed before implementation**

2. **Q: Maximum pause duration?**
   - Should there be a limit (e.g., 6 months)?
   - Auto-close ledgers paused too long?
   - **Recommendation: No limit, manual review process**

3. **Q: Notification on pause/reactivation?**
   - Should rider receive SMS/notification?
   - **Recommendation: Phase 2 feature**
