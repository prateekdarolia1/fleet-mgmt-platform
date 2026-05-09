import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  PAYMENT_WINDOW_DAYS,
  overdueDueDateFilter,
  upcomingDueDateRange,
} from '@/lib/payments/window';

// Unified overdue payment type that works with both tables
export interface UnifiedOverduePayment {
  id: string;
  source: 'payments' | 'rental_payments';
  rider_id: string;
  rider_name: string;
  vehicle_number?: string | null;
  amount_due: number;
  balance: number;
  due_date: string;
  status: string;
  week_number?: number;
  ledger_id?: string;
  payment_id?: string;
}

// Unified upcoming payment type
export interface UnifiedUpcomingPayment {
  id: string;
  source: 'payments' | 'rental_payments';
  rider_id: string;
  rider_name: string;
  vehicle_number?: string | null;
  amount_due: number;
  due_date: string;
  status: string;
  week_number?: number;
  ledger_id?: string;
  payment_id?: string;
}

/**
 * For payments in the `payments` table with ledger_id=null (rental-flow reactivations),
 * resolve the ledger_id by looking up rental_ledgers by rider_id.
 * Returns a Map<rider_id, ledger_id>.
 */
async function resolveRentalLedgerIds(riderIds: string[]): Promise<Map<string, string>> {
  if (riderIds.length === 0) return new Map();
  const { data } = await supabase
    .from('rental_ledgers')
    .select('id, rider_id')
    .in('rider_id', riderIds)
    .in('status', ['active', 'suspended']);
  const map = new Map<string, string>();
  (data || []).forEach(rl => map.set(rl.rider_id, rl.id));
  return map;
}

/**
 * Fetch overdue payments from BOTH tables (payments + rental_payments).
 * A row is overdue when due_date < today − PAYMENT_GRACE_DAYS (canonical rule).
 *
 * No paging — admin tool, full list always returned. The 10000 cap is a safety
 * fence; production data is currently <100 overdue rows.
 */
const HARD_CAP = 10000;

