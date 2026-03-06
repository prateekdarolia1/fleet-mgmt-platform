import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Types
export type RentalLedger = Tables<'rental_ledgers'>;
export type RentalLedgerInsert = TablesInsert<'rental_ledgers'>;
export type RentalLedgerUpdate = TablesUpdate<'rental_ledgers'>;

export type RentalLedgerStatus = 'pending_start' | 'active' | 'suspended' | 'closed' | 'cancelled';
export type SecurityDepositStatus = 'pending' | 'collected' | 'refunded';

export interface RentalLedgerWithPayments extends RentalLedger {
  rental_payments: Tables<'rental_payments'>[];
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

// Fetch all rental ledgers
export function useRentalLedgers(filters?: {
  status?: RentalLedgerStatus[];
  rider_id?: string;
  vehicle_id?: string;
}) {
  return useQuery({
    queryKey: ['rental-ledgers', filters],
    queryFn: async (): Promise<RentalLedger[]> => {
      let query = supabase
        .from('rental_ledgers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.rider_id) {
        query = query.eq('rider_id', filters.rider_id);
      }

      if (filters?.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching rental ledgers:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Fetch single rental ledger by ID with payments
export function useRentalLedgerById(ledgerId: string | null) {
  return useQuery({
    queryKey: ['rental-ledger', ledgerId],
    queryFn: async (): Promise<RentalLedgerWithPayments | null> => {
      if (!ledgerId) return null;

      const { data, error } = await supabase
        .from('rental_ledgers')
        .select(`
          *,
          rental_payments (*),
          profiles:responsible_user_id (id, first_name, last_name, email)
        `)
        .eq('id', ledgerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('Error fetching rental ledger:', error);
        throw error;
      }

      return data;
    },
    enabled: !!ledgerId,
  });
}

// Fetch pending start ledgers (need confirmation)
export function usePendingStartLedgers() {
  return useQuery({
    queryKey: ['rental-ledgers', 'pending_start'],
    queryFn: async (): Promise<RentalLedger[]> => {
      const { data, error } = await supabase
        .from('rental_ledgers')
        .select('*')
        .eq('status', 'pending_start')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending start ledgers:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Create rental ledger via RPC
export function useCreateRentalLedger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      rider_id: string;
      vehicle_id?: string;
      created_by?: string;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_rental_ledger', {
        p_rider_id: params.rider_id,
        p_vehicle_id: params.vehicle_id || null,
        p_created_by: params.created_by || null,
      });

      if (error) {
        console.error('Error creating rental ledger:', error);
        throw error;
      }

      return data as string;
    },
    onSuccess: (ledgerId) => {
      queryClient.invalidateQueries({ queryKey: ['rental-ledgers'] });
      toast.success('Rental ledger created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rental ledger: ${error.message}`);
    },
  });
}

// Confirm rental start via RPC
export function useConfirmRentalStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ledger_id: string;
      rental_start_date: string;
      security_deposit?: number;
      responsible_user_id?: string;
      confirmed_by?: string;
    }): Promise<{ success: boolean; payments_created: number }> => {
      const { data, error } = await supabase.rpc('confirm_rental_start', {
        p_ledger_id: params.ledger_id,
        p_rental_start_date: params.rental_start_date,
        p_security_deposit: params.security_deposit || 0,
        p_responsible_user_id: params.responsible_user_id || null,
        p_confirmed_by: params.confirmed_by || null,
      });

      if (error) {
        console.error('Error confirming rental start:', error);
        throw error;
      }

      return data as { success: boolean; payments_created: number };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rental-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['rental-ledger', variables.ledger_id] });
      queryClient.invalidateQueries({ queryKey: ['rental-payments'] });
      toast.success(`Rental started! ${result.payments_created} payment entries created.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm rental start: ${error.message}`);
    },
  });
}

// Update rental ledger
export function useUpdateRentalLedger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      ledger_id: string;
      updates: RentalLedgerUpdate;
    }): Promise<RentalLedger> => {
      const { data, error } = await supabase
        .from('rental_ledgers')
        .update(params.updates)
        .eq('id', params.ledger_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rental ledger:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rental-ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['rental-ledger', variables.ledger_id] });
      toast.success('Ledger updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ledger: ${error.message}`);
    },
  });
}

// Get ledger stats
export function useRentalLedgerStats() {
  return useQuery({
    queryKey: ['rental-ledgers', 'stats'],
    queryFn: async () => {
      const { data: ledgers, error } = await supabase
        .from('rental_ledgers')
        .select('status, rental_amount, security_deposit, security_deposit_status');

      if (error) throw error;

      const stats = {
        total: ledgers?.length || 0,
        active: ledgers?.filter(l => l.status === 'active').length || 0,
        pending_start: ledgers?.filter(l => l.status === 'pending_start').length || 0,
        suspended: ledgers?.filter(l => l.status === 'suspended').length || 0,
        closed: ledgers?.filter(l => l.status === 'closed').length || 0,
        total_rental_amount: ledgers?.reduce((sum, l) => sum + (l.rental_amount || 0), 0) || 0,
        total_deposits_collected: ledgers
          ?.filter(l => l.security_deposit_status === 'collected')
          .reduce((sum, l) => sum + (l.security_deposit || 0), 0) || 0,
      };

      return stats;
    },
  });
}
