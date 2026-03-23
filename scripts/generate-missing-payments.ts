/**
 * Migration Script: Generate Missing Rental Payments
 *
 * This script generates missing rental payments for existing ledgers.
 * It's designed to be run once to backfill payments for ledgers created
 * before the rental payment generation logic was implemented.
 *
 * Payment Status Logic:
 * - Payments with due_date < today → OVERDUE
 * - Payments with due_date >= today → PENDING
 *
 * Usage:
 *   npx tsx scripts/generate-missing-payments.ts
 *
 * Or with dry-run (preview only):
 *   npx tsx scripts/generate-missing-payments.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://kkxxnpfwvlbsqvmbirqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface RiderLedger {
  id: string;
  rider_id: string;
  rider_name: string;
  rental_frequency: 'daily' | 'weekly' | 'monthly';
  rental_amount: number;
  rental_start_date: string;
  created_at: string;
  is_historical?: boolean;
}

interface ExistingPayment {
  id: string;
  payment_id: string;
  ledger_id: string;
  payment_type: 'security_deposit' | 'rental';
  due_date: string;
  status: string;
}

const isDryRun = process.argv.includes('--dry-run');

/**
 * Normalize date to start of day for accurate comparison
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Calculate the number of periods between two dates based on frequency
 */
function calculatePeriods(startDate: Date, endDate: Date, frequency: string): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case 'daily':
      return diffDays;
    case 'weekly':
      return Math.ceil(diffDays / 7);
    case 'monthly':
      return Math.ceil(diffDays / 30);
    default:
      return 0;
  }
}

/**
 * Main function to generate missing payments
 */
