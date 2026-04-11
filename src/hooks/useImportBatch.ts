/**
 * React Query Hooks for Import Batch Management
 * Note: data_import_batches and retroactive_events tables are not in generated types yet.
 * Using 'as any' casts for Supabase client calls until types are regenerated.
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
      let query = (supabase as any)
        .from('data_import_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DataImportBatch[];
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
      const { data, error } = await (supabase as any)
        .from('data_import_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (error) throw error;
      return (data || null) as DataImportBatch | null;
    },
    enabled: !!batchId,
  });
}

// ============================================================================
// HOOK: CREATE BATCH
// ============================================================================

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Omit<DataImportBatch, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any)
        .from('data_import_batches')
        .insert({
          ...batch,
          status: batch.status || 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DataImportBatch> }) => {
      const { data, error } = await (supabase as any)
        .from('data_import_batches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // First delete retroactive events
      await (supabase as any)
        .from('retroactive_events')
        .delete()
        .eq('import_batch_id', batchId);

      // Then delete the batch
      const { error } = await (supabase as any)
        .from('data_import_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
      return true;
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
      const [
        ridersRes,
        vehiclesRes,
        batteriesRes,
        paymentsRes,
        eventsRes,
      ] = await Promise.all([
        supabase.from('riders').select('id', { count: 'exact', head: true }).eq('import_batch_id' as any, batchId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('import_batch_id' as any, batchId),
        supabase.from('batteries').select('id', { count: 'exact', head: true }).eq('import_batch_id' as any, batchId),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('import_batch_id' as any, batchId),
        (supabase as any).from('retroactive_events').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
      ]);

      const ridersCount = ridersRes.count || 0;
      const vehiclesCount = vehiclesRes.count || 0;
      const batteriesCount = batteriesRes.count || 0;
      const paymentsCount = paymentsRes.count || 0;
      const eventsCount = eventsRes.count || 0;

      return {
        riders: ridersCount,
        vehicles: vehiclesCount,
        batteries: batteriesCount,
        payments: paymentsCount,
        retroactiveEvents: eventsCount,
        total: ridersCount + vehiclesCount + batteriesCount + paymentsCount,
      };
    },
    enabled: !!batchId,
  });
}
