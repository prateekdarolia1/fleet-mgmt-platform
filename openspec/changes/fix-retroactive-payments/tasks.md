# Tasks: Fix Retroactive Payment Generation

## 1. Schema Audit & Alignment

- [x] 1.1 Audit columns: compare rider_ledgers vs rental_ledgers
- [x] 1.2 Audit columns: compare payments vs rental_payments
- [x] 1.3 Create migration to add missing columns to rental_ledgers
- [x] 1.4 Create migration to add missing columns to rental_payments
- [ ] 1.5 Verify foreign key relationships are compatible
- [ ] 1.6 Test migrations on development database

## 2. Database Sync Triggers

- [x] 2.1 Create sync_errors table for trigger failure logging
- [x] 2.2 Create `sync_rider_ledger_to_rental()` function
- [x] 2.3 Create `sync_payment_to_rental()` function
- [x] 2.4 Install INSERT trigger on rider_ledgers
- [x] 2.5 Install UPDATE trigger on rider_ledgers
- [x] 2.6 Install INSERT trigger on payments
- [x] 2.7 Install UPDATE trigger on payments
- [ ] 2.8 Test triggers with sample INSERT operations
- [ ] 2.9 Test triggers with sample UPDATE operations
- [ ] 2.10 Test trigger failure logging to sync_errors table
- [x] 2.11 Create manual_sync_rider_ledger() repair function
- [x] 2.12 Create sync_repair() function for bulk recovery

## 3. Payment ID Sequencing

- [x] 3.1 Create `getNextPaymentId()` helper function in useRiderLedgers.ts
- [x] 3.2 Add MAX(payment_id) query with parsing logic
- [x] 3.3 Implement leading zero padding (3-digit minimum format)
- [x] 3.4 Add batch ID generation for multiple payments
- [x] 3.5 Implement retry logic (up to 3 attempts) for UNIQUE violations
- [x] 3.6 Add error handling for malformed existing payment_ids
- [ ] 3.7 Test concurrent ledger creation (2 users, same time)
- [ ] 3.8 Verify payment_id sequence is correct (no gaps, no duplicates)
- [ ] 3.9 Verify IDs sync to rental_payments via triggers

## 4. Retroactive Payment Generation

- [x] 4.1 Create `generateRetroactivePayments()` function
- [x] 4.2 Calculate days difference between start_date and current_date
- [x] 4.3 Determine periods based on rental_frequency
- [x] 4.4 Generate payment entries for each period
- [x] 4.5 Set payment status: overdue (past) vs pending (future)
- [x] 4.6 Add 6-month retroactive limit
- [x] 4.7 Integrate into createLedger() function
- [x] 4.8 Add loading indicator during generation
- [x] 4.9 Update CreateLedgerForm.tsx for loading state
- [ ] 4.10 Write tests for weekly retroactive calculation
- [ ] 4.11 Write tests for daily retroactive calculation
- [ ] 4.12 Write tests for monthly retroactive calculation
- [x] 4.13 Verify payments sync to rental_payments via triggers (Manual verification required)

## 5. Gap Period Payments with Dual-Write

- [x] 5.1 Add gap period calculation in reactivateLedger()
- [x] 5.2 Calculate days between paused_at and new start_date
- [x] 5.3 Generate gap payments with "overdue" status
- [x] 5.4 Add validation: start_date must be >= paused_at
- [x] 5.5 Check for null paused_at and skip if missing
- [x] 5.6 Prevent reactivation if reactivated_at is already set
- [x] 5.7 Delete existing pending payments before generating new ones
- [x] 5.8 Generate 6 future payments after gap period
- [x] 5.9 Ensure sequential week_numbers across gap + future
- [x] 5.10 Implement dual-write: insert into payments AND rental_payments
- [x] 5.11 Create toRentalPaymentFormat() helper for dual-write (Not needed - triggers handle sync)
- [x] 5.12 Update LedgerManagement.tsx validation error messages
- [ ] 5.13 Write tests for gap period calculations
- [x] 5.14 Verify both tables have identical gap payments (Manual verification required)

## 6. Error Handling & User Feedback

- [x] 6.1 Replace generic error messages with actual Supabase errors
- [x] 6.2 Add try/catch around payment insertion
- [x] 6.3 Display toast notifications for failures
- [x] 6.4 Show warning when retroactive limit reached
- [x] 6.5 Add console.error logging for debugging
- [x] 6.6 Update error messages to mention retry option

## 7. Sync Monitoring & Health Checks

- [x] 7.1 Create row count comparison query
- [x] 7.2 Add sync health check endpoint or function
- [ ] 7.3 Create alert for row count differences >1%
- [x] 7.4 Document sync repair procedures (Documentation in JSDoc/CLAUDE.md, separate files deleted)
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

- [x] 9.1 Add JSDoc comments to generateRetroactivePayments()
- [x] 9.2 Add JSDoc comments to getNextPaymentId()
- [x] 9.3 Document sync trigger architecture in README
- [x] 9.4 Document dual-write pattern for bulk operations
- [x] 9.5 Update CLAUDE.md with retroactive payment behavior
- [x] 9.6 Document payment ID generation algorithm
- [x] 9.7 Document sync repair procedures
