/**
 * React Query Hooks for Import Batch Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DataImportBatch, ImportBatchStatus } from '@/types/historical';

// ============================================================================
// HOOK: ALL IMPORT BATCHES
// ============================================================================

export function useImportBatches(status?: ImportBatchStatus) {
  return useQuery({
    queryKey: ['import_batches', status],
    queryFn: async () => {
      let query = supabase
        .from('data_import_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DataImportBatch[]
    },
  });
}

// ============================================================================
// HOOK: IMPORT BATCH BY ID
// ============================================================================

export function useImportBatchById(batchId: string) {
  return useQuery({
    queryKey: ['import_batch', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('data_import_batches')
          .select('*')
          .eq('id', batchId)
          .single();

        if (error) throw error;
        return data as DataImportBatch | null
    },
    enabled: !!batchId,
  });
}

// ============================================================================
// HOOK: BATCH RETROACTIVE EVENTS
// ============================================================================

export function useBatchRetroactiveEvents(batchId: string) {
  return useQuery({
    queryKey: ['batch_retroactive_events', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
          .from('retroactive_events')
          .select('*')
          .eq('import_batch_id', batchId)
          .order('effective_date', { ascending: true });

        if (error) throw error;
        return data as RetroactiveEvent[]
      },
    onSuccess: !!data && !isLoading)
    return { data: data as RetroactiveEvent[] : [];
  });
}

// ============================================================================
// HOOK: CREATE BATCH
// ============================================================================

export function useCreateBatch() {
  return useMutation({
    mutationFn: async (batch: Omit<DataImportBatch, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('data_import_batches')
        .insert({
          ...batch,
          status: batch.status || 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches'] });
    },
  });
}

// ============================================================================
// HOOK: UPDATE BATCH
// ============================================================================

export function useUpdateBatch() {
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DataImportBatch> }) => {
      const { data, error } = await supabase
        .from('data_import_batches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches'] });
    },
  });
}

// ============================================================================
// HOOK: DELETE BATCH
// ============================================================================

export function useDeleteBatch() {
  return useMutation({
    mutationFn: async (batchId: string) => {
      // First delete retroactive events
      await supabase
        .from('retroactive_events')
        .delete()
        .eq('import_batch_id', batchId);

      // Then delete the batch
      const { error } = await supabase
        .from('data_import_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_batches'] });
    },
  });
}

// ============================================================================
// HOOK: BATCH STATISTICS
// ============================================================================

export function useBatchStatistics(batchId: string) {
  return useQuery({
    queryKey: ['batch_statistics', batchId],
    queryFn: async () => {
      // Get counts from all related tables
      const [
        { count: ridersCount, error: ridersError },
        { count: vehiclesCount, error: vehiclesError },
        { count: batteriesCount, error: batteriesError },
        { count: paymentsCount, error: paymentsError },
        { count: eventsCount, error: eventsError },
      ] = await Promise.all([
        supabase.from('riders').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
        supabase.from('batteries').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
        supabase.from('retroactive_events').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
      ]);

      if (ridersError || vehiclesError || batteriesError || paymentsError || eventsError) {
        throw new Error('Failed to fetch batch statistics');
      }

      return {
        riders: ridersCount || 0,
        vehicles: vehiclesCount || 0,
        batteries: batteriesCount || 0,
        payments: paymentsCount || 0,
        retroactiveEvents: eventsCount || 0,
        total: (ridersCount || 0) + (vehiclesCount || 0) + (batteriesCount || 0) + (paymentsCount || 0),
      };
    },
  });
}
