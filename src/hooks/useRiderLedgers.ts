import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export const useRiderLedgers = () => {
  const [ledgers, setLedgers] = useState<RiderLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rider_ledgers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLedgers(data || []);
    } catch (err) {
      console.error('Error fetching ledgers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createLedger = async (ledgerData: CreateLedgerData) => {
    try {
      // First create the ledger (exclude payment fields that don't belong in ledger table)
      const { payment_date, transaction_id, ...ledgerOnlyData } = ledgerData;
      const { data: ledger, error: ledgerError } = await supabase
        .from('rider_ledgers')
        .insert([ledgerOnlyData])
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // Generate payment ID for security deposit
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('payment_id')
        .like('payment_id', 'P%');

      const existingNumbers = (existingPayments || [])
        .map(p => p.payment_id)
        .filter(id => id.startsWith('P'))
        .map(id => parseInt(id.substring(1)))
        .filter(num => !isNaN(num));

      let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      // Create security deposit payment
      const securityDepositId = `P${nextNumber.toString().padStart(3, '0')}`;
      const { error: securityDepositError } = await supabase
        .from('payments')
        .insert({
          payment_id: ledgerData.transaction_id || securityDepositId,
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

      if (securityDepositError) throw securityDepositError;
      nextNumber++;

      // Generate rental payments for next 6 months
      const startDate = new Date(ledgerData.rental_start_date);
      const rentalPayments = [];

      for (let i = 0; i < 6; i++) {
        const dueDate = new Date(startDate);
        
        // Calculate due date based on frequency
        switch (ledgerData.rental_frequency) {
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

        const paymentId = `P${nextNumber.toString().padStart(3, '0')}`;
        
        rentalPayments.push({
          payment_id: paymentId,
          rider_id: ledgerData.rider_id,
          rider_name: ledgerData.rider_name,
          amount: ledgerData.rental_amount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending' as const,
          payment_type: 'rental' as const,
          rental_period: `${ledgerData.rental_frequency.charAt(0).toUpperCase() + ledgerData.rental_frequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
          ledger_id: ledger.id
        });
        
        nextNumber++;
      }

      // Insert all rental payments
      const { error: rentalPaymentsError } = await supabase
        .from('payments')
        .insert(rentalPayments);

      if (rentalPaymentsError) throw rentalPaymentsError;

      setLedgers(prev => [ledger, ...prev]);
      toast.success(`Ledger created successfully for ${ledgerData.rider_name}!`);
      
      return ledger;
    } catch (err) {
      console.error('Error creating ledger:', err);
      toast.error('Failed to create ledger');
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

  useEffect(() => {
    fetchLedgers();
  }, []);

  return {
    ledgers,
    loading,
    error,
    createLedger,
    updateLedger,
    deleteLedger,
    getRidersWithoutLedgers,
    refetch: fetchLedgers
  };
};