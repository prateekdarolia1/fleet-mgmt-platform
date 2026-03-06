# Tasks: Auto-Create & Manage Rental Ledger

**Change ID:** `auto-create-rental-ledger`
**Status:** Not Started
**Created:** 2026-03-07

---

## ⚠️ Verification Workflow (REQUIRED after EVERY task)

After completing **each task**, the following verification loop MUST be executed:

```bash
# Step 1: Build and check for errors
npm run build

# Step 2: If build passes, start dev server
npm run dev

# Step 3: Check console for runtime errors
# - Open browser to http://localhost:8082
# - Check browser console (F12) for errors
# - Check terminal for server errors

# Step 4: If ANY errors found:
#   a) Kill dev server (Ctrl+C)
#   b) Edit the problematic code
#   c) Repeat from Step 1

# Step 5: Only mark task complete when:
#   - Build succeeds (no errors)
#   - Dev server starts without errors
#   - No runtime errors in browser console
#   - Feature works as expected in UI
```

### Verification Checklist (per task)
- [ ] `npm run build` completes with 0 errors
- [ ] `npm run dev` starts without errors
- [ ] No TypeScript errors in VSCode
- [ ] No runtime errors in browser console
- [ ] Feature/fix verified in UI
- [ ] No regressions in existing functionality

