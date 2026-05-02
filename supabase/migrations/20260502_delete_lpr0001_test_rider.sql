-- Delete LPR0001 — duplicate of LPR0002 on phone 7392813891.
-- LPR0001 ("AKASH TEST", deboarded) has:
--   - 0 payments
--   - 0 vehicles assigned
--   - 0 rider_events
--   - 1 rental_ledger (suspended, rental_amount=0, paused_reason='test',
--     0 rental_payments tied to it) — clearly a test row, deleted alongside.
-- Verified against live DB on 2026-05-02.

DELETE FROM public.rental_ledgers
WHERE rider_id = 'LPR0001';

DELETE FROM public.riders
WHERE rider_id = 'LPR0001';
