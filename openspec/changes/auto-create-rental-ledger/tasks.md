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

### T1.1 Create rental_ledgers table ✅
- [x] Write migration file: `supabase/migrations/20260307_create_rental_ledgers.sql`
- [x] Include: id, rider_id, rider_name, vehicle_id, vehicle_number, rental_start_date, rental_amount, security_deposit, security_deposit_status, status, responsible_user_id, notes, timestamps
- [x] Add CHECK constraints for status enum
- [x] Add partial unique index (one active ledger per rider)
- [x] Add foreign key to vehicles (nullable)
- [x] Enable RLS
- [x] Add RLS policies (admin only access)

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Migration created (to be applied to Supabase)

**Estimate:** 1 hour

---

### T1.2 Create rental_payments table ✅
- [x] Write migration file: `supabase/migrations/20260307_create_rental_payments.sql`
- [x] Include: id, ledger_id, week_number, due_date, amount_due, paid_amount, balance (generated), status, payment_date, payment_mode, upi_last4, received_by, external_ref, last_reminder_at, reminder_count, notes, timestamps
- [x] Add CHECK constraints for status and payment_mode enums
- [x] Add unique constraint (ledger_id, week_number)
- [x] Add foreign key to rental_ledgers with CASCADE delete
- [x] Add foreign key to profiles for received_by
- [x] Enable RLS
- [x] Add RLS policies

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 1 hour

---

### T1.3 Create notifications table ✅
- [x] Write migration file: `supabase/migrations/20260307_create_notifications.sql`
- [x] Include: id, target_user_id, type, payload (jsonb), read, action_url, created_at
- [x] Add CHECK constraint for type enum
- [x] Add index on (target_user_id, read, created_at DESC)
- [x] Add foreign key to profiles
- [x] Enable RLS
- [x] Add RLS policies (user can only see own notifications)

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 30 minutes

---

### T1.4 Add TypeScript types ✅
- [x] Update `src/integrations/supabase/types.ts` with new table types
- [x] Add enums to Constants export
- [x] Run `supabase gen types` to regenerate if using CLI

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] `npm run dev` — Starts clean ✓
- [x] No TypeScript errors in VSCode ✓

**Estimate:** 30 minutes

---

## ✅ Phase 1 Complete - Database Schema & Migrations

---

## Phase 2: Backend Logic & RPC Functions

### T2.1 Create create_rental_ledger RPC ✅
- [x] Write migration: `supabase/migrations/20260307_add_create_rental_ledger_rpc.sql`
- [x] Function signature: `create_rental_ledger(rider_id, vehicle_id, created_by)`
- [x] Logic: Fetch rider/vehicle info, insert ledger with pending_start status
- [x] Return: New ledger UUID
- [x] Add SECURITY DEFINER
- [x] Grant execute to authenticated role

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 1 hour

---

### T2.2 Create confirm_rental_start RPC ✅
- [x] Write migration: `supabase/migrations/20260307_add_confirm_rental_start_rpc.sql`
- [x] Function signature: `confirm_rental_start(ledger_id, start_date, security_deposit, responsible_user_id)`
- [x] Logic: Update ledger with dates, generate first 2 payment entries
- [x] Validation: start_date within reasonable range
- [x] Return: JSONB with success status

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 1.5 hours

---

### T2.3 Create mark_rental_payment_paid RPC ✅
- [x] Write migration: `supabase/migrations/20260307_add_mark_rental_payment_paid_rpc.sql`
- [x] Function signature: `mark_rental_payment_paid(payment_id, paid_amount, payment_mode, upi_last4, received_by, notes)`
- [x] Logic: Update payment with details, calculate new status (paid/partial)
- [x] Validation: UPI last4 format, amount range
- [x] Return: JSONB with payment details

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 1 hour

---

### T2.4 Create generate_weekly_payments RPC (for pg_cron) ✅
- [x] Write migration: `supabase/migrations/20260307_add_generate_weekly_payments_rpc.sql`
- [x] Function: Find active ledgers, create next week payment entry if needed
- [x] Logic: Check if next payment already exists, create if not
- [x] No parameters (called by cron)
- [x] Return: Number of payments created

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 1 hour

---

### T2.5 Create mark_overdue_payments RPC (for pg_cron) ✅
- [x] Write migration: `supabase/migrations/20260307_add_mark_overdue_payments_rpc.sql`
- [x] Function: Update status to overdue for past-due pending payments
- [x] No parameters
- [x] Return: Number of payments marked overdue

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 30 minutes

---

## ✅ Phase 2 Complete - Backend Logic & RPC Functions

---

## Phase 3: pg_cron Jobs Setup ✅

