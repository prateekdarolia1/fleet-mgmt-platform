# Tasks: Fix Retroactive Payment Generation

## 1. Payment ID Sequencing

- [ ] 1.1 Create `getNextPaymentId()` helper function in `useRiderLedgers.ts`
- [ ] 1.2 Add `MAX(payment_id)` query with parsing logic to extract numeric portion
- [ ] 1.3 Implement leading zero padding (3-digit minimum format)
- [ ] 1.4 Add batch ID generation for multiple payments (e.g., P051-P060)
- [ ] 1.5 Implement retry logic (up to 3 attempts) for UNIQUE constraint violations
- [ ] 1.6 Add error handling for malformed existing payment_ids
- [ ] 1.7 Write unit tests for ID generation edge cases (empty DB, malformed IDs)

## 2. Retroactive Payment Generation

- [ ] 2.1 Create `generateRetroactivePayments()` function in `useRiderLedgers.ts`
- [ ] 2.2 Calculate days difference between start_date and current_date
- [ ] 2.3 Determine number of periods based on rental_frequency (daily=1, weekly=7, monthly=30)
- [ ] 2.4 Generate payment entries for each period with proper due_dates
- [ ] 2.5 Set payment status: "overdue" for past due dates, "pending" for future
- [ ] 2.6 Add 6-month retroactive limit (max ~26 weekly periods)
- [ ] 2.7 Integrate into `createLedger()` function after ledger creation
- [ ] 2.8 Add loading indicator during payment generation
- [ ] 2.9 Update `CreateLedgerForm.tsx` to handle retroactive payment loading state
- [ ] 2.10 Write tests for weekly, daily, monthly retroactive calculations

## 3. Gap Period Payments

- [ ] 3.1 Add gap period calculation in `reactivateLedger()` function
- [ ] 3.2 Calculate days between `paused_at` and new `start_date`
- [ ] 3.3 Generate gap payments with "overdue" status
- [ ] 3.4 Add validation: `start_date` must be >= `paused_at`
- [ ] 3.5 Check for null `paused_at` and skip gap generation if missing
- [ ] 3.6 Prevent reactivation if `reactivated_at` is already set
- [ ] 3.7 Delete existing pending payments before generating new payments
- [ ] 3.8 Generate 6 future payments after gap period
- [ ] 3.9 Ensure sequential week_numbers across gap + future payments
- [ ] 3.10 Update `LedgerManagement.tsx` validation error messages
- [ ] 3.11 Write tests for gap period calculations (weekly, daily, monthly)

## 4. Error Handling & User Feedback

- [ ] 4.1 Replace generic error messages with actual Supabase error details
- [ ] 4.2 Add try/catch around payment insertion with specific error logging
- [ ] 4.3 Display toast notifications for payment creation failures
- [ ] 4.4 Show warning when retroactive limit is reached (payments omitted)
- [ ] 4.5 Add console.error logging for debugging payment ID collisions
- [ ] 4.6 Update error messages to mention retry option for collisions

## 5. Testing & Validation

- [ ] 5.1 Manual test: Create weekly ledger with start date 1 month ago
- [ ] 5.2 Manual test: Create daily ledger with start date 2 weeks ago
- [ ] 5.3 Manual test: Reactivate paused ledger after 3-week gap
- [ ] 5.4 Manual test: Attempt reactivation with start_date before paused_at
- [ ] 5.5 Manual test: Concurrent ledger creation (2 users, same time)
- [ ] 5.6 Manual test: Create ledger with start date > 6 months ago (verify limit)
- [ ] 5.7 Verify payment_id sequence is correct (no gaps, no duplicates)
- [ ] 5.8 Verify all overdue payments have correct status
- [ ] 5.9 Verify future payments have "pending" status
- [ ] 5.10 Check payment history dialog displays retroactive payments correctly

## 6. Documentation & Cleanup

- [ ] 6.1 Add JSDoc comments to `generateRetroactivePayments()` function
- [ ] 6.2 Add JSDoc comments to `getNextPaymentId()` function
- [ ] 6.3 Add deprecation warning to `rental_ledgers`/`rental_payments` RPC functions
- [ ] 6.4 Update CLAUDE.md with retroactive payment behavior
- [ ] 6.5 Document payment ID generation algorithm in code comments
