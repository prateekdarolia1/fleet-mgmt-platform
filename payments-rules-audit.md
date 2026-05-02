# Payment Rules Audit — "Upcoming = this week only" & "Overdue = past 3-day grace"

**Date:** 2026-05-02
**Live DB inspection:** 2026-05-01 (UTC) via `scripts/inspect-payments-state.mjs`
**Scope:** `fleet-mgmt-platform` only (the EV-rental admin app on Supabase). Not the e-commerce LilyPad apps.

---

## 1. TL;DR — Where We Are

Both rules are **partially implemented** with **multiple sources of truth disagreeing**. The DB cron is mostly correct (since 2026-04-03), but four divergence points remain that explain the symptoms you're seeing.

**The two rules in plain language:**

| Rule | Canonical proposal |
|---|---|
| **Upcoming scope** | A `rental_payments` row is "upcoming" only if its `due_date` falls inside the **current week window**: `[today − 3 days, today + 7 days]`. The `−3` covers the grace period; the `+7` covers the next due date. Anything beyond that is *future*, not *upcoming*. |
| **Overdue definition** | A row is overdue **only when** `due_date < today − 3 days` AND status ∈ `{pending, partial}`. Inside the 3-day grace, the row is still upcoming. |

**Live data confirms the symptom:**

| Metric | Count | Comment |
|---|---:|---|
| `rental_payments` total | 378 | |
| `rental_payments` paid | 191 | |
| `rental_payments` pending | 131 | |
| `rental_payments` overdue | 56 | |
| Pending with `due_date ≥ today` | 118 | |
| ↳ in next 7 days (this week) | **74** | ✅ should be "upcoming" |
| ↳ in next 8–14 days (NEXT week) | **44** | ❌ should NOT be in "upcoming" today |
| Active ledgers with **>1 future pending row** | **54** | residue from old ≤2026-04-04 schedules + cron's overlap window |
| Past 3-day grace but still pending | 0 | ✅ cron is firing correctly |
| Wrongly marked overdue inside 3-day grace | **8** | ❌ insert-time logic uses 0-day grace, not 3 |

**Translation:** the cron is healthy. Two real bugs remain in the *write* side; the rest is UI hooks and stats KPIs ignoring the canonical rule when *reading*.

---

## 2. Authoritative Tables (don't lose this)

Per the project CLAUDE.md and live schema:

| Question | Authoritative table | Filter |
|---|---|---|
| Money collected | `payments` | `status='paid' AND cancelled_at IS NULL` |
| Outstanding rentals | `rental_payments` | `status IN ('overdue','pending','partial')` |
| What's "upcoming this week" | `rental_payments` | the proposed window above |

`payments` is mostly historical/paid + security-deposit rows now (280 rows; 275 paid). The `rental_payments` table is the operational one for "who owes us money this week."

The dual-table sync trigger (`20260326_create_sync_triggers.sql`) is what keeps them aligned, but in practice **`rental_payments` is the only table that should drive the upcoming/overdue UI** (the 56 vs 4 overdue split shown above is exactly that asymmetry — the trigger is not bidirectional for status flips).

---

## 3. DB-Layer Map (current state)

| Object | File | What it does today |
|---|---|---|
| `confirm_rental_start` (latest) | `20260406_fix_confirm_rental_start_include_start_date.sql` | On rental confirmation, generates rows from `rental_start_date` to `CURRENT_DATE + 7 days`. **Insert-time status uses `due_date < CURRENT_DATE` (0-day grace).** |
| `generate_weekly_payments` | `20260403_fix_cron_and_overdue_logic.sql` | Cron daily 00:00 UTC. Adds **one** next-week row for each active ledger whose latest row is within 6 days and that has no row beyond 6 days. Inserts `status='pending'` only. |
| `mark_overdue_payments` | `20260403_fix_cron_and_overdue_logic.sql` | Cron daily 01:00 UTC. Flips `pending/partial` rows to `overdue` when `due_date < CURRENT_DATE - INTERVAL '3 days'`. **3-day grace: correct.** Updates both `rental_payments` and `payments`. |
| `mark_rental_payment_paid` | `20260307_add_mark_rental_payment_paid_rpc.sql` (latest overload `20260404_fix_mark_rental_payment_paid_overload.sql`) | Per-row "mark paid" RPC — fine. |
| `useRiderLedgers.reactivateLedger` (client-side) | `src/hooks/useRiderLedgers.ts:784–950` | On reactivation, generates dueDates client-side from `start_date` until first non-overdue date. **Uses `current < today` (0-day grace).** Inserts directly into `rental_payments` (rental_ledgers source) or `payments` (rider_ledgers source). |

