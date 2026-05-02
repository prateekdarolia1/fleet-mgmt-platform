// Read-only inspection of rental_payments + payments to map current state.
// Runs against the same anon key used by read-all.mjs.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkxxnpfwvlbsqvmbirqa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q'
)

// Use UTC throughout — Postgres CURRENT_DATE is UTC. Computing from local
// midnight then toISOString() leaks the local TZ offset and produces an
// off-by-one threshold during late-night IST hours.
const dayMs = 24 * 60 * 60 * 1000
const utcDateStr = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

const today = new Date()
const todayStr = utcDateStr(today)
const threeDaysAgo = utcDateStr(new Date(today.getTime() - 3 * dayMs))
const sevenDaysOut = utcDateStr(new Date(today.getTime() + 7 * dayMs))
const fourteenDaysOut = utcDateStr(new Date(today.getTime() + 14 * dayMs))
const thirtyDaysOut = utcDateStr(new Date(today.getTime() + 30 * dayMs))

console.log(`Today (UTC date): ${todayStr}`)
console.log(`3 days ago: ${threeDaysAgo}`)
console.log(`+7 days: ${sevenDaysOut}`)
console.log(`+14 days: ${fourteenDaysOut}`)
console.log(`+30 days: ${thirtyDaysOut}`)
console.log('')

// 1. rental_payments status breakdown
const { data: rpAll } = await supabase
  .from('rental_payments')
  .select('id, due_date, status, ledger_id, week_number, amount_due')

const total = rpAll?.length || 0
const byStatus = {}
for (const r of rpAll || []) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1
}
console.log(`=== rental_payments TOTAL: ${total} ===`)
console.log('Status breakdown:', byStatus)

// 2. Future-dated rental_payments distribution (only pending/partial)
const futurePending = (rpAll || []).filter(
  (r) => ['pending', 'partial'].includes(r.status) && r.due_date >= todayStr
)
const futureBuckets = {
  thisWeek_le7: 0,
  next1to14: 0,
  next15to30: 0,
  next31to60: 0,
  next61plus: 0,
}
for (const r of futurePending) {
  const days = Math.floor((new Date(r.due_date + 'T00:00:00Z') - new Date(todayStr + 'T00:00:00Z')) / dayMs)
  if (days <= 7) futureBuckets.thisWeek_le7++
  else if (days <= 14) futureBuckets.next1to14++
  else if (days <= 30) futureBuckets.next15to30++
  else if (days <= 60) futureBuckets.next31to60++
  else futureBuckets.next61plus++
}
console.log(`\n=== rental_payments PENDING/PARTIAL with due_date >= today: ${futurePending.length} ===`)
console.log('Bucketed by days-from-now:', futureBuckets)

// 3. Past-due pending/partial within grace window (1-3 days past due — UI calls these "upcoming")
const inGrace = (rpAll || []).filter(
  (r) => ['pending', 'partial'].includes(r.status) && r.due_date < todayStr && r.due_date >= threeDaysAgo
)
console.log(`\n=== rental_payments PENDING/PARTIAL within 3-day grace (due_date < today, >= ${threeDaysAgo}): ${inGrace.length} ===`)

// 4. Should-be-overdue but still pending (past 3-day grace, status not flipped) — indicates cron didn't run
const stuckPending = (rpAll || []).filter(
  (r) => ['pending', 'partial'].includes(r.status) && r.due_date < threeDaysAgo
)
console.log(`\n=== rental_payments PENDING/PARTIAL past 3-day grace (cron should have flipped these): ${stuckPending.length} ===`)
if (stuckPending.length > 0) {
  console.log('Sample (first 5):')
  for (const r of stuckPending.slice(0, 5)) {
    console.log(`  - ledger=${r.ledger_id} week=${r.week_number} due=${r.due_date} status=${r.status}`)
  }
}