async function generateMissingPayments() {
  console.log('='.repeat(60));
  console.log('Generate Missing Rental Payments');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
  console.log('');

  try {
    // Step 1: Fetch all ledgers
    console.log('[Step 1] Fetching all rider ledgers...');
    const { data: ledgers, error: ledgersError } = await supabase
      .from('rider_ledgers')
      .select('*')
      .order('created_at', { ascending: true });

    if (ledgersError) throw ledgersError;
    console.log(`Found ${ledgers?.length || 0} ledgers`);
    console.log('');

    if (!ledgers || ledgers.length === 0) {
      console.log('No ledgers found. Exiting.');
      return;
    }

    // Step 2: Fetch all existing payments
    console.log('[Step 2] Fetching existing payments...');
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, payment_id, ledger_id, payment_type, due_date, status');

    if (paymentsError) throw paymentsError;
    console.log(`Found ${existingPayments?.length || 0} existing payments`);
    console.log('');

    // Group existing payments by ledger_id
    const paymentsByLedger = new Map<string, ExistingPayment[]>();
    for (const payment of existingPayments || []) {
      if (!paymentsByLedger.has(payment.ledger_id)) {
        paymentsByLedger.set(payment.ledger_id, []);
      }
      paymentsByLedger.get(payment.ledger_id)!.push(payment);
    }

    // Step 3: Get the highest existing payment number
    console.log('[Step 3] Determining next payment ID number...');
    const paymentIds = (existingPayments || [])
      .map(p => p.payment_id)
      .filter(id => id.startsWith('P'))
      .map(id => parseInt(id.substring(1)))
      .filter(num => !isNaN(num));

    let nextPaymentNumber = paymentIds.length > 0 ? Math.max(...paymentIds) + 1 : 1;
    console.log(`Next payment number will start from: P${nextPaymentNumber.toString().padStart(3, '0')}`);
    console.log('');

    // Step 4: Process each ledger
    console.log('[Step 4] Processing ledgers...');
    console.log('-'.repeat(60));

    const today = normalizeDate(new Date());
    console.log(`Today's date (normalized): ${today.toISOString().split('T')[0]}`);
    console.log('');

    let totalPaymentsToInsert = 0;
    const allNewPayments: any[] = [];

    for (const ledger of ledgers as RiderLedger[]) {
      console.log(`\nLedger: ${ledger.rider_name} (${ledger.rider_id})`);
      console.log(`  ID: ${ledger.id}`);
      console.log(`  Frequency: ${ledger.rental_frequency}`);
      console.log(`  Amount: ₹${ledger.rental_amount}`);
      console.log(`  Start Date: ${ledger.rental_start_date}`);
      console.log(`  Historical: ${ledger.is_historical ? 'Yes' : 'No'}`);

      // Check existing payments for this ledger
      const ledgerPayments = paymentsByLedger.get(ledger.id) || [];
      const rentalPayments = ledgerPayments.filter(p => p.payment_type === 'rental');
      const securityDeposit = ledgerPayments.find(p => p.payment_type === 'security_deposit');

      console.log(`  Existing payments: ${ledgerPayments.length} (Security: ${securityDeposit ? 1 : 0}, Rental: ${rentalPayments.length})`);

      // Skip if rental payments already exist
      if (rentalPayments.length > 0) {
        console.log(`  ⏭️  Skipping - rental payments already exist`);
        continue;
      }

      // Calculate periods to generate
      const startDate = normalizeDate(new Date(ledger.rental_start_date));
      const isRetroactive = startDate < today;

      let periodsToGenerate: number;
      if (isRetroactive) {
        // For retroactive: generate all periods UP TO current period (no future)
        // Past periods → OVERDUE
        // Current period (due_date >= today) → PENDING
        // Future periods → NOT generated (handled by cron job)
        periodsToGenerate = calculatePeriods(startDate, today, ledger.rental_frequency) + 1; // +1 for current period
      } else {
        // For future start dates: 6 periods (all pending)
        periodsToGenerate = 6;
      }

      // Cap at reasonable limits
      const maxPeriods = ledger.rental_frequency === 'daily' ? 400 :
                         ledger.rental_frequency === 'weekly' ? 60 : 24;
      periodsToGenerate = Math.max(1, Math.min(periodsToGenerate, maxPeriods));

      console.log(`  Periods to generate: ${periodsToGenerate} (retroactive: ${isRetroactive})`);

      // Generate payment records
      const newPayments: any[] = [];
      let foundFirstPending = false; // Track if we've found the current period

      for (let i = 0; i < periodsToGenerate; i++) {
        const dueDate = new Date(startDate);

        // Calculate due date based on frequency
        switch (ledger.rental_frequency) {
          case 'daily':
            dueDate.setDate(dueDate.getDate() + i);
            break;
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + (i * 7));
            break;
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + i);
            break;
        }
        const normalizedDueDate = normalizeDate(dueDate);

        // For retroactive: stop generating once we've passed the current period
        // (current period = first one with due_date >= today)
        if (isRetroactive && foundFirstPending) {
          break;
        }

        // Determine payment status:
        // For RETROACTIVE entries:
        //   - All past periods (due_date < today) → OVERDUE
        //   - Current period (first due_date >= today) → PENDING
        //   - Future periods → NOT generated
        // For LIVE entries:
        //   - All 6 periods → PENDING (will become overdue after 4 days past due)
        let paymentStatus: string;
        if (isRetroactive) {
          const isPastDue = normalizedDueDate < today;
          if (isPastDue) {
            paymentStatus = 'overdue';
          } else {
            paymentStatus = 'pending';
            foundFirstPending = true; // This is the current period
          }
        } else {
          // Live entries: all pending initially
          paymentStatus = 'pending';
        }

        const paymentId = `P${nextPaymentNumber.toString().padStart(3, '0')}`;

        newPayments.push({
          payment_id: paymentId,
          rider_id: ledger.rider_id,
          rider_name: ledger.rider_name,
          amount: ledger.rental_amount,
          due_date: normalizedDueDate.toISOString().split('T')[0],
          payment_date: null, // Not paid yet
          status: paymentStatus,
          payment_type: 'rental',
          rental_period: `${ledger.rental_frequency.charAt(0).toUpperCase() + ledger.rental_frequency.slice(1)} Rental - ${normalizedDueDate.toLocaleDateString()}`,
          ledger_id: ledger.id,
        });

        nextPaymentNumber++;
      }

      console.log(`  📝 Generating ${newPayments.length} rental payments:`);
      console.log(`     - Overdue: ${newPayments.filter(p => p.status === 'overdue').length}`);
      console.log(`     - Pending: ${newPayments.filter(p => p.status === 'pending').length}`);

      // Show sample of first and last payment
      if (newPayments.length > 0) {
        const first = newPayments[0];
        const last = newPayments[newPayments.length - 1];
        console.log(`     First: ${first.payment_id} | ${first.due_date} | ${first.status}`);
        console.log(`     Last:  ${last.payment_id} | ${last.due_date} | ${last.status}`);
      }

      totalPaymentsToInsert += newPayments.length;
      allNewPayments.push(...newPayments);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total new payments to insert: ${totalPaymentsToInsert}`);
    console.log(`  - Overdue: ${allNewPayments.filter(p => p.status === 'overdue').length}`);
    console.log(`  - Pending: ${allNewPayments.filter(p => p.status === 'pending').length}`);

    if (isDryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were made to the database.');
      console.log('Run without --dry-run to apply changes.');
      return;
    }

    if (totalPaymentsToInsert === 0) {
      console.log('\n✅ No missing payments found. All ledgers have rental payments.');
      return;
    }

    // Step 5: Insert payments in batches
    console.log('\n[Step 5] Inserting payments...');
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < allNewPayments.length; i += BATCH_SIZE) {
      const batch = allNewPayments.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('payments')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
        throw insertError;
      }

      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${totalPaymentsToInsert} payments...`);
    }

    console.log('\n✅ SUCCESS! All missing rental payments have been generated.');
    console.log(`   Total inserted: ${inserted}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
generateMissingPayments();
