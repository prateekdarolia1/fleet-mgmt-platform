# Validate: Auto-Create & Manage Rental Ledger

**Change ID:** `auto-create-rental-ledger`
**Version:** 1.0.0
**Last Updated:** 2026-03-07

---

## Pre-Implementation Checklist

### Requirements Validation
- [x] **CBU Definition**: Confirmed as Battery + Rider + Vehicle
- [x] **Trigger Point**: Rider activation (duty_status → LIVE)
- [x] **Payment Strategy**: 2 weeks upfront, incremental thereafter
- [x] **Separate Tables**: rental_ledgers separate from rider_ledgers
- [x] **Background Jobs**: pg_cron for payments, Edge Functions for reminders

### Design Decisions
- [x] Security deposit stored on ledger table
- [x] UPI last-4 validation (4 alphanumeric chars)
- [x] Partial payment support with balance calculation
- [x] Notification system for reminders
- [x] No data migration from existing rider_ledgers

---

## Implementation Validation

### Phase 1: Database Schema

#### rental_ledgers table
```sql
-- Run this to validate
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rental_ledgers'
ORDER BY ordinal_position;
```
- [ ] All required columns exist
- [ ] CHECK constraints on status field
- [ ] Partial unique index for one-active-ledger-per-rider
- [ ] RLS enabled and policies created

#### rental_payments table
```sql
-- Run this to validate
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rental_payments'
ORDER BY ordinal_position;
```
- [ ] All required columns exist
- [ ] Generated column `balance` calculates correctly
- [ ] CHECK constraints on status and payment_mode
- [ ] Unique constraint on (ledger_id, week_number)
- [ ] RLS enabled and policies created

#### notifications table
- [ ] All required columns exist
- [ ] Index on (target_user_id, read, created_at DESC)
- [ ] RLS policies allow users to see only own notifications

---

### Phase 2: RPC Functions

#### create_rental_ledger
```sql
-- Test: Create ledger for rider
SELECT create_rental_ledger('R001', 'vehicle-uuid-here', 'user-uuid');

-- Validate
SELECT * FROM rental_ledgers WHERE rider_id = 'R001';
```
- [ ] Creates ledger with status 'pending_start'
- [ ] Returns ledger UUID
- [ ] Rider info populated correctly
- [ ] Vehicle info populated correctly
- [ ] Error if rider doesn't exist
- [ ] Error if duplicate active ledger

#### confirm_rental_start
```sql
-- Test: Confirm rental start
SELECT confirm_rental_start(
  'ledger-uuid',
  '2026-03-10'::date,
  2000.00,
  'user-uuid'
);

-- Validate
SELECT * FROM rental_payments WHERE ledger_id = 'ledger-uuid';
```
- [ ] Updates ledger status to 'active'
- [ ] Sets rental_start_date
- [ ] Sets security_deposit and status
- [ ] Creates exactly 2 payment entries
- [ ] Payment due dates calculated correctly (+7, +14 days)
- [ ] Error if ledger not in pending_start

#### mark_rental_payment_paid
```sql
-- Test: Mark payment paid
SELECT mark_rental_payment_paid(
  'payment-uuid',
  500.00,
  'upi',
  'A1B2',
  'user-uuid',
  'Paid via GPay'
);

-- Validate
SELECT * FROM rental_payments WHERE id = 'payment-uuid';
```
- [ ] Updates paid_amount
- [ ] Sets status to 'paid' when full amount
- [ ] Sets status to 'partial' when partial
- [ ] Records payment_mode and upi_last4
- [ ] Sets received_by
- [ ] Error if payment not found
- [ ] Error if upi_last4 not exactly 4 chars when mode is 'upi'

---

### Phase 3: pg_cron Jobs

#### Weekly payment generation
```sql
-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'generate-weekly-payments';

-- Manual test
SELECT generate_weekly_payments();
```
- [ ] Job scheduled at 00:00 UTC daily
- [ ] Creates payment for next week when due_date within 6 days
- [ ] Only creates for active ledgers
- [ ] Doesn't create duplicates

#### Overdue detection
```sql
-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'mark-overdue-payments';

-- Manual test
SELECT mark_overdue_payments();
```
- [ ] Job scheduled at 01:00 UTC daily
- [ ] Marks pending payments as overdue after due_date
- [ ] Doesn't affect paid payments

---

### Phase 4: Edge Functions

#### send-payment-reminder
```bash
# Local test
supabase functions serve send-payment-reminder --env-file .env.local

# Invoke
curl -X POST http://localhost:54321/functions/v1/send-payment-reminder
```
- [ ] Function deploys successfully
- [ ] Queries overdue payments
- [ ] Creates notifications
- [ ] Updates reminder_count and last_reminder_at
- [ ] Returns count of processed payments

---

### Phase 5: Frontend Hooks

#### useRentalLedgers
- [ ] fetchLedgers returns all ledgers
- [ ] fetchLedgerById returns single ledger with payments
- [ ] createLedger calls RPC correctly
- [ ] React Query caching works

