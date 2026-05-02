import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';

export interface Payment {
  id: string;
  payment_id: string;
  rider_id: string;
  rider_name: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: PaymentStatus;
  payment_mode?: 'cash' | 'upi' | 'bank-transfer' | 'card';
  rental_period: string;
  notes?: string;
  payment_type: 'security_deposit' | 'rental';
  ledger_id?: string;
  created_at: string;
  updated_at: string;
  // Cancellation fields
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  // Collection metadata (set when TL or admin marks paid)
  screenshot_url?: string | null;
  collected_by?: 'admin' | 'TL1' | 'TL2' | null;
  collected_at?: string | null;
  upi_last4?: string | null;
}

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async (includeCancelled = false) => {
    try {
      setLoading(true);
      let query = supabase
        .from('payments')
        .select('*');

      // Exclude cancelled payments by default
      if (!includeCancelled) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
        payment_date: new Date().toISOString().split('T')[0],
        collected_by: 'admin',
        collected_at: new Date().toISOString(),
      } as any);
      toast.success('Payment marked as paid!');
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      toast.error('Failed to mark payment as paid');
    }
  };

  const deletePayment = async (id: string, cancelledBy?: string) => {
    try {
      // First check if payment can be cancelled (only pending/overdue can be cancelled)
      const payment = payments.find(p => p.id === id);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'paid') {
        throw new Error('Cannot cancel a paid payment');
      }

      if (payment.status === 'cancelled') {
        throw new Error('Payment is already cancelled');
      }

      console.log(`[AUDIT] Payment cancellation initiated`, {
        payment_id: id,
        payment_display_id: payment.payment_id,
        rider_id: payment.rider_id,
        rider_name: payment.rider_name,
        amount: payment.amount,
        previous_status: payment.status,
        cancelled_by: cancelledBy || 'system',
        timestamp: new Date().toISOString()
      });

      // Soft delete: set status to cancelled
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy || 'system'
        })
        .eq('id', id);

      if (error) throw error;

      console.log(`[AUDIT] Payment cancelled successfully`, {
        payment_id: id,
        payment_display_id: payment.payment_id,
        new_status: 'cancelled'
      });

      // Update local state
      setPayments(prev => prev.map(p =>
        p.id === id
          ? { ...p, status: 'cancelled' as const, cancelled_at: new Date().toISOString(), cancelled_by: cancelledBy || 'system' }
          : p
      ));

      toast.success('Payment cancelled successfully!');
    } catch (err) {
      console.error('[AUDIT] Payment cancellation failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to cancel payment';
      toast.error(message);
      throw err;
    }
  };

  const canDeletePayment = (payment: Payment): boolean => {
    return payment.status === 'pending' || payment.status === 'overdue';
  };

  const getTotalStats = () => {
    // Exclude cancelled payments from all calculations
    const activePayments = payments.filter(p => p.status !== 'cancelled');
    const totalAmount = activePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const paidAmount = activePayments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const pendingAmount = activePayments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const overdueCount = activePayments.filter(p => p.status === 'overdue').length;
    const cancelledCount = payments.filter(p => p.status === 'cancelled').length;

    return { totalAmount, paidAmount, pendingAmount, overdueCount, cancelledCount };
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
    canDeletePayment,
    getTotalStats,
    refetch: fetchPayments
  };
};