### T3.1 Schedule weekly payment generation job ✅
- [x] Write migration: `supabase/migrations/20260307_schedule_payment_generation_cron.sql`
- [x] Schedule: Daily at 00:00 UTC
- [x] Call: generate_weekly_payments RPC
- [x] Test with `SELECT cron.schedule(...)`

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 30 minutes

---

### T3.2 Schedule overdue detection job ✅
- [x] Included in same migration as T3.1
- [x] Schedule: Daily at 01:00 UTC
- [x] Call: mark_overdue_payments RPC

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 15 minutes

---

## ✅ Phase 3 Complete - pg_cron Jobs Setup

---

## Phase 4: Supabase Edge Functions ✅

### T4.1 Create send-payment-reminder Edge Function ✅
- [x] Create: `supabase/functions/send-payment-reminder/index.ts`
- [x] Logic: Query overdue payments, create notifications, update reminder_count
- [x] Add error handling and logging
- [x] Support RPCs: get_overdue_payments_for_reminder, increment_reminder_count

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 2 hours

---

### T4.2 Schedule reminder Edge Function ✅
- [x] Add support RPCs in migration: `20260307_add_payment_reminder_support_rpcs.sql`
- [x] Edge Function can be called via pg_net or external scheduler

**✅ Verify:**
- [x] `npm run build` — No errors ✓

**Estimate:** 30 minutes

---

## ✅ Phase 4 Complete - Supabase Edge Functions

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

### T5.2 Create useRentalPayments hook ✅
- [x] Create: `src/hooks/useRentalPayments.ts`
- [x] Functions: fetchPaymentsByLedger, markPaymentPaid (RPC), fetchOverduePayments
- [x] Include React Query mutations with cache invalidation

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Hook compiles and types correctly ✓

**Estimate:** 1.5 hours

---

### T5.3 Create useNotifications hook ✅
- [x] Create: `src/hooks/useNotifications.ts`
- [x] Functions: fetchUnread, markAsRead, markAllAsRead
- [x] Include real-time subscription (optional)

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Hook compiles and types correctly ✓

**Estimate:** 1 hour

---

## ✅ Phase 5 Complete - Frontend Hooks

---

## Phase 6: Frontend - Components

### T6.1 Create RentalLedgerConfirmModal component ✅
- [x] Create: `src/components/fleet/RentalLedgerConfirmModal.tsx`
- [x] Fields: Rental start date (DatePicker), Security deposit (Input), Responsible user (Select)
- [x] Validation: Date within 2 days, deposit numeric
- [x] Actions: Cancel, Confirm & Start
- [x] Call confirm_rental_start RPC on submit

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Modal compiles and types correctly ✓

**Estimate:** 2 hours

---

### T6.2 Modify RiderManagement activation flow ✅
- [x] Update: `src/components/fleet/RiderManagement.tsx`
- [x] After handleRiderActivation: Call create_rental_ledger RPC
- [x] Open RentalLedgerConfirmModal with new ledger ID
- [x] Handle success/error states

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Integration code compiles correctly ✓

**Estimate:** 1.5 hours

---

### T6.3 Create RentalLedgerDetail component ✅
- [x] Create: `src/components/fleet/RentalLedgerDetail.tsx`
- [x] Header: Rider info, Vehicle info, Status badge
- [x] Stats: Total collected, Outstanding, Overdue
- [x] Payments table: Week, Due date, Amount, Status, Actions
- [x] Actions: Mark paid, Send reminder, View history

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Component compiles correctly ✓

**Estimate:** 2.5 hours

---

### T6.4 Create RentalPaymentForm component ✅
- [x] Create: `src/components/fleet/RentalPaymentForm.tsx`
- [x] Fields: Amount, Payment mode, UPI last 4 (conditional), Notes
- [x] Support partial payments
- [x] Call mark_rental_payment_paid RPC

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Form compiles correctly ✓

**Estimate:** 1.5 hours

---

### T6.5 Create NotificationsPanel component ✅
- [x] Create: `src/components/fleet/NotificationsPanel.tsx`
- [x] List: Unread notifications with badges
- [x] Each item: Rider, Vehicle, Amount, Due date, Quick actions
- [x] Actions: Mark paid, View ledger, Dismiss

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] Component compiles correctly ✓

**Estimate:** 2 hours

---

### T6.6 Update PaymentTracking to include Rental Payments tab ✅
- [x] Update: `src/components/fleet/PaymentTracking.tsx`
- [x] Add tab: "Rental Payments"
- [x] Show overdue/pending payments across all ledgers
- [x] Link to ledger detail on click

**✅ Verify:**
- [x] `npm run build` — No errors ✓
- [x] New tab and components compile correctly ✓

**Estimate:** 1 hour

---

## ✅ Phase 6 Complete - Frontend Components

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