#### useRentalPayments
- [ ] fetchPaymentsByLedger returns sorted payments
- [ ] markPaymentPaid updates cache correctly
- [ ] fetchOverduePayments filters correctly

#### useNotifications
- [ ] fetchUnread returns only unread
- [ ] markAsRead updates read status
- [ ] Real-time subscription works (if implemented)

---

### Phase 6: Frontend Components

#### RentalLedgerConfirmModal
- [ ] Modal opens on rider activation
- [ ] Date picker validates 2-day window
- [ ] Security deposit field accepts numbers
- [ ] Responsible user dropdown populated
- [ ] Confirm calls confirm_rental_start RPC
- [ ] Success shows toast and closes modal
- [ ] Error shows error message

#### RentalLedgerDetail
- [ ] Displays rider and vehicle info
- [ ] Shows payment stats correctly
- [ ] Payments table shows all entries
- [ ] Mark Paid button opens payment form
- [ ] Status badges render correctly

#### RentalPaymentForm
- [ ] Amount field validates min/max
- [ ] Payment mode dropdown works
- [ ] UPI last 4 field shows conditionally
- [ ] Submit calls mark_payment_paid RPC
- [ ] Success updates parent component

#### NotificationsPanel
- [ ] Lists unread notifications
- [ ] Shows rider, vehicle, amount info
- [ ] Quick actions work (mark paid, view)
- [ ] Dismiss marks as read

---

## Acceptance Criteria Validation

### AC-1: Auto-create ledger on CBU ready
**Test Steps:**
1. Create rider with vehicle assigned
2. Activate rider (IDLE → LIVE)
3. Verify ledger created with status 'pending_start'

**Expected:** Ledger exists within 1 second
- [ ] PASS
- [ ] FAIL — Reason: ___________

### AC-2: Modal prompts for start date & deposit
**Test Steps:**
1. Activate rider
2. Verify modal appears
3. Check fields are present

**Expected:** Modal with date picker, deposit input, user dropdown
- [ ] PASS
- [ ] FAIL — Reason: ___________

### AC-3: First 2 payment entries created on confirm
**Test Steps:**
1. Confirm rental start
2. Check rental_payments table

**Expected:** Exactly 2 entries with correct due dates
- [ ] PASS
- [ ] FAIL — Reason: ___________

### AC-4: Payment marked paid with UPI tracking
**Test Steps:**
1. Click Mark Paid on a payment
2. Enter amount, mode=UPI, last4='A1B2'
3. Submit
4. Verify payment record

**Expected:** Status=paid, upi_last4='A1B2', received_by set
- [ ] PASS
- [ ] FAIL — Reason: ___________

### AC-5: Overdue payments detected and notified
**Test Steps:**
1. Create payment with due_date in past
2. Run mark_overdue_payments
3. Check notification created

**Expected:** Payment status=overdue, notification exists
- [ ] PASS
- [ ] FAIL — Reason: ___________

### AC-6: Incremental payment generation
**Test Steps:**
1. Have active ledger with 2 payments
2. Set one payment due_date to 5 days from now
3. Run generate_weekly_payments
4. Check for new payment entry

**Expected:** Third payment entry created
- [ ] PASS
- [ ] FAIL — Reason: ___________

---

## Security Validation

### Row Level Security
```sql
-- Test as non-admin user
SET ROLE authenticated;
SELECT * FROM rental_ledgers;  -- Should fail or return empty
SELECT * FROM rental_payments; -- Should fail or return empty
SELECT * FROM notifications;   -- Should return only own notifications
```
- [ ] Non-admins cannot access ledgers
- [ ] Non-admins cannot access payments
- [ ] Users can only see own notifications

### SQL Injection Prevention
```sql
-- Test malicious input
SELECT create_rental_ledger(
  'R001' OR 1=1,
  'vehicle-uuid',
  NULL
);
-- Should error, not return all riders
```
- [ ] Malicious input handled safely

---

## Performance Validation

### Query Performance
```sql
-- Test with 1000+ payments
EXPLAIN ANALYZE SELECT * FROM rental_payments
WHERE ledger_id = 'some-uuid'
ORDER BY week_number;
```
- [ ] Query time < 100ms
- [ ] Uses index on ledger_id

### Cron Job Performance
```sql
-- Test with 100+ active ledgers
EXPLAIN ANALYZE SELECT generate_weekly_payments();
```
- [ ] Execution time < 5 seconds

---

## Rollback Plan

If critical issues found:

1. **Disable cron jobs:**
   ```sql
   SELECT cron.unschedule('generate-weekly-payments');
   SELECT cron.unschedule('mark-overdue-payments');
   ```

2. **Revert frontend changes:**
   - Revert to previous commit
   - Redeploy

3. **Keep data:**
   - Don't drop tables
   - Mark all ledgers as 'suspended'
   - Manual review and migration

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | [ ] Approved |
| Reviewer | | | [ ] Approved |
| QA | | | [ ] Approved |
| Product | | | [ ] Approved |

---

## Notes

- Record any deviations from spec here
- Document any known issues or workarounds
- Note performance observations