export function useUnifiedOverduePayments() {
  return useQuery({
    queryKey: ['unified-payments', 'overdue'],
    queryFn: async (): Promise<UnifiedOverduePayment[]> => {
      const { lt: overdueThreshold } = overdueDueDateFilter();

      // Fetch from rental_payments table - ONLY status='overdue' or past-due pending/partial
      const { data: rentalPayments, error: rentalError } = await supabase
        .from('rental_payments')
        .select(`
          id,
          payment_id,
          ledger_id,
          week_number,
          amount_due,
          balance,
          due_date,
          status,
          rental_ledgers (
            rider_id,
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['overdue', 'pending', 'partial'])
        .lt('due_date', overdueThreshold)
        .order('due_date', { ascending: true })
        .limit(HARD_CAP);

      if (rentalError) {
        console.error('Error fetching overdue rental_payments:', rentalError);
      }

      // Fetch from payments table - ONLY status='overdue' or past-due pending/partial
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, payment_id, rider_id, rider_name, amount, due_date, status, ledger_id')
        .in('status', ['overdue', 'pending', 'partial'])
        .lt('due_date', overdueThreshold)
        .order('due_date', { ascending: true })
        .limit(HARD_CAP);

      if (paymentsError) {
        console.error('Error fetching overdue payments:', paymentsError);
      }

      // Combine and normalize results
      const unifiedResults: UnifiedOverduePayment[] = [];

      // Track payment_ids already added from rental_payments — sync trigger
      // copies payments → rental_payments with the same payment_id, so we'd
      // otherwise see the same row twice. Prefer rental_payments (has week_number).
      const seenPaymentIds = new Set<string>();

      // Add rental_payments results
      (rentalPayments || []).forEach((rp) => {
        if (rp.payment_id) seenPaymentIds.add(rp.payment_id);
        unifiedResults.push({
          id: rp.id,
          source: 'rental_payments',
          rider_id: (rp.rental_ledgers as any)?.rider_id || '',
          rider_name: (rp.rental_ledgers as any)?.rider_name || 'Unknown',
          vehicle_number: (rp.rental_ledgers as any)?.vehicle_number || null,
          amount_due: rp.amount_due || 0,
          balance: rp.balance || rp.amount_due || 0,
          due_date: rp.due_date,
          status: rp.status,
          week_number: rp.week_number,
          ledger_id: rp.ledger_id,
          payment_id: rp.payment_id,
        });
      });

      // Resolve ledger_id for payments with no ledger_id (rental-flow reactivations)
      const nullLedgerRiderIds = [...new Set(
        (payments || []).filter(p => !p.ledger_id).map(p => p.rider_id)
      )];
      const riderLedgerMap = await resolveRentalLedgerIds(nullLedgerRiderIds);

      // Add payments table results, skipping rows already represented by rental_payments
      (payments || []).forEach((p) => {
        if (p.payment_id && seenPaymentIds.has(p.payment_id)) return;
        unifiedResults.push({
          id: p.id,
          source: 'payments',
          rider_id: p.rider_id,
          rider_name: p.rider_name,
          vehicle_number: null,
          amount_due: p.amount,
          balance: p.amount,
          due_date: p.due_date,
          status: p.status,
          ledger_id: p.ledger_id || riderLedgerMap.get(p.rider_id),
          payment_id: p.payment_id,
        });
      });

      // Sort by due date
      unifiedResults.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      return unifiedResults;
    },
    refetchInterval: 60_000,
  });
}

/**
 * Fetch upcoming payments from BOTH tables (payments + rental_payments).
 * "Upcoming" = due_date in [today − PAYMENT_GRACE_DAYS, today + PAYMENT_WINDOW_DAYS].
 * Anything beyond the window is "future" and intentionally excluded.
 *
 * The `days` argument exists for legacy callers; do not pass a custom value
 * for new surfaces — defer to PAYMENT_WINDOW_DAYS so the rule stays one-source.
 */
export function useUnifiedUpcomingPayments(days: number = PAYMENT_WINDOW_DAYS) {
  const now = new Date();
  const { gte: pendingThreshold } = upcomingDueDateRange(now);
  const futureDate = new Date(now.getTime() + days * 86400000);
  const futureDateStr = `${futureDate.getUTCFullYear()}-${String(futureDate.getUTCMonth() + 1).padStart(2, '0')}-${String(futureDate.getUTCDate()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['unified-payments', 'upcoming', days],
    queryFn: async (): Promise<UnifiedUpcomingPayment[]> => {
      // Fetch from rental_payments table
      // Include payments that are within the 3-day grace period OR due within next X days
      const { data: rentalPayments, error: rentalError } = await supabase
        .from('rental_payments')
        .select(`
          id,
          payment_id,
          ledger_id,
          week_number,
          amount_due,
          due_date,
          status,
          rental_ledgers (
            rider_id,
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['pending', 'partial'])
        .gte('due_date', pendingThreshold)
        .lte('due_date', futureDateStr)
        .order('due_date', { ascending: true })
        .limit(HARD_CAP);

      if (rentalError) {
        console.error('Error fetching upcoming rental_payments:', rentalError);
      }

      // Fetch from payments table
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, payment_id, rider_id, rider_name, amount, due_date, status, ledger_id')
        .in('status', ['pending'])
        .gte('due_date', pendingThreshold)
        .lte('due_date', futureDateStr)
        .order('due_date', { ascending: true })
        .limit(HARD_CAP);

      if (paymentsError) {
        console.error('Error fetching upcoming payments:', paymentsError);
      }

      // Combine and normalize results
      const unifiedResults: UnifiedUpcomingPayment[] = [];

      // Track payment_ids already added from rental_payments — sync trigger
      // copies payments → rental_payments with the same payment_id, so we'd
      // otherwise see the same row twice. Prefer rental_payments (has week_number).
      const seenPaymentIds = new Set<string>();

      // Add rental_payments results
      (rentalPayments || []).forEach((rp) => {
        if (rp.payment_id) seenPaymentIds.add(rp.payment_id);
        unifiedResults.push({
          id: rp.id,
          source: 'rental_payments',
          rider_id: (rp.rental_ledgers as any)?.rider_id || '',
          rider_name: (rp.rental_ledgers as any)?.rider_name || 'Unknown',
          vehicle_number: (rp.rental_ledgers as any)?.vehicle_number || null,
          amount_due: rp.amount_due || 0,
          due_date: rp.due_date,
          status: rp.status,
          week_number: rp.week_number,
          ledger_id: rp.ledger_id,
          payment_id: rp.payment_id,
        });
      });

      // Resolve ledger_id for payments with no ledger_id (rental-flow reactivations)
      const nullLedgerRiderIds = [...new Set(
        (payments || []).filter(p => !p.ledger_id).map(p => p.rider_id)
      )];
      const riderLedgerMap = await resolveRentalLedgerIds(nullLedgerRiderIds);

      // Add payments table results, skipping rows already represented by rental_payments
      (payments || []).forEach((p) => {
        if (p.payment_id && seenPaymentIds.has(p.payment_id)) return;
        unifiedResults.push({
          id: p.id,
          source: 'payments',
          rider_id: p.rider_id,
          rider_name: p.rider_name,
          vehicle_number: null,
          amount_due: p.amount,
          due_date: p.due_date,
          status: p.status,
          ledger_id: p.ledger_id || riderLedgerMap.get(p.rider_id),
          payment_id: p.payment_id,
        });
      });

      // Sort by due date
      unifiedResults.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      return unifiedResults;
    },
    refetchInterval: 60_000,
  });
}