**Cron has been fixed, insertion logic has not.**

---

## 4. UI/Hook-Layer Map (current state)

| Hook / file | Window for "upcoming" | Grace for "overdue" | Used by |
|---|---|---|---|
| `useUnifiedPayments.useUnifiedUpcomingPayments(days=7)` | `[today − 3 days, today + days]` | 3 days | `PaymentTracking.tsx` (days=7), `TLCollection.tsx` (**days=14**) |
| `useUnifiedPayments.useUnifiedOverduePayments` | — | **3 days** ✅ | `PaymentTracking.tsx`, `TLCollection.tsx` |
| `useRentalPayments.useUpcomingPayments(days=7)` | `[today, today + days]` (no grace lookback) | — | nobody currently — dead-ish, but exported |
| `useRentalPayments.useOverduePayments` | — | **4 days** ❌ comment says "MORE than 4 calendar days" | nobody currently — dead-ish, but exported |
| `useRentalPayments.useRentalPaymentStats` | — none — counts ALL `pending/partial/overdue` rows regardless of week | — | not currently consumed in main dashboard, but exported |
| `usePayments.getTotalStats` (in `usePayments.ts:211`) | — none — counts ALL rows in `payments` table | — | `PaymentTracking.tsx` "Pending" KPI card |
| `RentalLedgerDetail.tsx:88–99` (per-ledger view) | — none — sums all `pending/partial/overdue` rows for the ledger | — | per-ledger drilldown — this is fine for a ledger detail view, but worth confirming |

---

## 5. Divergence Catalogue (the workarounds you mentioned)

**D1. Insert-time vs cron-time grace mismatch (the source of the 8 wrongly-overdue rows)**

- `confirm_rental_start` writes `status='overdue'` for any past due_date with **no grace**.
- `mark_overdue_payments` cron (correct) only flips to overdue past **3-day grace**.
- Net: rows inserted with `due_date = today − 1d` come in as `overdue` immediately, but the cron will never UN-flip them. They stay wrongly-overdue until paid.
- Same problem in `useRiderLedgers.reactivateLedger` (client-side insertion).

**D2. Two parallel hook sets with different rules**

- `useUnifiedPayments` is correct (3-day grace, configurable forward window).
- `useRentalPayments` is stale: 4-day grace on overdue, no grace lookback on upcoming, KPI hook counts all rows.
- They both read the same DB but apply different windows.

**D3. Inconsistent forward window**

- `PaymentTracking.tsx` calls `useUnifiedUpcomingPayments(7)` → 7 days forward.
- `TLCollection.tsx` calls `useUnifiedUpcomingPayments(14)` → **14 days forward**, which directly contradicts the "this week only" rule. A TL on the collection page sees next week's not-yet-due rows.

**D4. Stats KPIs ignore the window entirely**

- `PaymentTracking.tsx`'s "Pending" card uses `usePayments.getTotalStats()`, which sums every `pending`/`overdue` row in the `payments` table (no date filter).
- `RentalLedgerDetail.tsx`'s "outstanding" card sums every pending/partial/overdue row for that ledger (no date filter — this is arguably *correct* for a per-ledger drilldown, but wrong for fleet-wide KPIs).
- Result: even if upcoming queries respect the rule, the headline KPI numbers don't.

**D5. Cron's lookahead window creates 0–7 day overlap**

