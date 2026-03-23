import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LedgerStatus = 'active' | 'paused' | 'closed';
export type SecurityDepositStatus = 'retained' | 'refunded' | 'partially_refunded';

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

      // Generate rental payments
      // For retroactive entries: generate all payments from start date to today + future periods
      // For normal entries: generate 6 months of future payments
      const startDate = new Date(ledgerData.rental_start_date);
      startDate.setHours(0, 0, 0, 0); // Normalize to start of day

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today for comparison

      const isRetroactive = ledgerData.is_historical || startDate < today;
      const rentalPayments = [];
      let foundFirstPending = false; // Track if we've found the current period for retroactive

      // Calculate number of periods to generate
      let periodsToGenerate: number;
      if (isRetroactive) {
        // For retroactive: generate all periods UP TO current period (no future)
        // Past periods → OVERDUE
        // Current period (due_date >= today) → PENDING
        // Future periods → NOT generated (handled by cron job)
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (ledgerData.rental_frequency) {
          case 'daily':
            periodsToGenerate = diffDays + 1; // Past days + current day
            break;
          case 'weekly':
            periodsToGenerate = Math.ceil(diffDays / 7) + 1; // Past weeks + current week
            break;
          case 'monthly':
            periodsToGenerate = Math.ceil(diffDays / 30) + 1; // Past months + current month
            break;
          default:
            periodsToGenerate = 6;
        }
        // Cap at reasonable limits
        const maxPeriods = ledgerData.rental_frequency === 'daily' ? 400 : ledgerData.rental_frequency === 'weekly' ? 60 : 24;
        periodsToGenerate = Math.max(1, Math.min(periodsToGenerate, maxPeriods));
      } else {
        // For normal entries (future start date): generate 6 pending payments
        periodsToGenerate = 6;
      }

      console.log(`[createLedger] Generating ${periodsToGenerate} rental payments for ${ledgerData.rental_frequency} frequency, isRetroactive: ${isRetroactive}`);

      for (let i = 0; i < periodsToGenerate; i++) {
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
        dueDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // For retroactive: stop generating once we've passed the current period
        if (isRetroactive && foundFirstPending) {
          break;
        }

        // Determine payment status:
        // For RETROACTIVE entries:
        //   - All past periods (due_date < today) → OVERDUE
        //   - Current period (first due_date >= today) → PENDING
        // For LIVE entries:
        //   - All 6 periods → PENDING (will become overdue after 4 days past due)
        let paymentStatus: 'pending' | 'overdue';
        if (isRetroactive) {
          const isPastPayment = dueDate < today;
          if (isPastPayment) {
            paymentStatus = 'overdue';
          } else {
            paymentStatus = 'pending';
            foundFirstPending = true; // This is the current period
          }
        } else {
          paymentStatus = 'pending';
        }

        const paymentId = `P${nextNumber.toString().padStart(3, '0')}`;

        rentalPayments.push({
          payment_id: paymentId,
          rider_id: ledgerData.rider_id,
          rider_name: ledgerData.rider_name,
          amount: ledgerData.rental_amount,
          due_date: dueDate.toISOString().split('T')[0],
          payment_date: null, // Not paid yet
          status: paymentStatus,
          payment_type: 'rental' as const,
          rental_period: `${ledgerData.rental_frequency.charAt(0).toUpperCase() + ledgerData.rental_frequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
          ledger_id: ledger.id,
        });

        nextNumber++;
      }

      console.log(`[createLedger] Inserting ${rentalPayments.length} rental payments:`, rentalPayments.map(p => ({ id: p.payment_id, due: p.due_date, status: p.status })));

      // Insert all rental payments
      const { error: rentalPaymentsError } = await supabase
        .from('payments')
        .insert(rentalPayments);

      if (rentalPaymentsError) {
        console.error('[createLedger] Error inserting rental payments:', rentalPaymentsError);
        throw rentalPaymentsError;
      }

      console.log(`[createLedger] Successfully inserted ${rentalPayments.length} rental payments`);

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

  // ==================== LEDGER LIFECYCLE FUNCTIONS ====================

  /**
   * Pause an active ledger
   * Only active ledgers can be paused
   */
  const pauseLedger = async (id: string, reason: string) => {
    try {
      const ledger = ledgers.find(l => l.id === id);
      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== 'active') {
        throw new Error('Only active ledgers can be paused');
      }

      if (!reason.trim()) {
        throw new Error('Pause reason is required');
      }

      console.log(`[AUDIT] Ledger pause initiated`, {
        ledger_id: id,
        rider_id: ledger.rider_id,
        rider_name: ledger.rider_name,
        reason: reason.trim(),
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('rider_ledgers')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: reason.trim()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log(`[AUDIT] Ledger paused successfully`, {
        ledger_id: id,
        rider_id: ledger.rider_id,
        new_status: 'paused'
      });

      setLedgers(prev => prev.map(l =>
        l.id === id ? { ...l, ...data } : l
      ));

      toast.success('Ledger paused successfully!');
      return data;
    } catch (err) {
      console.error('[AUDIT] Ledger pause failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to pause ledger';
      toast.error(message);
      throw err;
    }
  };

  /**
   * Check if a ledger can be reactivated
   * Returns eligibility status and any blocking reasons
   */
  const canReactivate = async (riderId: string): Promise<{
    eligible: boolean;
    reasons: string[];
    ledger?: RiderLedger;
  }> => {
    try {
      const reasons: string[] = [];

      // Check rider exists and get duty_status
      const { data: rider, error: riderError } = await supabase
        .from('riders')
        .select('rider_id, name, duty_status, status')
        .eq('rider_id', riderId)
        .single();

      if (riderError || !rider) {
        reasons.push('Rider not found');
        return { eligible: false, reasons };
      }

      if (rider.duty_status !== 'IDLE') {
        reasons.push(`Rider must be IDLE to reactivate (current: ${rider.duty_status || 'unknown'})`);
      }

      // Check for paused ledger
      const { data: ledger, error: ledgerError } = await supabase
        .from('rider_ledgers')
        .select('*')
        .eq('rider_id', riderId)
        .eq('status', 'paused')
        .single();

      if (ledgerError || !ledger) {
        reasons.push('No paused ledger found for this rider');
        return { eligible: false, reasons };
      }

      return {
        eligible: reasons.length === 0,
        reasons,
        ledger
      };
    } catch (err) {
      console.error('Error checking reactivation eligibility:', err);
      return {
        eligible: false,
        reasons: ['Error checking eligibility']
      };
    }
  };

  /**
   * Reactivate a paused ledger
   * Deletes pending payments, updates ledger, generates new payments
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

      // Validate start date is not before pause date
      if (ledger.paused_at) {
        const pauseDate = new Date(ledger.paused_at);
        const startDate = new Date(params.start_date);
        if (startDate < pauseDate) {
          throw new Error('Start date cannot be before pause date');
        }
      }

      // Check if deposit was refunded - require new deposit
      if (ledger.security_deposit_status !== 'retained' && !params.new_security_deposit) {
        throw new Error('Security deposit required (previous deposit was refunded)');
      }

      console.log(`[AUDIT] Ledger reactivation initiated`, {
        ledger_id: id,
        rider_id: ledger.rider_id,
        rider_name: ledger.rider_name,
        new_start_date: params.start_date,
        new_rental_amount: params.rental_amount,
        new_frequency: params.rental_frequency,
        new_deposit: params.new_security_deposit,
        timestamp: new Date().toISOString()
      });

      // Delete existing pending payments (preserve paid/overdue)
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('ledger_id', id)
        .eq('status', 'pending');

      if (deleteError) {
        console.error('Error deleting pending payments:', deleteError);
        throw deleteError;
      }

      // Update ledger
      const updateData: Record<string, unknown> = {
        status: 'active',
        reactivated_at: new Date().toISOString(),
        rental_start_date: params.start_date
      };

      if (params.rental_amount !== undefined) {
        updateData.rental_amount = params.rental_amount;
      }
      if (params.rental_frequency !== undefined) {
        updateData.rental_frequency = params.rental_frequency;
      }
      if (params.new_security_deposit !== undefined) {
        updateData.security_deposit_amount = params.new_security_deposit;
        updateData.security_deposit_status = 'retained';
      }

      const { data: updatedLedger, error: updateError } = await supabase
        .from('rider_ledgers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Generate new payments from start date
      const newStartDate = new Date(params.start_date);
      const effectiveFrequency = params.rental_frequency || ledger.rental_frequency;
      const effectiveAmount = params.rental_amount !== undefined ? params.rental_amount : ledger.rental_amount;

      // Get next payment number
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('payment_id')
        .like('payment_id', 'P%');

      const existingNumbers = (existingPayments || [])
        .map(p => p.payment_id)
        .filter((pId): pId is string => typeof pId === 'string' && pId.startsWith('P'))
        .map(pId => parseInt(pId.substring(1)))
        .filter(num => !isNaN(num));

      let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      // Generate 6 new rental payments
      const newPayments = [];
      for (let i = 0; i < 6; i++) {
        const dueDate = new Date(newStartDate);

        switch (effectiveFrequency) {
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
        newPayments.push({
          payment_id: paymentId,
          rider_id: ledger.rider_id,
          rider_name: ledger.rider_name,
          amount: effectiveAmount,
          due_date: dueDate.toISOString().split('T')[0],
          payment_date: null,
          status: 'pending' as const,
          payment_type: 'rental' as const,
          rental_period: `${effectiveFrequency.charAt(0).toUpperCase() + effectiveFrequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
          ledger_id: id,
        });
        nextNumber++;
      }

      const { error: insertError } = await supabase
        .from('payments')
        .insert(newPayments);

      if (insertError) {
        console.error('Error inserting new payments:', insertError);
        throw insertError;
      }

      // If new security deposit was provided, create a payment for it
      if (params.new_security_deposit !== undefined) {
        const depositPaymentId = `P${nextNumber.toString().padStart(3, '0')}`;
        await supabase
          .from('payments')
          .insert({
            payment_id: depositPaymentId,
            rider_id: ledger.rider_id,
            rider_name: ledger.rider_name,
            amount: params.new_security_deposit,
            due_date: params.start_date,
            status: 'pending' as const,
            payment_type: 'security_deposit' as const,
            rental_period: 'Security Deposit (Reactivation)',
            ledger_id: id,
            notes: 'Security deposit for reactivation'
          });
      }

      console.log(`[AUDIT] Ledger reactivated successfully`, {
        ledger_id: id,
        rider_id: ledger.rider_id,
        new_status: 'active',
        payments_generated: newPayments.length
      });

      setLedgers(prev => prev.map(l =>
        l.id === id ? { ...l, ...updatedLedger } : l
      ));

      toast.success('Ledger reactivated successfully!');
      return updatedLedger;
    } catch (err) {
      console.error('[AUDIT] Ledger reactivation failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to reactivate ledger';
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