### If Build Fails
```
┌─────────────────────────────────────────────────────────────────┐
│  BUILD ERROR DETECTED                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Read error message carefully                                │
│  2. Identify file and line number                               │
│  3. Fix the issue in code                                       │
│  4. Run: npm run build                                          │
│  5. Repeat until clean                                          │
│                                                                 │
│  DO NOT proceed to next task until build is clean!              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema & Migrations

### T1.1 Create rental_ledgers table
- [ ] Write migration file: `supabase/migrations/YYYYMMDD_create_rental_ledgers.sql`
- [ ] Include: id, rider_id, rider_name, vehicle_id, vehicle_number, rental_start_date, rental_amount, security_deposit, security_deposit_status, status, responsible_user_id, notes, timestamps
- [ ] Add CHECK constraints for status enum
- [ ] Add partial unique index (one active ledger per rider)
- [ ] Add foreign key to vehicles (nullable)
- [ ] Enable RLS
- [ ] Add RLS policies (admin only access)

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Migration applied to local Supabase

**Estimate:** 1 hour

---

### T1.2 Create rental_payments table
- [ ] Write migration file: `supabase/migrations/YYYYMMDD_create_rental_payments.sql`
- [ ] Include: id, ledger_id, week_number, due_date, amount_due, paid_amount, balance (generated), status, payment_date, payment_mode, upi_last4, received_by, external_ref, last_reminder_at, reminder_count, notes, timestamps
- [ ] Add CHECK constraints for status and payment_mode enums
- [ ] Add unique constraint (ledger_id, week_number)
- [ ] Add foreign key to rental_ledgers with CASCADE delete
- [ ] Add foreign key to profiles for received_by
- [ ] Enable RLS
- [ ] Add RLS policies

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Migration applied to local Supabase

**Estimate:** 1 hour

---

### T1.3 Create notifications table
- [ ] Write migration file: `supabase/migrations/YYYYMMDD_create_notifications.sql`
- [ ] Include: id, target_user_id, type, payload (jsonb), read, action_url, created_at
- [ ] Add CHECK constraint for type enum
- [ ] Add index on (target_user_id, read, created_at DESC)
- [ ] Add foreign key to profiles
- [ ] Enable RLS
- [ ] Add RLS policies (user can only see own notifications)

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Migration applied to local Supabase

**Estimate:** 30 minutes

---

### T1.4 Add TypeScript types
- [ ] Update `src/integrations/supabase/types.ts` with new table types
- [ ] Add enums to Constants export
- [ ] Run `supabase gen types` to regenerate if using CLI

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — Starts clean
- [ ] No TypeScript errors in VSCode

**Estimate:** 30 minutes

---

## Phase 2: Backend Logic & RPC Functions

### T2.1 Create create_rental_ledger RPC
- [ ] Write migration: `supabase/migrations/YYYYMMDD_add_create_rental_ledger_rpc.sql`
- [ ] Function signature: `create_rental_ledger(rider_id, vehicle_id, created_by)`
- [ ] Logic: Fetch rider/vehicle info, insert ledger with pending_start status
- [ ] Return: New ledger UUID
- [ ] Add SECURITY DEFINER
- [ ] Grant execute to authenticated role

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Test RPC in Supabase SQL Editor

**Estimate:** 1 hour

---

### T2.2 Create confirm_rental_start RPC
- [ ] Write migration: `supabase/migrations/YYYYMMDD_add_confirm_rental_start_rpc.sql`
- [ ] Function signature: `confirm_rental_start(ledger_id, start_date, security_deposit, responsible_user_id)`
- [ ] Logic: Update ledger with dates, generate first 2 payment entries
- [ ] Validation: start_date within reasonable range
- [ ] Return: Boolean success

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Test: Confirm creates 2 payment entries

**Estimate:** 1.5 hours

---

### T2.3 Create mark_rental_payment_paid RPC
- [ ] Write migration: `supabase/migrations/YYYYMMDD_add_mark_rental_payment_paid_rpc.sql`
- [ ] Function signature: `mark_rental_payment_paid(payment_id, paid_amount, payment_mode, upi_last4, received_by, notes)`
- [ ] Logic: Update payment with details, calculate new status (paid/partial)
- [ ] Validation: UPI last4 format, amount range
- [ ] Return: Boolean success

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Test: Full payment → status=paid
- [ ] Test: Partial payment → status=partial

**Estimate:** 1 hour

---

### T2.4 Create generate_weekly_payments RPC (for pg_cron)
- [ ] Write migration: `supabase/migrations/YYYYMMDD_add_generate_weekly_payments_rpc.sql`
- [ ] Function: Find active ledgers, create next week payment entry if needed
- [ ] Logic: Check if next payment already exists, create if not
- [ ] No parameters (called by cron)
- [ ] Return: Number of payments created

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Test manually: `SELECT generate_weekly_payments();`

**Estimate:** 1 hour

---

### T2.5 Create mark_overdue_payments RPC (for pg_cron)
- [ ] Write migration: `supabase/migrations/YYYYMMDD_add_mark_overdue_payments_rpc.sql`
- [ ] Function: Update status to overdue for past-due pending payments
- [ ] No parameters
- [ ] Return: Number of payments marked overdue

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Test manually: `SELECT mark_overdue_payments();`

**Estimate:** 30 minutes

---

## Phase 3: pg_cron Jobs Setup

### T3.1 Schedule weekly payment generation job
- [ ] Write migration: `supabase/migrations/YYYYMMDD_schedule_payment_generation.sql`
- [ ] Schedule: Daily at 00:00 UTC
- [ ] Call: generate_weekly_payments RPC
- [ ] Test with `SELECT cron.schedule(...)`

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Check cron job: `SELECT * FROM cron.job;`

**Estimate:** 30 minutes

---

### T3.2 Schedule overdue detection job
- [ ] Write migration: `supabase/migrations/YYYYMMDD_schedule_overdue_detection.sql`
- [ ] Schedule: Daily at 01:00 UTC
- [ ] Call: mark_overdue_payments RPC

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Check cron job: `SELECT * FROM cron.job;`

**Estimate:** 15 minutes

---

## Phase 4: Supabase Edge Functions

### T4.1 Create send-payment-reminder Edge Function
- [ ] Create: `supabase/functions/send-payment-reminder/index.ts`
- [ ] Logic: Query overdue payments, create notifications, update reminder_count
- [ ] Add error handling and logging
- [ ] Test locally with `supabase functions serve`

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `supabase functions serve` — No errors
- [ ] Test: Invoke function, check notification created

**Estimate:** 2 hours

---

### T4.2 Schedule reminder Edge Function
- [ ] Add webhook trigger from pg_cron or external scheduler
- [ ] Alternative: Call from mark_overdue_payments RPC via pg_net

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] End-to-end: Overdue payment triggers notification

**Estimate:** 30 minutes

---

## Phase 5: Frontend - Hooks

### T5.1 Create useRentalLedgers hook
- [ ] Create: `src/hooks/useRentalLedgers.ts`
- [ ] Functions: fetchLedgers, fetchLedgerById, createLedger (RPC), updateLedger
- [ ] Include React Query for caching
- [ ] Type all functions with TypeScript

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Hook compiles and types correctly

**Estimate:** 1.5 hours

---

### T5.2 Create useRentalPayments hook
- [ ] Create: `src/hooks/useRentalPayments.ts`
- [ ] Functions: fetchPaymentsByLedger, markPaymentPaid (RPC), fetchOverduePayments
- [ ] Include React Query mutations with cache invalidation

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Hook compiles and types correctly

**Estimate:** 1.5 hours

---

### T5.3 Create useNotifications hook
- [ ] Create: `src/hooks/useNotifications.ts`
- [ ] Functions: fetchUnread, markAsRead, markAllAsRead
- [ ] Include real-time subscription (optional)

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Hook compiles and types correctly

**Estimate:** 1 hour

---

## Phase 6: Frontend - Components

### T6.1 Create RentalLedgerConfirmModal component
- [ ] Create: `src/components/fleet/RentalLedgerConfirmModal.tsx`
- [ ] Fields: Rental start date (DatePicker), Security deposit (Input), Responsible user (Select)
- [ ] Validation: Date within 2 days, deposit numeric
- [ ] Actions: Cancel, Confirm & Start
- [ ] Call confirm_rental_start RPC on submit

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Modal renders correctly in UI
- [ ] Form validation works
- [ ] RPC call succeeds

**Estimate:** 2 hours

---

### T6.2 Modify RiderManagement activation flow
- [ ] Update: `src/components/fleet/RiderManagement.tsx`
- [ ] After handleRiderActivation: Call create_rental_ledger RPC
- [ ] Open RentalLedgerConfirmModal with new ledger ID
- [ ] Handle success/error states

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Activate rider → Modal opens
- [ ] RPC creates ledger
- [ ] No existing functionality broken

**Estimate:** 1.5 hours

---

### T6.3 Create RentalLedgerDetail component
- [ ] Create: `src/components/fleet/RentalLedgerDetail.tsx`
- [ ] Header: Rider info, Vehicle info, Status badge
- [ ] Stats: Total collected, Outstanding, Overdue
- [ ] Payments table: Week, Due date, Amount, Status, Actions
- [ ] Actions: Mark paid, Send reminder, View history

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Component renders with mock data
- [ ] Stats calculate correctly
- [ ] Actions work as expected

**Estimate:** 2.5 hours

---

### T6.4 Create RentalPaymentForm component
- [ ] Create: `src/components/fleet/RentalPaymentForm.tsx`
- [ ] Fields: Amount, Payment mode, UPI last 4 (conditional), Notes
- [ ] Support partial payments
- [ ] Call mark_rental_payment_paid RPC

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Form renders correctly
- [ ] UPI field shows conditionally
- [ ] Payment recorded successfully

**Estimate:** 1.5 hours

---

### T6.5 Create NotificationsPanel component
- [ ] Create: `src/components/fleet/NotificationsPanel.tsx`
- [ ] List: Unread notifications with badges
- [ ] Each item: Rider, Vehicle, Amount, Due date, Quick actions
- [ ] Actions: Mark paid, View ledger, Dismiss

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] Notifications display correctly
- [ ] Quick actions work

**Estimate:** 2 hours

---

### T6.6 Update PaymentTracking to include Rental Payments tab
- [ ] Update: `src/components/fleet/PaymentTracking.tsx`
- [ ] Add tab: "Rental Payments"
- [ ] Show overdue/pending payments across all ledgers
- [ ] Link to ledger detail on click

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] `npm run dev` — No console errors
- [ ] New tab appears
- [ ] Payments list displays
- [ ] Links work

**Estimate:** 1 hour

---

## Phase 7: Testing

### T7.1 Unit tests for RPC functions
- [ ] Test: create_rental_ledger with valid rider/vehicle
- [ ] Test: create_rental_ledger with missing vehicle
- [ ] Test: confirm_rental_start generates 2 payments
- [ ] Test: mark_payment_paid with full and partial amounts
- [ ] Test: UPI last4 validation

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] All tests pass

**Estimate:** 2 hours

---

### T7.2 Integration tests
- [ ] Test: Full flow from rider activation to ledger creation
- [ ] Test: Payment generation cron job
- [ ] Test: Overdue detection cron job
- [ ] Test: Notification creation

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] All tests pass

**Estimate:** 2 hours

---

### T7.3 E2E tests (optional)
- [ ] Test: Admin activates rider → sees confirmation modal
- [ ] Test: Admin confirms rental → sees payments generated
- [ ] Test: Admin marks payment paid → sees updated status

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] All tests pass

**Estimate:** 1.5 hours

---

## Phase 8: Documentation & Rollout

### T8.1 Update TECH_ARCHITECTURE.md
- [ ] Document new tables and relationships
- [ ] Document RPC functions
- [ ] Document cron jobs

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Documentation reviewed

**Estimate:** 30 minutes

---

### T8.2 Create operator guide
- [ ] How to activate a rider with rental ledger
- [ ] How to record a payment
- [ ] How to handle overdue payments

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Guide reviewed

**Estimate:** 1 hour

---

### T8.3 Staging deployment & verification
- [ ] Deploy migrations to staging
- [ ] Verify cron jobs are running
- [ ] Test full flow with real data

**✅ Verify:**
- [ ] `npm run build` — No errors
- [ ] Staging flow works end-to-end

**Estimate:** 1 hour

---

## Summary

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1: Database | 4 | 3 hours |
| Phase 2: RPC Functions | 5 | 5 hours |
| Phase 3: pg_cron | 2 | 45 minutes |
| Phase 4: Edge Functions | 2 | 2.5 hours |
| Phase 5: Frontend Hooks | 3 | 4 hours |
| Phase 6: Frontend Components | 6 | 10.5 hours |
| Phase 7: Testing | 3 | 5.5 hours |
| Phase 8: Documentation | 3 | 2.5 hours |
| **Total** | **28** | **~34 hours** |

---

## Dependencies

```
Phase 1 ─────▶ Phase 2 ─────▶ Phase 3
                 │               │
                 ▼               ▼
              Phase 4 ◀─────── Phase 5
                               │
                               ▼
                            Phase 6 ─────▶ Phase 7 ─────▶ Phase 8
```

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Cron job fails silently | Add logging to cron jobs, alert on failure | Backend |
| Modal dismissed without action | Show pending ledgers in dashboard | Frontend |
| Race condition on payment update | Use row-level locking in RPC | Backend |
| UPI validation too strict | Allow alphanumeric, not just digits | Backend |