- `generate_weekly_payments` triggers when latest pending row is within 6 days. It then inserts a row at `latest_due + 7 days`, which can be anywhere from `today + 1` to `today + 13`.
- That row is `> today + 6` going forward, so the cron stops — but for ~7 days the ledger has TWO future pending rows (this week + next week).
- This is the "deliberate ratchet" behavior of the current design; it's not strictly a bug, but it conflicts with "upcoming = strictly this week only" if you treat *anything* the user sees in the upcoming list as in-scope.

**D6. Historical residue**

- The `confirm_rental_start` migrations between 2026-04-03 and 2026-04-05 wrote up to **42 days** of pending rows in advance for any ledger confirmed in that window.
- That's why some active ledgers today still have 2–3 future pending rows even though current code only generates 1.

---

## 6. Recommended Canonical Rules (proposal)

```
Let GRACE  = 3 days
Let WINDOW = 7 days

For a rental_payments / payments row R with payment_type='rental':

  status_effective(R) =
    | paid       if R.status = 'paid'
    | partial    if R.status = 'partial' AND R.due_date >= today - GRACE
    | upcoming   if R.status IN ('pending','partial') AND
                    today - GRACE <= R.due_date <= today + WINDOW
    | overdue    if R.status IN ('pending','partial') AND
                    R.due_date <  today - GRACE
    | future     if R.status IN ('pending','partial') AND
                    R.due_date >  today + WINDOW
    | cancelled  if R.cancelled_at IS NOT NULL
    | waived     if R.status = 'waived'

UI buckets:
  "Upcoming" tab     → status_effective = upcoming  (KPI card and list use this same definition)
  "Overdue" tab      → status_effective = overdue
  "Pending" KPI      → upcoming + overdue (this is the "outstanding-this-week" number)
  "Future" backlog   → status_effective = future (advanced/admin only — usually hidden)
  Per-ledger detail  → show all rows; no window filter
```

Two knobs to confirm with you:
- **`WINDOW = 7`?** Or do you want the strict "rest of the calendar week" (i.e., until Sunday)? "Next 7 days" is simpler and survives weekend boundaries.
- **What to do with `future` rows that already exist (the 44 next-week rows + ~10 in week-after rows)?** Three options in §8.

---

## 7. Recommended Target Architecture

**Principle: one definition lives in one place, used everywhere.**

The target is a single utility — call it `lib/payments/window.ts` — that exposes:

```ts
export const PAYMENT_GRACE_DAYS = 3
export const PAYMENT_WINDOW_DAYS = 7

export type EffectiveStatus = 'paid'|'upcoming'|'overdue'|'future'|'cancelled'|'waived'|'partial'

export function effectiveStatus(row: { status; due_date; cancelled_at? }, today=new Date()): EffectiveStatus
export function upcomingFilter(today=new Date()): { gte: string; lte: string }
export function overdueFilter(today=new Date()): { lt: string }
```

…and every hook (`useUnifiedPayments`, `useRentalPayments`, `useRentalPaymentStats`, `usePayments.getTotalStats`, `RentalLedgerDetail`'s stats) becomes a thin wrapper around it.

**Mirror the rule in DB-side helper views/functions** so reports (`scripts/export-payments-collected.mjs`) and any future server-side rollups apply the same definition without re-implementing it:

```sql
-- one view to rule them all
CREATE OR REPLACE VIEW v_rental_payments_classified AS
SELECT
  rp.*,
  CASE
    WHEN rp.status = 'paid'                                                 THEN 'paid'
    WHEN rp.status = 'waived'                                               THEN 'waived'
    WHEN rp.status IN ('pending','partial')
         AND rp.due_date <  CURRENT_DATE - INTERVAL '3 days'                THEN 'overdue'
    WHEN rp.status IN ('pending','partial')
         AND rp.due_date <= CURRENT_DATE + INTERVAL '7 days'                THEN 'upcoming'
    WHEN rp.status IN ('pending','partial')                                 THEN 'future'
    WHEN rp.status = 'overdue'                                              THEN 'overdue'
    ELSE rp.status::text
  END AS effective_status
FROM rental_payments rp;
```

Reads from app + scripts + reports = same answer. No more divergence.

**Insertion is the second invariant to fix:**

- `confirm_rental_start`, `useRiderLedgers.reactivateLedger`, and any historical-import path must use the **same grace** as the cron when they decide whether to insert a row as `pending` vs `overdue`.
- `generate_weekly_payments` cron stays as-is — the +6 day ratchet is fine, *but* we can tighten it to `+ INTERVAL '0 days'` so it generates exactly when the latest payment becomes due (eliminating the 0–7 day double-row window). This is a tradeoff: it removes the 7-day buffer for users to pre-pay, but matches "upcoming = this week only" stricter. Worth a discussion before changing.

---

## 8. Migration Path (high-level — confirm before I write SQL/code)

**Phase A — DB cleanup (read-only investigation already done; writes need your approval)**

1. **Reset the 8 wrongly-overdue rows back to `pending`** (those inside the 3-day grace).
2. **Decide on the 44 next-week + 10 week-after pending rows.** Options:
   - **A.1 — Aggressive:** delete them. Cron will recreate them on schedule. Pro: clean state. Con: payment_id sequence "wastes" numbers (cosmetic).
   - **A.2 — Conservative:** leave them. They're not wrong per se (they exist; they're just early). Adjust the read side only.
   - **A.3 — Middle:** keep next-week (8–14 days), delete week-after (>14 days). Matches the cron's natural ratchet.

