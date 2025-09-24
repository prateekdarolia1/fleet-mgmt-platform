import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  payment_id: string;
  rider_id: string;
  rider_name: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_mode?: 'cash' | 'upi' | 'bank-transfer' | 'card';
  rental_period: string;
  notes?: string;
  payment_type: 'security_deposit' | 'rental';
  ledger_id?: string;
  created_at: string;
  updated_at: string;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (paymentData: {
    rider_id: string;
    rider_name: string;
    amount: number;
    due_date: string;
    rental_period: string;
    notes?: string;
    payment_mode?: 'cash' | 'upi' | 'bank-transfer' | 'card';
    payment_date?: string;
    status?: 'pending' | 'paid' | 'overdue' | 'partial';
  }) => {
    try {
      // Generate payment ID
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('payment_id')
        .like('payment_id', 'P%');

      const existingNumbers = (existingPayments || [])
        .map(p => p.payment_id)
        .filter(id => id.startsWith('P'))
        .map(id => parseInt(id.substring(1)))
        .filter(num => !isNaN(num));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const paymentId = `P${nextNumber.toString().padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          payment_id: paymentId,
          status: paymentData.status || 'pending' as const
        }])
        .select()
        .single();

      if (error) throw error;

      setPayments(prev => [data, ...prev]);
      toast.success(`Payment ${paymentId} recorded successfully!`);
      return data;
    } catch (err) {
      console.error('Error adding payment:', err);
      toast.error('Failed to record payment');
      throw err;
    }
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPayments(prev => prev.map(payment => 
        payment.id === id ? { ...payment, ...data } : payment
      ));

      toast.success('Payment updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment');
      throw err;
    }
  };

  const markPaymentAsPaid = async (id: string, paymentMode: 'cash' | 'upi' | 'bank-transfer' | 'card') => {
    try {
      await updatePayment(id, {
        status: 'paid',
        payment_mode: paymentMode,
        payment_date: new Date().toISOString().split('T')[0]
      });
      toast.success('Payment marked as paid!');
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      toast.error('Failed to mark payment as paid');
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPayments(prev => prev.filter(payment => payment.id !== id));
      toast.success('Payment record removed successfully!');
    } catch (err) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to remove payment record');
      throw err;
    }
  };

  const getTotalStats = () => {
    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const paidAmount = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const pendingAmount = payments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const overdueCount = payments.filter(p => p.status === 'overdue').length;
    
    return { totalAmount, paidAmount, pendingAmount, overdueCount };
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return {
    payments,
    loading,
    error,
    addPayment,
    updatePayment,
    markPaymentAsPaid,
    deletePayment,
    getTotalStats,
    refetch: fetchPayments
  };
};