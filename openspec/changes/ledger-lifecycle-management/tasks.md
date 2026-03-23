# Ledger Lifecycle Management - Tasks

## 1. Database Migration

- [x] 1.1 Create migration file `add_ledger_lifecycle_fields.sql`
- [x] 1.2 Add `ledger_status` enum (active, paused, closed)
- [x] 1.3 Add `status`, `paused_at`, `paused_reason`, `reactivated_at` columns to `rider_ledgers`
- [x] 1.4 Add `security_deposit_status` enum (retained, refunded, partially_refunded)
- [x] 1.5 Add `security_deposit_status`, `deposit_refunded_at`, `deposit_refunded_amount` columns
- [x] 1.6 Add `cancelled` value to `payment_status` enum
- [x] 1.7 Add `cancelled_at`, `cancelled_by` columns to `payments` table
- [x] 1.8 Create indexes on `rider_ledgers.status` and `payments.status`
- [ ] 1.9 Run migration against development database
- [x] 1.10 Verify migration with SQL tests (from specs)

## 2. Payment Deletion Capability

### 2.1 Backend/Hook Implementation
- [x] 2.1.1 Add `deletePayment(id: string)` function to `usePayments.ts`
- [x] 2.1.2 Implement status check (only pending/overdue can be cancelled)
- [x] 2.1.3 Set `status = 'cancelled'`, `cancelled_at = NOW()`, `cancelled_by = user`
- [x] 2.1.4 Add error handling for invalid payment states
- [x] 2.1.5 Add toast notifications for success/failure

### 2.2 UI Implementation
- [x] 2.2.1 Add "Delete" button to PaymentEditDialog component
- [x] 2.2.2 Hide Delete button for payments with status `paid`
- [x] 2.2.3 Create DeletePaymentConfirmationDialog component
- [x] 2.2.4 Wire up delete action to `deletePayment()` hook

### 2.3 Query Updates
- [x] 2.3.1 Update `fetchPayments` to exclude `cancelled` status by default
- [x] 2.3.2 Update `getTotalDue` calculation to exclude cancelled
- [x] 2.3.3 Update `getOverdueCount` calculation to exclude cancelled

### 2.4 Tests
- [ ] 2.4.1 Write unit test: `deletePayment` throws for paid payment
- [ ] 2.4.2 Write unit test: `deletePayment` sets cancelled_at timestamp
- [ ] 2.4.3 Write integration test: cancelled payments excluded from totals
- [ ] 2.4.4 Write migration test: `cancelled` enum value exists

## 3. Ledger Pause Capability

### 3.1 Backend/Hook Implementation
- [x] 3.1.1 Add `pauseLedger(id: string, reason: string)` to `useRiderLedgers.ts`
- [x] 3.1.2 Validate ledger status is `active` before pausing
- [x] 3.1.3 Set `status = 'paused'`, `paused_at = NOW()`, `paused_reason = reason`
- [x] 3.1.4 Add error handling for invalid ledger states
- [x] 3.1.5 Add toast notifications for success/failure

### 3.2 UI Implementation
- [x] 3.2.1 Add "Pause Ledger" button to LedgerManagement component
- [x] 3.2.2 Create PauseLedgerDialog with reason text input
- [x] 3.2.3 Require reason text before allowing confirmation
- [x] 3.2.4 Wire up pause action to `pauseLedger()` hook
- [x] 3.2.5 Show paused status badge on paused ledgers

### 3.3 Cron Job Update
- [x] 3.3.1 Update payment generation cron query to exclude `status = 'paused'`
- [x] 3.3.2 Add WHERE clause: `WHERE status = 'active'` to ledger fetch

### 3.4 Tests
- [ ] 3.4.1 Write unit test: `pauseLedger` throws for non-active ledger
- [ ] 3.4.2 Write unit test: `pauseLedger` sets all audit fields
- [ ] 3.4.3 Write integration test: paused ledger skipped by cron
- [ ] 3.4.4 Write migration test: `status` column exists with default 'active'

## 4. Ledger Reactivation Capability

### 4.1 Backend/Hook Implementation
- [x] 4.1.1 Add `canReactivate(riderId: string)` validation function
- [x] 4.1.2 Check rider exists, has paused ledger, duty_status = 'IDLE'
- [x] 4.1.3 Add `reactivateLedger(id: string, params: ReactivationParams)` function
- [x] 4.1.4 Delete existing pending payments for ledger
- [x] 4.1.5 Update ledger: status = 'active', reactivated_at = NOW()
- [x] 4.1.6 Update optional rental_amount and rental_frequency
- [x] 4.1.7 Generate new payments from new start date
- [x] 4.1.8 Handle cycle day change (e.g., Wed → Fri) in payment generation

