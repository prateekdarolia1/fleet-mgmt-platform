import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface Payment {
  id: string;
  payment_id: string;
  rider_id: string;
  rider_name: string;
  ledger_id: string | null;
  amount: number;
  payment_date: string | null;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_type: 'rental' | 'security_deposit' | 'maintenance' | 'penalty';
  payment_mode: 'cash' | 'upi' | 'bank-transfer' | 'cheque' | 'card' | null;
  rental_period: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const usePaymentHistory = (riderId?: string, ledgerId?: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!riderId && !ledgerId) return;

    setLoading(true);
    setError(null);

    try {
      // Query both tables concurrently.
      // payments: rider_ledger-flow entries have ledger_id set; rental-flow entries have ledger_id=null.
      // rental_payments: all rider-creation-flow entries live here, keyed by ledger_id.
      const [paymentsRes, rentalRes] = await Promise.all([
        ledgerId
          ? supabase.from('payments').select('*').or(`ledger_id.eq.${ledgerId},and(rider_id.eq.${riderId},ledger_id.is.null)`)
          : supabase.from('payments').select('*').eq('rider_id', riderId!),
        ledgerId
          ? supabase.from('rental_payments').select('*').eq('ledger_id', ledgerId)
          : supabase.from('rental_payments').select('*').eq('ledger_id', 'none'), // no-op when no ledgerId
      ]);

      if (paymentsRes.error) throw paymentsRes.error;

      // Normalise rental_payments rows to the Payment shape
      const seenIds = new Set<string>();
      const merged: Payment[] = [];

      for (const p of (paymentsRes.data || [])) {
        seenIds.add(p.payment_id);
        merged.push(p as Payment);
      }

      for (const rp of (rentalRes.data || [])) {
        if (seenIds.has(rp.payment_id)) continue; // already present via payments table
        merged.push({
          id: rp.id,
          payment_id: rp.payment_id,
          rider_id: rp.rider_id || riderId || '',
          rider_name: rp.rider_name || '',
          ledger_id: rp.ledger_id,
          amount: rp.amount_due,
          payment_date: rp.paid_at || null,
          due_date: rp.due_date,
          status: rp.status as Payment['status'],
          payment_type: 'rental',
          payment_mode: rp.payment_mode || null,
          rental_period: `Week ${rp.week_number}`,
          notes: null,
          created_at: rp.created_at,
          updated_at: rp.updated_at || rp.created_at,
        });
      }

      // Sort by due_date descending
      merged.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
      setPayments(merged);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [riderId, ledgerId]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments
  };
};