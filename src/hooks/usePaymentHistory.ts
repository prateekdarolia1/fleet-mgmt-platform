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
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (ledgerId) {
        query = query.eq('ledger_id', ledgerId);
      } else if (riderId) {
        query = query.eq('rider_id', riderId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPayments(data || []);
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