### 4.2 UI Implementation
- [x] 4.2.1 Add "Reactivate Ledger" button (only visible for paused ledgers)
- [x] 4.2.2 Create ReactivateLedgerDialog component
- [x] 4.2.3 Add start date picker (required, validates >= pause date)
- [x] 4.2.4 Add optional rental amount field (defaults to current)
- [x] 4.2.5 Add optional rental frequency field (defaults to current)
- [x] 4.2.6 Show eligibility errors if validation fails
- [x] 4.2.7 Show warning if cycle day changes (e.g., "Previous: Wed, New: Fri")
- [x] 4.2.8 Wire up reactivation to `reactivateLedger()` hook

### 4.3 Tests
- [ ] 4.3.1 Write unit test: `canReactivate` returns false for non-IDLE rider
- [ ] 4.3.2 Write unit test: `canReactivate` returns false for non-paused ledger
- [ ] 4.3.3 Write unit test: `reactivateLedger` deletes only pending payments
- [ ] 4.3.4 Write unit test: `reactivateLedger` preserves paid/overdue payments
- [ ] 4.3.5 Write unit test: cycle change generates correct due dates
- [ ] 4.3.6 Write integration test: full active → pause → reactivate flow

## 5. Deposit Refund Tracking Capability

### 5.1 Backend/Hook Implementation
- [x] 5.1.1 Add `markDepositRefunded(id: string, amount?: number)` to `useRiderLedgers.ts`
- [x] 5.1.2 Validate ledger is paused before marking refunded
- [x] 5.1.3 Set `security_deposit_status` based on amount (full vs partial)
- [x] 5.1.4 Set `deposit_refunded_at` and `deposit_refunded_amount`
- [x] 5.1.5 Add deposit validation to reactivation (require deposit if refunded)

### 5.2 UI Implementation
- [x] 5.2.1 Add deposit status badge to LedgerManagement (Retained/Refunded/Partial)
- [x] 5.2.2 Add "Mark Refunded" action for paused ledgers with retained deposit
- [x] 5.2.3 Create MarkRefundedDialog with amount input (optional, defaults to full)
- [x] 5.2.4 Update ReactivateDialog to show deposit requirement warning
- [x] 5.2.5 Add deposit amount input to ReactivateDialog if deposit was refunded

### 5.3 Tests
- [ ] 5.3.1 Write unit test: `markDepositRefunded` throws for non-paused ledger
- [ ] 5.3.2 Write unit test: partial refund sets correct status
- [ ] 5.3.3 Write unit test: reactivation requires deposit when refunded
- [ ] 5.3.4 Write migration test: `security_deposit_status` column exists

## 6. Integration & Polish

- [x] 6.1 Update TypeScript types in `src/integrations/supabase/types.ts`
- [ ] 6.2 Add ledger status filter to LedgerManagement table
- [ ] 6.3 Update dashboard stats to show paused ledger count
- [ ] 6.4 Add audit log entries for pause/reactivate/delete actions
- [ ] 6.5 Run all unit tests
- [ ] 6.6 Run all integration tests
- [ ] 6.7 Manual end-to-end testing of full lifecycle
- [ ] 6.8 Code review
- [ ] 6.9 Deploy to staging environment
- [ ] 6.10 Verify staging deployment

## 7. Documentation

- [ ] 7.1 Update API documentation for new hook functions
- [ ] 7.2 Add user guide for pause/reactivate workflow
- [ ] 7.3 Document database schema changes
- [ ] 7.4 Update CLAUDE.md with new patterns

---

## Task Summary

| Section | Tasks | Description |
|---------|-------|-------------|
| 1. Database Migration | 10 | Schema changes, indexes, verification |
| 2. Payment Deletion | 13 | Hook, UI, query updates, tests |
| 3. Ledger Pause | 13 | Hook, UI, cron update, tests |
| 4. Ledger Reactivation | 18 | Validation, hook, UI, tests |
| 5. Deposit Tracking | 12 | Hook, UI, validation, tests |
| 6. Integration | 10 | Types, polish, testing, deploy |
| 7. Documentation | 4 | API docs, user guide, schema |
| **Total** | **80** | |
