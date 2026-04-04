import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
 * Fetch overdue payments from BOTH tables (payments + rental_payments)
 * A payment is overdue if it's been pending for MORE than 4 calendar days from due date
 */
export function useUnifiedOverduePayments(limit = 50) {
  return useQuery({
    queryKey: ['unified-payments', 'overdue', limit],
    queryFn: async (): Promise<UnifiedOverduePayment[]> => {
      // 3-day grace period — payments with due_date before this are overdue
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const overdueThreshold = threeDaysAgo.toISOString().split('T')[0];

      // Fetch from rental_payments table - ONLY status='overdue' or past-due pending/partial
      const { data: rentalPayments, error: rentalError } = await supabase
        .from('rental_payments')
        .select(`
          id,
          ledger_id,
          week_number,
          amount_due,
          balance,
          due_date,
          status,
          rental_ledgers (
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['overdue', 'pending', 'partial'])
        .lt('due_date', overdueThreshold)
        .order('due_date', { ascending: true })
        .limit(limit);

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
        .limit(limit);

      if (paymentsError) {
        console.error('Error fetching overdue payments:', paymentsError);
      }

      // Combine and normalize results
      const unifiedResults: UnifiedOverduePayment[] = [];

      // Add rental_payments results
      (rentalPayments || []).forEach((rp) => {
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
        });
      });

      // Add payments table results
      (payments || []).forEach((p) => {
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
          ledger_id: p.ledger_id,
          payment_id: p.payment_id,
        });
      });

      // Sort by due date
      unifiedResults.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      return unifiedResults.slice(0, limit);
    },
  });
}

/**
 * Fetch upcoming/due payments from BOTH tables (payments + rental_payments)
 * Includes:
 * - Payments due within the next X days (future)
 * - Payments that are 1-4 days past due (still in pending grace period)
 *
 * A payment becomes OVERDUE only after MORE than 3 days past due date.
 */
export function useUnifiedUpcomingPayments(days = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 3-day grace period — payments newer than this are still in upcoming
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const pendingThreshold = threeDaysAgo.toISOString().split('T')[0];

  // Future date for "due this week"
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['unified-payments', 'upcoming', days],
    queryFn: async (): Promise<UnifiedUpcomingPayment[]> => {
      // Fetch from rental_payments table
      // Include payments that are within the 3-day grace period OR due within next X days
      const { data: rentalPayments, error: rentalError } = await supabase
        .from('rental_payments')
        .select(`
          id,
          ledger_id,
          week_number,
          amount_due,
          due_date,
          status,
          rental_ledgers (
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['pending', 'partial'])
        .gte('due_date', pendingThreshold)
        .lte('due_date', futureDateStr)
        .order('due_date', { ascending: true });

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
        .order('due_date', { ascending: true });

      if (paymentsError) {
        console.error('Error fetching upcoming payments:', paymentsError);
      }

      // Combine and normalize results
      const unifiedResults: UnifiedUpcomingPayment[] = [];

      // Add rental_payments results
      (rentalPayments || []).forEach((rp) => {
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
        });
      });

      // Add payments table results
      (payments || []).forEach((p) => {
        unifiedResults.push({
          id: p.id,
          source: 'payments',
          rider_id: p.rider_id,
          rider_name: p.rider_name,
          vehicle_number: null,
          amount_due: p.amount,
          due_date: p.due_date,
          status: p.status,
          ledger_id: p.ledger_id,
          payment_id: p.payment_id,
        });
      });

      // Sort by due date
      unifiedResults.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      return unifiedResults;
    },
  });
}
