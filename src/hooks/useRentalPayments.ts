import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

// Types
export type RentalPayment = Tables<'rental_payments'>;
export type RentalPaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
export type RentalPaymentMode = 'cash' | 'upi' | 'bank-transfer' | 'card' | 'other';

export interface MarkPaymentPaidParams {
  payment_id: string;
  paid_amount: number;
  payment_mode?: RentalPaymentMode;
  upi_last4?: string;
  received_by?: string;
  external_ref?: string;
  notes?: string;
}

export interface PaymentStats {
  total_due: number;
  total_collected: number;
  total_pending: number;
  total_overdue: number;
  overdue_count: number;
  pending_count: number;
}

// Fetch payments by ledger ID
export function useRentalPaymentsByLedger(ledgerId: string | null) {
  return useQuery({
    queryKey: ['rental-payments', 'ledger', ledgerId],
    queryFn: async (): Promise<RentalPayment[]> => {
      if (!ledgerId) return [];

      const { data, error } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('ledger_id', ledgerId)
        .order('week_number', { ascending: true });

      if (error) {
        console.error('Error fetching rental payments:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!ledgerId,
  });
}

// Fetch overdue payments across all ledgers
// A payment is considered overdue if it's been pending for MORE than 4 calendar days from due date
export function useOverduePayments(limit = 50) {
  return useQuery({
    queryKey: ['rental-payments', 'overdue', limit],
    queryFn: async (): Promise<(RentalPayment & { rental_ledgers?: { rider_name: string; vehicle_number: string | null } })[]> => {
      // Calculate the date 4 days ago - payments with due_date before this are overdue
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      const overdueThreshold = fourDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('rental_payments')
        .select(`
          *,
          rental_ledgers (
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['overdue', 'pending', 'partial'])
        .lt('due_date', overdueThreshold)
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching overdue payments:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Fetch upcoming payments (due within next X days)
// Includes both pending and partial status payments
export function useUpcomingPayments(days = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['rental-payments', 'upcoming', days],
    queryFn: async (): Promise<(RentalPayment & { rental_ledgers?: { rider_name: string; vehicle_number: string | null } })[]> => {
      const { data, error } = await supabase
        .from('rental_payments')
        .select(`
          *,
          rental_ledgers (
            rider_name,
            vehicle_number
          )
        `)
        .in('status', ['pending', 'partial'])
        .gte('due_date', today)
        .lte('due_date', futureDate)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching upcoming payments:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Mark payment as paid via RPC
export function useMarkRentalPaymentPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkPaymentPaidParams): Promise<{
      success: boolean;
      payment_id: string;
      amount_due: number;
      paid_amount: number;
      balance: number;
      status: string;
      message: string;
    }> => {
      const { data, error } = await supabase.rpc('mark_rental_payment_paid', {
        p_payment_id: params.payment_id,
        p_paid_amount: params.paid_amount,
        p_payment_mode: params.payment_mode || null,
        p_upi_last4: params.upi_last4 || null,
        p_received_by: params.received_by || null,
        p_external_ref: params.external_ref || null,
        p_notes: params.notes || null,
      });

      if (error) {
        console.error('Error marking payment paid:', error);
        throw error;
      }

      return data as ReturnType<ReturnType<typeof useMarkRentalPaymentPaid>['mutateAsync']>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rental-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rental-ledgers'] });
      toast.success(result.message || 'Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}

// Update payment manually (admin override)
export function useUpdateRentalPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      payment_id: string;
      updates: TablesUpdate<'rental_payments'>;
    }): Promise<RentalPayment> => {
      const { data, error } = await supabase
        .from('rental_payments')
        .update(params.updates)
        .eq('id', params.payment_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rental payment:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-payments'] });
      toast.success('Payment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });
}

// Get payment stats for dashboard
export function useRentalPaymentStats() {
  return useQuery({
    queryKey: ['rental-payments', 'stats'],
    queryFn: async (): Promise<PaymentStats> => {
      const { data: payments, error } = await supabase
        .from('rental_payments')
        .select('status, amount_due, paid_amount, balance');

      if (error) throw error;

      const stats: PaymentStats = {
        total_due: payments?.reduce((sum, p) => sum + (p.amount_due || 0), 0) || 0,
        total_collected: payments?.reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0,
        total_pending: payments
          ?.filter(p => ['pending', 'partial'].includes(p.status))
          .reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0) || 0,
        total_overdue: payments
          ?.filter(p => p.status === 'overdue')
          .reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0) || 0,
        overdue_count: payments?.filter(p => p.status === 'overdue').length || 0,
        pending_count: payments?.filter(p => ['pending', 'partial'].includes(p.status)).length || 0,
      };

      return stats;
    },
  });
}

// Get a single payment by ID
export function useRentalPaymentById(paymentId: string | null) {
  return useQuery({
    queryKey: ['rental-payment', paymentId],
    queryFn: async (): Promise<RentalPayment | null> => {
      if (!paymentId) return null;

      const { data, error } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching rental payment:', error);
        throw error;
      }

      return data;
    },
    enabled: !!paymentId,
  });
}
