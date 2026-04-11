import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LedgerStatus = 'active' | 'paused' | 'closed';
export type SecurityDepositStatus = 'retained' | 'refunded' | 'partially_refunded';

// Formats a Date as YYYY-MM-DD using LOCAL timezone.
// toISOString() uses UTC which causes off-by-one errors for IST (UTC+5:30) users.
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ============================================================================
// HELPER FUNCTIONS (Tasks 3.1-3.6, 4.1-4.6, 5.1-5.11)
// ============================================================================

/**
 * Generate the next payment ID(s) with retry logic for UNIQUE constraint violations
 * Task 3.1-3.6, 9.2: Payment ID sequencing with collision handling
 *
 * Payment IDs follow the format "P###" where ### is a zero-padded number (e.g., P001, P002).
 * This function queries the MAX payment_id and generates a sequential batch.
 *
 * @param count - Number of payment IDs to generate (for bulk operations)
 * @param maxRetries - Maximum retry attempts on UNIQUE constraint violations (default: 3)
 * @returns Promise resolving to array of payment IDs in P### format
 * @throws Error if unable to generate IDs after all retries
 *
 * @example
 * const ids = await getNextPaymentIds(5);
 * // Returns: ['P042', 'P043', 'P044', 'P045', 'P046']
 */
async function getNextPaymentIds(count: number, maxRetries = 3): Promise<string[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Query MAX payment_id from BOTH tables so we never collide with IDs
      // that exist only in rental_payments (e.g. created via confirm_rental_start RPC)
      const parseId = (id: string | null | undefined): number => {
        if (!id) return 0;
        const match = id.match(/^P(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const [paymentsRes, rentalRes] = await Promise.all([
        supabase
          .from('payments')
          .select('payment_id')
          .like('payment_id', 'P%')
          .order('payment_id', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('rental_payments')
          .select('payment_id')
          .like('payment_id', 'P%')
          .order('payment_id', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const nextNumber = Math.max(
        parseId(paymentsRes.data?.payment_id),
        parseId(rentalRes.data?.payment_id)
      ) + 1;

      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        ids.push(`P${(nextNumber + i).toString().padStart(3, '0')}`);
      }
      return ids;
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to generate payment IDs after ${maxRetries} attempts`);
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Failed to generate payment IDs');
}

/**
 * Insert payments with retry logic for UNIQUE constraint violations
 * Task 3.5, 5.10, 6.2, 9.2: Bulk payment insertion with collision handling
 *
 * Handles concurrent ledger creation scenarios where multiple requests might
 * generate duplicate payment_ids. On UNIQUE violation, regenerates IDs and retries.
 *
 * Database triggers automatically sync to rental_payments table.
 *
 * @param payments - Array of payment objects to insert (must include payment_id)
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Promise that resolves when all payments are inserted successfully
 * @throws Error if insertion fails after all retries
 *
 * @example
 * await insertPaymentsWithRetry([
 *   { payment_id: 'P001', ledger_id: '...', amount: 1000, ... },
 *   { payment_id: 'P002', ledger_id: '...', amount: 1000, ... }
 * ]);
 */
async function insertPaymentsWithRetry(
  payments: Array<Record<string, unknown>>,
  maxRetries = 3
): Promise<void> {
  // Use a mutable local ref so retries can swap in fresh payment IDs
  let currentPayments = payments;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Insert into payments table (triggers will sync to rental_payments)
      const { error } = await supabase
        .from('payments')
        .insert(currentPayments as any);

      if (error) {
        // On unique constraint violation, regenerate IDs and retry
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          console.warn(`[insertPaymentsWithRetry] Unique constraint violation on attempt ${attempt + 1}, retrying...`);
          const paymentIds = await getNextPaymentIds(currentPayments.length);
          currentPayments = currentPayments.map((p, i) => ({
            ...p,
            payment_id: paymentIds[i]
          }));
          continue;
        }
        throw error;
      }
      return; // Success
    } catch (err) {
      if (attempt === maxRetries - 1) {
        console.error('[insertPaymentsWithRetry] All retries exhausted:', err);
        throw err;
      }
    }
  }
  throw new Error('Failed to insert payments after retries');
}

/**
 * Generate retroactive payments for a ledger with past start date
 * Task 4.1-4.6, 9.1: Retroactive payment generation
 *
 * Creates payment entries for the period between start_date and today:
 * - Past payments (due_date < today) → status: "overdue"
 * - Current/future payments (due_date >= today) → status: "pending"
 *
 * @param params - Configuration for retroactive payment generation
 * @param params.ledgerId - UUID of the ledger to generate payments for
 * @param params.riderId - Rider ID
 * @param params.riderName - Rider name for payment records
 * @param params.rentalAmount - Amount per payment period
 * @param params.rentalFrequency - 'daily' | 'weekly' | 'monthly'
 * @param params.startDate - Ledger start date (can be in the past)
 * @param params.today - Reference date for "current" (default: now)
 * @returns Array of payment objects without payment_id (assigned separately)
 *
 * @example
 * const payments = generateRetroactivePayments({
 *   ledgerId: 'uuid-123',
 *   riderId: 'RIDER001',
 *   riderName: 'John Doe',
 *   rentalAmount: 1000,
 *   rentalFrequency: 'weekly',
 *   startDate: new Date('2026-01-18'),
 *   today: new Date('2026-03-26')
 * });
 * // Returns ~10 payments (6 weeks + 4 weeks buffer)
 */
interface RetroactivePaymentParams {
  ledgerId: string;
  riderId: string;
  riderName: string;
  rentalAmount: number;
  rentalFrequency: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  today?: Date;
}

interface GeneratedPayment {
  payment_id: string;
  rider_id: string;
  rider_name: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'overdue';
  payment_type: 'rental';
  rental_period: string;
  ledger_id: string;
}

function generateRetroactivePayments(params: RetroactivePaymentParams): GeneratedPayment[] {
  const {
    ledgerId,
    riderId,
    riderName,
    rentalAmount,
    rentalFrequency,
    startDate,
    today = new Date()
  } = params;

  const payments: GeneratedPayment[] = [];
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);

  // Calculate days difference
  const diffTime = normalizedToday.getTime() - normalizedStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine period days based on frequency
  let periodDays: number;
  let maxPeriods: number;
  switch (rentalFrequency) {
    case 'daily':
      periodDays = 1;
      maxPeriods = 180; // ~6 months
      break;
    case 'weekly':
      periodDays = 7;
      maxPeriods = 26; // ~6 months
      break;
    case 'monthly':
      periodDays = 30;
      maxPeriods = 6; // 6 months
      break;
  }

  // Calculate number of periods to generate
  const numPeriods = Math.min(Math.ceil(diffDays / periodDays), maxPeriods);

  // Generate payments for each period
  for (let i = 0; i <= numPeriods; i++) {
    const dueDate = new Date(normalizedStart);
    dueDate.setDate(dueDate.getDate() + (i * periodDays));
    dueDate.setHours(0, 0, 0, 0);

    // Determine status: past payments are overdue, current/future are pending
    const status: 'pending' | 'overdue' = dueDate < normalizedToday ? 'overdue' : 'pending';

    payments.push({
      payment_id: '', // Will be filled by getNextPaymentIds
      rider_id: riderId,
      rider_name: riderName,
      amount: rentalAmount,
      due_date: toLocalDateStr(dueDate),
      payment_date: null,
      status,
      payment_type: 'rental',
      rental_period: `${rentalFrequency.charAt(0).toUpperCase() + rentalFrequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
      ledger_id: ledgerId,
    });
  }

  return payments;
}

/**
 * Generate gap period payments for ledger reactivation
 * Task 5.1-5.9, 9.1: Gap period payment generation
 *
 * Creates overdue payment entries for the period between paused_at and new start_date.
 * This accounts for rental usage that continued during the pause period.
 *
 * @param params - Configuration for gap payment generation
 * @param params.ledgerId - UUID of the paused ledger being reactivated
 * @param params.riderId - Rider ID
 * @param params.riderName - Rider name for payment records
 * @param params.rentalAmount - Amount per payment period
 * @param params.rentalFrequency - 'daily' | 'weekly' | 'monthly'
 * @param params.pausedAt - Timestamp when ledger was paused
 * @param params.newStartDate - New start date for reactivated ledger
 * @param params.existingWeekNumber - Continue week number sequence from existing payments
 * @returns Array of overdue payment objects without payment_id
 *
 * @example
 * const gapPayments = generateGapPayments({
 *   ledgerId: 'uuid-123',
 *   riderId: 'RIDER001',
 *   riderName: 'John Doe',
 *   rentalAmount: 1000,
 *   rentalFrequency: 'weekly',
 *   pausedAt: new Date('2026-01-01'),
 *   newStartDate: new Date('2026-02-01'),
 *   existingWeekNumber: 4
 * });
 * // Returns ~4 overdue payments for the 1-month gap period
 */
interface GapPaymentParams {
  ledgerId: string;
  riderId: string;
  riderName: string;
  rentalAmount: number;
  rentalFrequency: 'daily' | 'weekly' | 'monthly';
  pausedAt: Date;
  newStartDate: Date;
  existingWeekNumber?: number; // To continue sequence from existing payments
}

function generateGapPayments(params: GapPaymentParams): GeneratedPayment[] {
  const {
    ledgerId,
    riderId,
    riderName,
    rentalAmount,
    rentalFrequency,
    pausedAt,
    newStartDate,
    existingWeekNumber = 0
  } = params;

  const payments: GeneratedPayment[] = [];

  const normalizedPaused = new Date(pausedAt);
  normalizedPaused.setHours(0, 0, 0, 0);

  const normalizedStart = new Date(newStartDate);
  normalizedStart.setHours(0, 0, 0, 0);

  // Calculate gap period
  const diffTime = normalizedStart.getTime() - normalizedPaused.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine period days
  let periodDays: number;
  switch (rentalFrequency) {
    case 'daily':
      periodDays = 1;
      break;
    case 'weekly':
      periodDays = 7;
      break;
    case 'monthly':
      periodDays = 30;
      break;
  }

  // Calculate number of gap periods
  const numGapPeriods = Math.ceil(diffDays / periodDays);

  // Generate overdue payments for each gap period
  for (let i = 0; i < numGapPeriods; i++) {
    const dueDate = new Date(normalizedPaused);
    dueDate.setDate(dueDate.getDate() + ((i + 1) * periodDays));
    dueDate.setHours(0, 0, 0, 0);

    // Don't generate payment if it falls after the new start date
    if (dueDate > normalizedStart) break;

    payments.push({
      payment_id: '', // Will be filled by getNextPaymentIds
      rider_id: riderId,
      rider_name: riderName,
      amount: rentalAmount,
      due_date: toLocalDateStr(dueDate),
      payment_date: null,
      status: 'overdue', // Gap payments are always overdue
      payment_type: 'rental',
      rental_period: `${rentalFrequency.charAt(0).toUpperCase() + rentalFrequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
      ledger_id: ledgerId,
    });
  }

  return payments;
}

export interface RiderLedger {
  id: string;
  rider_id: string;
  rider_name: string;
  security_deposit_amount: number;
  rental_frequency: 'daily' | 'weekly' | 'monthly';
  rental_amount: number;
  rental_start_date: string;
  swaps_allowed_per_month?: number | null;
  created_at: string;
  updated_at: string;
  // Ledger lifecycle fields
  status: LedgerStatus;
  paused_at: string | null;
  paused_reason: string | null;
  reactivated_at: string | null;
  security_deposit_status: SecurityDepositStatus;
  deposit_refunded_at: string | null;
  deposit_refunded_amount: number | null;
  // Which DB table this ledger originated from
  _source: 'rider_ledgers' | 'rental_ledgers';
}

export interface CreateLedgerData {
  rider_id: string;
  rider_name: string;
  security_deposit_amount: number;
  payment_date: string;
  transaction_id: string;
  rental_frequency: 'daily' | 'weekly' | 'monthly';
  rental_amount: number;
  rental_start_date: string;
  swaps_allowed_per_month?: number;
  // Historical tracking fields (for retroactive entries)
  is_historical?: boolean;
  data_source?: string;
  confidence_score?: number;
}

export const useRiderLedgers = () => {
  const [ledgers, setLedgers] = useState<RiderLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgers = async () => {
    try {
      setLoading(true);

      // Fetch from both tables concurrently — rider creation flow writes directly
      // to rental_ledgers, so we must include it to show all ledgers.
      const [riderRes, rentalRes] = await Promise.all([
        supabase.from('rider_ledgers').select('*').order('created_at', { ascending: false }),
        supabase.from('rental_ledgers').select('*').order('created_at', { ascending: false }),
      ]);

      if (riderRes.error) throw riderRes.error;

      // Build set of IDs already covered by rider_ledgers (sync trigger uses same UUID)
      const riderLedgerIds = new Set((riderRes.data || []).map((l: any) => l.id));
      const combined: RiderLedger[] = (riderRes.data || []).map((l: any) => ({ ...l, _source: 'rider_ledgers' as const }));

      // Add rental_ledgers-only entries (i.e. created via rider creation flow)
      if (!rentalRes.error && rentalRes.data) {
        for (const rl of rentalRes.data) {
          if (riderLedgerIds.has(rl.id)) continue; // already present via rider_ledgers

          // Map rental_ledgers status → rider_ledgers status enum
          let status: LedgerStatus;
          switch (rl.status) {
            case 'suspended': status = 'paused'; break;
            case 'closed':
            case 'cancelled': status = 'closed'; break;
            default: status = 'active'; // active + pending_start → show as active
          }

          // Map deposit status
          let depositStatus: SecurityDepositStatus;
          switch (rl.security_deposit_status) {
            case 'refunded': depositStatus = 'refunded'; break;
            default: depositStatus = 'retained'; // collected / pending / null → retained
          }

          combined.push({
            id: rl.id,
            rider_id: rl.rider_id,
            rider_name: rl.rider_name,
            rental_amount: rl.rental_amount,
            rental_start_date: rl.rental_start_date || new Date().toISOString().split('T')[0],
            rental_frequency: 'weekly', // rental_ledgers has no frequency column
            security_deposit_amount: rl.security_deposit || 0,
            security_deposit_status: depositStatus,
            status,
            paused_at: rl.paused_at || null,
            paused_reason: rl.paused_reason || null,
            reactivated_at: rl.reactivated_at || null,
            deposit_refunded_at: rl.deposit_refunded_at || null,
            deposit_refunded_amount: rl.deposit_refunded_amount || null,
            swaps_allowed_per_month: null,
            created_at: rl.created_at || new Date().toISOString(),
            updated_at: rl.updated_at || new Date().toISOString(),
            _source: 'rental_ledgers' as const,
          });
        }
      }

      // Sort combined list by created_at descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLedgers(combined);
    } catch (err) {
      console.error('Error fetching ledgers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createLedger = async (ledgerData: CreateLedgerData) => {
    try {
      // First create the ledger (exclude payment fields and historical tracking fields)
      const {
        payment_date,
        transaction_id,
        is_historical,
        data_source,
        confidence_score,
        ...ledgerOnlyData
      } = ledgerData;

      const { data: ledger, error: ledgerError } = await supabase
        .from('rider_ledgers')
        .insert([ledgerOnlyData])
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // Generate rental payments first so we know the total count before
      // reserving any payment IDs — this prevents the duplicate-ID bug that
      // occurred when getNextPaymentIds was called twice in sequence.
      const startDate = new Date(ledgerData.rental_start_date);
      startDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isRetroactive = ledgerData.is_historical || startDate < today;
      let rentalPayments: GeneratedPayment[] = [];

      if (isRetroactive) {
        console.log(`[createLedger] Generating retroactive payments for ${ledgerData.rider_name}`);
        rentalPayments = generateRetroactivePayments({
          ledgerId: ledger.id,
          riderId: ledgerData.rider_id,
          riderName: ledgerData.rider_name,
          rentalAmount: ledgerData.rental_amount,
          rentalFrequency: ledgerData.rental_frequency,
          startDate,
          today
        });

        const diffDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 180) {
          toast.warning(`Start date is more than 6 months ago. Only generating payments up to 180 days.`);
        }
      } else {
        // Normal entry: generate 1 pending payment (next due date only)
        // Cron (generate_weekly_payments) handles all subsequent weekly payments
        for (let i = 0; i < 1; i++) {
          const dueDate = new Date(startDate);
          switch (ledgerData.rental_frequency) {
            case 'daily':   dueDate.setDate(dueDate.getDate() + i); break;
            case 'weekly':  dueDate.setDate(dueDate.getDate() + (i * 7)); break;
            case 'monthly': dueDate.setMonth(dueDate.getMonth() + i); break;
          }
          dueDate.setHours(0, 0, 0, 0);

          rentalPayments.push({
            payment_id: '',
            rider_id: ledgerData.rider_id,
            rider_name: ledgerData.rider_name,
            amount: ledgerData.rental_amount,
            due_date: toLocalDateStr(dueDate),
            payment_date: null,
            status: 'pending',
            payment_type: 'rental',
            rental_period: `${ledgerData.rental_frequency.charAt(0).toUpperCase() + ledgerData.rental_frequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
            ledger_id: ledger.id,
          });
        }
      }

      // Reserve ALL payment IDs in ONE call now that we know the exact total.
      // +1 for the security deposit (skipped if transaction_id is provided).
      const needDepositId = !ledgerData.transaction_id;
      const totalIdsNeeded = rentalPayments.length + (needDepositId ? 1 : 0);
      const allPaymentIds = await getNextPaymentIds(totalIdsNeeded);
      let idCursor = 0;

      const depositPaymentId = ledgerData.transaction_id || allPaymentIds[idCursor++];

      // Assign rental payment IDs from the same batch
      rentalPayments.forEach((p, i) => {
        p.payment_id = allPaymentIds[idCursor + i];
      });

      // Insert security deposit payment
      const { error: securityDepositError } = await supabase
        .from('payments')
        .insert({
          payment_id: depositPaymentId,
          rider_id: ledgerData.rider_id,
          rider_name: ledgerData.rider_name,
          amount: ledgerData.security_deposit_amount,
          due_date: ledgerData.rental_start_date,
          payment_date: ledgerData.payment_date,
          status: 'paid' as const,
          payment_type: 'security_deposit' as const,
          rental_period: 'Security Deposit',
          ledger_id: ledger.id,
          notes: 'Security deposit payment'
        });

      if (securityDepositError) {
        console.error('[createLedger] Security deposit error:', securityDepositError);
        throw securityDepositError;
      }

      console.log(`[createLedger] Inserting ${rentalPayments.length} rental payments:`, rentalPayments.map(p => ({ id: p.payment_id, due: p.due_date, status: p.status })), `deposit: ${depositPaymentId}`);

      // Task 3.5, 6.2: Insert with retry logic and better error handling
      try {
        await insertPaymentsWithRetry(rentalPayments as any);
      } catch (insertError) {
        console.error('[createLedger] Payment insertion failed:', insertError);
        // Task 6.1, 6.3, 6.5: Show actual error to user
        const message = insertError instanceof Error ? insertError.message : 'Failed to create rental payments';
        toast.error(`Payment creation failed: ${message}. Please try again.`);
        throw insertError;
      }

      console.log(`[createLedger] Successfully inserted ${rentalPayments.length} rental payments`);

      setLedgers(prev => [ledger as any, ...prev]);
      window.dispatchEvent(new CustomEvent('ledger-created'));
      toast.success(`Ledger created successfully for ${ledgerData.rider_name}!`);

      return ledger;
    } catch (err) {
      // Task 6.1, 6.5, 6.6: Better error messages
      console.error('[createLedger] Error creating ledger:', err);
      const message = err instanceof Error ? err.message : 'Failed to create ledger. Please try again.';
      toast.error(message);
      throw err;
    }
  };

  const updateLedger = async (id: string, updates: Partial<CreateLedgerData>) => {
    try {
      const { data, error } = await supabase
        .from('rider_ledgers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLedgers(prev => prev.map(ledger => 
        ledger.id === id ? { ...ledger, ...data } : ledger
      ));

      toast.success('Ledger updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating ledger:', err);
      toast.error('Failed to update ledger');
      throw err;
    }
  };

  const deleteLedger = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rider_ledgers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLedgers(prev => prev.filter(ledger => ledger.id !== id));
      toast.success('Ledger deleted successfully!');
    } catch (err) {
      console.error('Error deleting ledger:', err);
      toast.error('Failed to delete ledger');
      throw err;
    }
  };

  const getRidersWithoutLedgers = async () => {
    try {
      // Get all riders
      const { data: allRiders, error: ridersError } = await supabase
        .from('riders')
        .select('rider_id, name')
        .eq('status', 'active');

      if (ridersError) throw ridersError;

      // Get riders who already have ledgers
      const { data: existingLedgers, error: ledgersError } = await supabase
        .from('rider_ledgers')
        .select('rider_id');

      if (ledgersError) throw ledgersError;

      const ledgerRiderIds = new Set(existingLedgers?.map(l => l.rider_id) || []);

      // Filter out riders who already have ledgers
      const availableRiders = allRiders?.filter(rider =>
        !ledgerRiderIds.has(rider.rider_id)
      ) || [];

      return availableRiders;
    } catch (err) {
      console.error('Error fetching available riders:', err);
      return [];
    }
  };

  // ==================== LEDGER LIFECYCLE FUNCTIONS ====================

  /**
   * Pause an active ledger
   * Only active ledgers can be paused
   */
  const pauseLedger = async (id: string, reason: string) => {
    try {
      const ledger = ledgers.find(l => l.id === id);
      if (!ledger) throw new Error('Ledger not found');
      if (ledger.status !== 'active') throw new Error('Only active ledgers can be paused');
      if (!reason.trim()) throw new Error('Pause reason is required');

      const pausedAt = new Date().toISOString();

      // Route update to whichever table owns this ledger
      // rental_ledgers uses 'suspended' (its CHECK constraint doesn't include 'paused')
      const table = ledger._source === 'rental_ledgers' ? 'rental_ledgers' : 'rider_ledgers';
      const pausedStatus = ledger._source === 'rental_ledgers' ? 'suspended' : 'paused';
      const pauseData = {
        status: pausedStatus,
        paused_at: pausedAt,
        paused_reason: reason.trim(),
      };
      const { error: updateError } = await supabase
        .from(table)
        .update(pauseData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Delete all overdue + pending RENTAL payments from both tables.
      // payments table: rider_ledgers-flow has ledger_id set; rental-flow has ledger_id=null so filter by rider_id+type.
      // rental_payments table: always filter by ledger_id.
      const paymentsDeleteQuery = ledger._source === 'rider_ledgers'
        ? supabase.from('payments').delete().eq('ledger_id', id).in('status', ['overdue', 'pending'])
        : supabase.from('payments').delete().eq('rider_id', ledger.rider_id).eq('payment_type', 'rental').in('status', ['overdue', 'pending']);

      const [paymentsRes, rentalRes] = await Promise.all([
        paymentsDeleteQuery,
        supabase.from('rental_payments').delete().eq('ledger_id', id).in('status', ['overdue', 'pending']),
      ]);

      if (paymentsRes.error) console.error('[pauseLedger] payments delete error:', paymentsRes.error);
      if (rentalRes.error) console.error('[pauseLedger] rental_payments delete error:', rentalRes.error);

      setLedgers(prev => prev.map(l =>
        l.id === id ? { ...l, status: 'paused', paused_at: pausedAt, paused_reason: reason.trim() } : l
      ));

      toast.success('Ledger paused and pending/overdue payments cleared.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause ledger';
      toast.error(message);
      throw err;
    }
  };

  /**
   * Check if a ledger can be reactivated
   * Returns eligibility status and any blocking reasons
   */
  const canReactivate = (riderId: string): {
    eligible: boolean;
    reasons: string[];
    ledger?: RiderLedger;
  } => {
    const ledger = ledgers.find(l => l.rider_id === riderId && l.status === 'paused');
    if (!ledger) {
      return { eligible: false, reasons: ['No paused ledger found for this rider'] };
    }
    return { eligible: true, reasons: [], ledger };
  };

  /**
   * Reactivate a paused ledger
   * Task 5.1-5.11: Generates gap period payments + future payments
   */
  const reactivateLedger = async (
    id: string,
    params: {
      start_date: string;
      rental_amount?: number;
      rental_frequency?: 'daily' | 'weekly' | 'monthly';
      new_security_deposit?: number;
    }
  ) => {
    try {
      const ledger = ledgers.find(l => l.id === id);
      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== 'paused') {
        throw new Error('Only paused ledgers can be reactivated');
      }


      const effectiveFrequency = params.rental_frequency || ledger.rental_frequency;
      const effectiveAmount = params.rental_amount !== undefined ? params.rental_amount : ledger.rental_amount;
      const reactivatedAt = new Date().toISOString();

      // Update the correct ledger table
      const table = ledger._source === 'rental_ledgers' ? 'rental_ledgers' : 'rider_ledgers';
      const updateData: Record<string, unknown> = {
        status: 'active',
        reactivated_at: reactivatedAt,
        rental_start_date: params.start_date,
        rental_amount: effectiveAmount,
      };
      // rental_ledgers has no rental_frequency column
      if (ledger._source === 'rider_ledgers') {
        updateData.rental_frequency = effectiveFrequency;
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Generate fresh payments from new start_date.
      // All past due dates → overdue. First date on/after today → pending (1 only, cron handles the rest).
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Build payment date list (same logic for both sources)
      const dueDates: { due_date: string; status: 'overdue' | 'pending' }[] = [];
      let current = new Date(params.start_date);
      current.setHours(0, 0, 0, 0);
      let pendingAdded = false;

      while (!pendingAdded) {
        if (current >= sixMonthsAgo) {
          const isOverdue = current < today;
          dueDates.push({
            due_date: toLocalDateStr(current),
            status: isOverdue ? 'overdue' : 'pending',
          });
          if (!isOverdue) pendingAdded = true;
        }

        if (!pendingAdded) {
          const next = new Date(current);
          switch (effectiveFrequency) {
            case 'daily':   next.setDate(next.getDate() + 1); break;
            case 'weekly':  next.setDate(next.getDate() + 7); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
          }
          current = next;
        }
      }

      const paymentIds = await getNextPaymentIds(dueDates.length);

      if (ledger._source === 'rental_ledgers') {
        // For rental-flow ledgers: insert directly into rental_payments so
        // RentalLedgerDetail (which reads rental_payments) can display them.
        // week_number continues from the highest existing week.
        const { data: existing } = await supabase
          .from('rental_payments')
          .select('week_number')
          .eq('ledger_id', id)
          .order('week_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        let weekNum = (existing?.week_number || 0) + 1;

        const rentalRows = dueDates.map((d, i) => ({
          ledger_id: id,
          week_number: weekNum + i,
          due_date: d.due_date,
          amount_due: effectiveAmount,
          status: d.status,
          payment_id: paymentIds[i],
        }));

        const { error: rentalInsertError } = await supabase
          .from('rental_payments')
          .insert(rentalRows);

        if (rentalInsertError) {
          toast.error(`Payment creation failed: ${rentalInsertError.message}. Please try again.`);
          throw rentalInsertError;
        }
      } else {
        // For rider_ledgers: insert into payments table (ledger_id FK is valid here)
        const allPayments: GeneratedPayment[] = dueDates.map((d, i) => ({
          payment_id: paymentIds[i],
          rider_id: ledger.rider_id,
          rider_name: ledger.rider_name,
          amount: effectiveAmount,
          due_date: d.due_date,
          payment_date: null,
          status: d.status,
          payment_type: 'rental',
          rental_period: `${effectiveFrequency.charAt(0).toUpperCase() + effectiveFrequency.slice(1)} Rental - ${d.due_date}`,
          ledger_id: id,
        }));

        try {
          await insertPaymentsWithRetry(allPayments as any);
        } catch (insertError) {
          const message = insertError instanceof Error ? insertError.message : 'Failed to create payments';
          toast.error(`Payment creation failed: ${message}. Please try again.`);
          throw insertError;
        }
      }

      // Security deposit — always goes into payments table (shown in Ledger Management)
      if (params.new_security_deposit && params.new_security_deposit > 0) {
        const [depositId] = await getNextPaymentIds(1);
        await supabase.from('payments').insert({
          payment_id: depositId,
          rider_id: ledger.rider_id,
          rider_name: ledger.rider_name,
          amount: params.new_security_deposit,
          due_date: params.start_date,
          payment_date: params.start_date,
          status: 'paid' as const,
          payment_type: 'security_deposit' as const,
          rental_period: 'Security Deposit (Reactivation)',
          ledger_id: ledger._source === 'rider_ledgers' ? id : null,
        });
      }

      setLedgers(prev => prev.map(l =>
        l.id === id
          ? { ...l, status: 'active', reactivated_at: reactivatedAt, rental_start_date: params.start_date, rental_amount: effectiveAmount, rental_frequency: effectiveFrequency }
          : l
      ));

      const overdueCount = dueDates.filter(d => d.status === 'overdue').length;
      const pendingCount = dueDates.filter(d => d.status === 'pending').length;
      toast.success(`Ledger reactivated! ${overdueCount} overdue + ${pendingCount} pending payment(s) created.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate ledger. Please try again.';
      toast.error(message);
      throw err;
    }
  };

  /**
   * Mark a ledger's security deposit as refunded
   * Only paused ledgers can have deposits marked as refunded
   */
  const markDepositRefunded = async (id: string, amount?: number) => {
    try {
      const ledger = ledgers.find(l => l.id === id);
      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== 'paused') {
        throw new Error('Only paused ledgers can have deposits refunded');
      }

      const refundAmount = amount !== undefined ? amount : ledger.security_deposit_amount;

      // Determine status based on refund amount
      let depositStatus: SecurityDepositStatus;
      if (refundAmount >= ledger.security_deposit_amount) {
        depositStatus = 'refunded';
      } else {
        depositStatus = 'partially_refunded';
      }

      console.log(`[AUDIT] Deposit refund initiated`, {
        ledger_id: id,
        rider_id: ledger.rider_id,
        rider_name: ledger.rider_name,
        original_deposit: ledger.security_deposit_amount,
        refund_amount: refundAmount,
        refund_status: depositStatus,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('rider_ledgers')
        .update({
          security_deposit_status: depositStatus,
          deposit_refunded_at: new Date().toISOString(),
          deposit_refunded_amount: refundAmount
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log(`[AUDIT] Deposit refund completed`, {
        ledger_id: id,
        refund_status: depositStatus,
        refund_amount: refundAmount
      });

      setLedgers(prev => prev.map(l =>
        l.id === id ? { ...l, ...data } : l
      ));

      toast.success(`Deposit marked as ${depositStatus === 'refunded' ? 'fully refunded' : 'partially refunded'}!`);
      return data;
    } catch (err) {
      console.error('[AUDIT] Deposit refund failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to mark deposit as refunded';
      toast.error(message);
      throw err;
    }
  };

  useEffect(() => {
    fetchLedgers();
    // Re-fetch whenever a ledger is created from anywhere in the app
    // (e.g. from the rider creation flow while LedgerManagement is already mounted)
    const handler = () => fetchLedgers();
    window.addEventListener('ledger-created', handler);
    return () => window.removeEventListener('ledger-created', handler);
  }, []);

  return {
    ledgers,
    loading,
    error,
    createLedger,
    updateLedger,
    deleteLedger,
    getRidersWithoutLedgers,
    // Lifecycle functions
    pauseLedger,
    canReactivate,
    reactivateLedger,
    markDepositRefunded,
    refetch: fetchLedgers
  };
};