// 5. status='overdue' but due_date is recent (within grace) — would be wrong
const wronglyOverdue = (rpAll || []).filter((r) => r.status === 'overdue' && r.due_date >= threeDaysAgo)
console.log(`\n=== rental_payments OVERDUE with due_date >= ${threeDaysAgo} (within grace, should still be pending): ${wronglyOverdue.length} ===`)
if (wronglyOverdue.length > 0) {
  for (const r of wronglyOverdue.slice(0, 5)) {
    console.log(`  - ledger=${r.ledger_id} week=${r.week_number} due=${r.due_date} status=${r.status}`)
  }
}

// 6. Same picture from `payments` table
const { data: payAll } = await supabase
  .from('payments')
  .select('id, payment_id, due_date, status, payment_type, rider_id, ledger_id')

const payTotal = payAll?.length || 0
const payByStatus = {}
for (const p of payAll || []) {
  payByStatus[p.status] = (payByStatus[p.status] || 0) + 1
}
console.log(`\n=== payments TOTAL: ${payTotal} ===`)
console.log('Status breakdown:', payByStatus)

const payRental = (payAll || []).filter((p) => p.payment_type === 'rental')
const payRentalFuturePending = payRental.filter(
  (p) => ['pending', 'partial'].includes(p.status) && p.due_date >= todayStr
)
const payRentalBuckets = { thisWeek_le7: 0, next1to14: 0, next15to30: 0, next31to60: 0, next61plus: 0 }
for (const p of payRentalFuturePending) {
  const days = Math.floor((new Date(p.due_date) - today) / dayMs)
  if (days <= 7) payRentalBuckets.thisWeek_le7++
  else if (days <= 14) payRentalBuckets.next1to14++
  else if (days <= 30) payRentalBuckets.next15to30++
  else if (days <= 60) payRentalBuckets.next31to60++
  else payRentalBuckets.next61plus++
}
console.log(`\n=== payments PENDING/PARTIAL rental with due_date >= today: ${payRentalFuturePending.length} ===`)
console.log('Bucketed by days-from-now:', payRentalBuckets)

const payStuck = payRental.filter(
  (p) => ['pending', 'partial'].includes(p.status) && p.due_date < threeDaysAgo
)
console.log(`\n=== payments PENDING/PARTIAL rental past 3-day grace: ${payStuck.length} ===`)

const payWronglyOverdue = payRental.filter((p) => p.status === 'overdue' && p.due_date >= threeDaysAgo)
console.log(`\n=== payments OVERDUE rental with due_date >= ${threeDaysAgo} (within grace): ${payWronglyOverdue.length} ===`)

// 7. Active rental_ledgers that have MORE than 1 future pending row (this is the smoking gun for over-generation)
const activeLedgers = await supabase
  .from('rental_ledgers')
  .select('id, rider_id, rider_name, status, rental_start_date')
  .eq('status', 'active')

const ledgerIdToFuturePending = {}
for (const r of futurePending) {
  ledgerIdToFuturePending[r.ledger_id] = (ledgerIdToFuturePending[r.ledger_id] || 0) + 1
}
const ledgersWithExtraFuture = (activeLedgers.data || [])
  .map((l) => ({ ...l, futurePending: ledgerIdToFuturePending[l.id] || 0 }))
  .filter((l) => l.futurePending > 1)
  .sort((a, b) => b.futurePending - a.futurePending)
console.log(`\n=== Active rental_ledgers with >1 future pending row: ${ledgersWithExtraFuture.length} ===`)
for (const l of ledgersWithExtraFuture.slice(0, 10)) {
  console.log(`  - ${l.rider_id} ${l.rider_name}: ${l.futurePending} future pending rows`)
}

// 8. Cron job presence — try to call the function manually (read result only, do NOT actually mutate)
//    We just look at job_run_details if accessible.
const cronJobs = await supabase.from('cron.job').select('jobname, schedule, active').limit(20)
if (cronJobs.error) {
  console.log(`\n=== cron.job lookup failed (probably RLS): ${cronJobs.error.message} ===`)
} else {
  console.log('\n=== cron.job rows:')
  console.table(cronJobs.data)
}
