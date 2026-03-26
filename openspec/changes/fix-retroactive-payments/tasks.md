# Tasks: Fix Retroactive Payment Generation

## 1. Schema Audit & Alignment

- [ ] 1.1 Audit columns: compare rider_ledgers vs rental_ledgers
- [ ] 1.2 Audit columns: compare payments vs rental_payments
- [ ] 1.3 Create migration to add missing columns to rental_ledgers
- [ ] 1.4 Create migration to add missing columns to rental_payments
- [ ] 1.5 Verify foreign key relationships are compatible
- [ ] 1.6 Test migrations on development database

## 2. Database Sync Triggers

- [ ] 2.1 Create sync_errors table for trigger failure logging
- [ ] 2.2 Create `sync_rider_ledger_to_rental()` function
- [ ] 2.3 Create `sync_payment_to_rental()` function
- [ ] 2.4 Install INSERT trigger on rider_ledgers
- [ ] 2.5 Install UPDATE trigger on rider_ledgers
- [ ] 2.6 Install INSERT trigger on payments
- [ ] 2.7 Install UPDATE trigger on payments
- [ ] 2.8 Test triggers with sample INSERT operations
- [ ] 2.9 Test triggers with sample UPDATE operations
- [ ] 2.10 Test trigger failure logging to sync_errors table
- [ ] 2.11 Create manual_sync_rider_ledger() repair function
- [ ] 2.12 Create sync_repair() function for bulk recovery

## 3. Payment ID Sequencing

- [ ] 3.1 Create `getNextPaymentId()` helper function in useRiderLedgers.ts
- [ ] 3.2 Add MAX(payment_id) query with parsing logic
- [ ] 3.3 Implement leading zero padding (3-digit minimum format)
- [ ] 3.4 Add batch ID generation for multiple payments
- [ ] 3.5 Implement retry logic (up to 3 attempts) for UNIQUE violations
- [ ] 3.6 Add error handling for malformed existing payment_ids
- [ ] 3.7 Test concurrent ledger creation (2 users, same time)
- [ ] 3.8 Verify payment_id sequence is correct (no gaps, no duplicates)
- [ ] 3.9 Verify IDs sync to rental_payments via triggers

## 4. Retroactive Payment Generation

- [ ] 4.1 Create `generateRetroactivePayments()` function
- [ ] 4.2 Calculate days difference between start_date and current_date
- [ ] 4.3 Determine periods based on rental_frequency
- [ ] 4.4 Generate payment entries for each period
- [ ] 4.5 Set payment status: overdue (past) vs pending (future)
- [ ] 4.6 Add 6-month retroactive limit
- [ ] 4.7 Integrate into createLedger() function
- [ ] 4.8 Add loading indicator during generation
- [ ] 4.9 Update CreateLedgerForm.tsx for loading state
- [ ] 4.10 Write tests for weekly retroactive calculation
- [ ] 4.11 Write tests for daily retroactive calculation
- [ ] 4.12 Write tests for monthly retroactive calculation
- [ ] 4.13 Verify payments sync to rental_payments via triggers

## 5. Gap Period Payments with Dual-Write

- [ ] 5.1 Add gap period calculation in reactivateLedger()
- [ ] 5.2 Calculate days between paused_at and new start_date
- [ ] 5.3 Generate gap payments with "overdue" status
- [ ] 5.4 Add validation: start_date must be >= paused_at
- [ ] 5.5 Check for null paused_at and skip if missing
- [ ] 5.6 Prevent reactivation if reactivated_at is already set
- [ ] 5.7 Delete existing pending payments before generating new ones
- [ ] 5.8 Generate 6 future payments after gap period
- [ ] 5.9 Ensure sequential week_numbers across gap + future
- [ ] 5.10 Implement dual-write: insert into payments AND rental_payments
- [ ] 5.11 Create toRentalPaymentFormat() helper for dual-write
- [ ] 5.12 Update LedgerManagement.tsx validation error messages
- [ ] 5.13 Write tests for gap period calculations
- [ ] 5.14 Verify both tables have identical gap payments

## 6. Error Handling & User Feedback

- [ ] 6.1 Replace generic error messages with actual Supabase errors
- [ ] 6.2 Add try/catch around payment insertion
- [ ] 6.3 Display toast notifications for failures
- [ ] 6.4 Show warning when retroactive limit reached
- [ ] 6.5 Add console.error logging for debugging
- [ ] 6.6 Update error messages to mention retry option

## 7. Sync Monitoring & Health Checks

- [ ] 7.1 Create row count comparison query
- [ ] 7.2 Add sync health check endpoint or function
- [ ] 7.3 Create alert for row count differences >1%
- [ ] 7.4 Document sync repair procedures
- [ ] 7.5 Test manual sync recovery after trigger failure

## 8. Testing & Validation

- [ ] 8.1 Manual test: Create weekly ledger with start date 1 month ago
- [ ] 8.2 Manual test: Create daily ledger with start date 2 weeks ago
- [ ] 8.3 Manual test: Reactivate paused ledger after 3-week gap
- [ ] 8.4 Manual test: Attempt reactivation with start_date before paused_at
- [ ] 8.5 Manual test: Create ledger with start date > 6 months ago
- [ ] 8.6 Verify payment history dialog displays retroactive payments
- [ ] 8.7 Verify sync triggers fire correctly for all operations
- [ ] 8.8 Verify rental_ledgers has same data as rider_ledgers
- [ ] 8.9 Verify rental_payments has same data as payments
- [ ] 8.10 Test trigger performance with 50+ bulk insert

## 9. Documentation

- [ ] 9.1 Add JSDoc comments to generateRetroactivePayments()
- [ ] 9.2 Add JSDoc comments to getNextPaymentId()
- [ ] 9.3 Document sync trigger architecture in README
- [ ] 9.4 Document dual-write pattern for bulk operations
- [ ] 9.5 Update CLAUDE.md with retroactive payment behavior
- [ ] 9.6 Document payment ID generation algorithm
- [ ] 9.7 Document sync repair procedures
