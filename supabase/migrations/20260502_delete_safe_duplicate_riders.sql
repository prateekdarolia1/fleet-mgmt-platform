-- Delete duplicate rider rows where the loser has zero downstream data
-- (no payments, no rental_ledgers, no vehicle assignment, no rider_events).
-- Each row listed here was verified against payments / rental_ledgers /
-- vehicles / rider_events as having 0 references on 2026-05-02.
--
-- Other duplicate phone groups (LPR0001/LPR0002, LPR0006/LPR0066) are
-- intentionally NOT touched here — they have downstream data and need a
-- per-row decision before merging or deleting.

DELETE FROM public.riders
WHERE rider_id IN (
  'LPR0035', -- dup of LPR0034 (phone 9355650610)
  'LPR0049', -- dup of LPR0041 (phone 9569256668)
  'LPR0060', -- dup of LPR0071 (phone 7065334133)
  'LPR0072', -- dup of LPR0073 (phone 7379146745)
  'LPR0075'  -- dup of LPR0087 (phone 8874606046)
);
