-- Migration: Schedule pg_cron jobs for rental payments
-- Description: Set up daily cron jobs for payment generation and overdue detection
-- Part of: auto-create-rental-ledger change
-- Requires: pg_cron extension enabled

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Generate weekly payments daily at 00:00 UTC
-- This creates next week's payment entry 6 days before due date
SELECT cron.schedule(
  'generate-weekly-rental-payments',
  '0 0 * * *',  -- Every day at midnight UTC
  $$
  SELECT generate_weekly_payments();
  $$
);

-- Schedule: Mark overdue payments daily at 01:00 UTC
-- This updates status for past-due payments
SELECT cron.schedule(
  'mark-rental-payments-overdue',
  '0 1 * * *',  -- Every day at 01:00 UTC
  $$
  SELECT mark_overdue_payments();
  $$
);

-- Add comments for documentation
COMMENT ON JOB 'generate-weekly-rental-payments' IS
'Creates next week rental payment entries for active ledgers. Runs daily at 00:00 UTC.';

COMMENT ON JOB 'mark-rental-payments-overdue' IS
'Marks pending/partial rental payments as overdue when past due_date. Runs daily at 01:00 UTC.';

-- Note: To verify cron jobs are running, use:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