**Phase B — Insertion alignment**

3. Patch `confirm_rental_start` to apply the same 3-day grace at insert time (`v_status := 'overdue' WHEN v_current_due < CURRENT_DATE - INTERVAL '3 days' ELSE 'pending'`).
4. Patch `useRiderLedgers.reactivateLedger` similarly.
5. Audit `lib/import/historicalImport.ts` and any retroactive-entry paths for the same issue.

**Phase C — Read-side consolidation**

6. Add `lib/payments/window.ts` (constants + helpers) and the SQL view `v_rental_payments_classified`.
7. Migrate `useUnifiedPayments` to use the helpers — this becomes the only payment-list hook.
8. Delete the divergent `useRentalPayments.useOverduePayments` / `useUpcomingPayments` (or make them wrappers).
9. Fix `TLCollection.tsx` to use `7` not `14`.
10. Fix `PaymentTracking.tsx`'s "Pending" KPI to compute `upcoming + overdue` from the unified hook, not `usePayments.getTotalStats`.
11. Decide if `RentalLedgerDetail.tsx` per-ledger stats should change. (Recommendation: leave as-is; per-ledger view is intentionally lifetime, not weekly.)

**Phase D — Tests + ops**

12. Add unit tests for `effectiveStatus()` covering edge cases at `today`, `today-3`, `today-4`, `today+7`, `today+8`.
13. Verify cron is firing: query `cron.job_run_details` (couldn't read it from anon role; you'll need to check via Supabase SQL editor).
14. Add a daily job-output sanity check (e.g., assert no row exists with `status='overdue' AND due_date >= today-3`).

---

## 9. Open Questions for You

1. **Strict "this week" or "next 7 days"?** Are you OK with `today + 7 days` as the upcoming boundary, or do you want "until Sunday"?
2. **Cron lookahead:** keep the +6-day ratchet (which produces the 0–7 day double-row window), or tighten it to "create on the day the previous payment becomes due"?
3. **Historical residue cleanup:** A.1, A.2, or A.3 from §8?
4. **Are there mobile/PWA views** I haven't looked at that also display upcoming/overdue? I scanned `src/pages/` and the fleet components — let me know if there's another consumer.
5. **`useRentalPaymentStats`** is exported but I couldn't find a call site. OK to delete, or is it consumed somewhere I missed?

Once you answer these I can:
- write the cleanup SQL (as a `.md` per your db-queries preference) for Phase A,
- patch the RPCs and client insertion paths for Phase B, and
- consolidate the hooks for Phase C.

---

## Appendix — Inspection Script

Generated `scripts/inspect-payments-state.mjs`. Re-run any time:

```bash
cd fleet-mgmt-platform && node scripts/inspect-payments-state.mjs
```

Read-only. Uses the same anon key as `read-all.mjs`.
