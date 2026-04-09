/**
 * React Query Hooks for Point-in-Time Queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DataImportBatch,
  ImportBatchSummary,
  RetroactiveEvent,
  ConfidenceLevel
} from '@/types/historical';

// ============================================================================
// TYPES
// ============================================================================

interface EntityStateAtDate {
  entity_type: string;
  entity_id: string;
  effective_start_date: string | null;
  effective_end_date: string | null;
  confidence_score: number;
  data_source: string;
  is_historical_import: boolean;
  error?: string;
  queried_date?: string;
  [key: string]: unknown;
}

interface ActiveRidersCountAtDate {
  date: string;
  active_riders_count: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

interface DeployedVehiclesCountAtDate {
  date: string;
  deployed_vehicles_count: number;
  vehicles_with_rider: number;
  vehicles_without_rider: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

interface RevenueByPeriod {
  period_start: string;
  period_end: string;
  total_revenue: number;
  payment_count: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

interface TimelineEvent {
  event_date: string;
  event_type: string;
  event_source: string;
  event_data: Record<string, unknown>;
  confidence: number;
  is_historical: boolean;
}

// ============================================================================
// HOOK: ENTITY STATE AT DATE
// ============================================================================

export function useEntityStateAtDate(
  entityType: 'rider' | 'vehicle' | 'battery' | 'payment',
  entityId: string,
  date: Date
) {
  return useQuery({
    queryKey: ['entity_state_at_date', entityType, entityId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_entity_state_at_date', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_date: date.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as EntityStateAtDate | null;
    },
    enabled: !!entityId,
  });
}

// ============================================================================
// HOOK: ACTIVE RIDERS COUNT AT DATE
// ============================================================================

export function useActiveRidersCountAtDate(date: Date) {
  return useQuery({
    queryKey: ['active_riders_count_at_date', date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_riders_count_at_date', {
        p_date: date.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as ActiveRidersCountAtDate;
    },
  });
}

// ============================================================================
// HOOK: DEPLOYED VEHICLES COUNT AT DATE
// ============================================================================

export function useDeployedVehiclesCountAtDate(date: Date) {
  return useQuery({
    queryKey: ['deployed_vehicles_count_at_date', date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_deployed_vehicles_count_at_date', {
        p_date: date.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as DeployedVehiclesCountAtDate;
    },
  });
}

// ============================================================================
// HOOK: REVENUE BY PERIOD
// ============================================================================

export function useRevenueByPeriod(
  startDate: Date,
  endDate: Date,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
  return useQuery({
    queryKey: ['revenue_by_period', startDate, endDate, period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_by_period', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
        p_period: period,
      });

      if (error) throw error;
      return (data as RevenueByPeriod[]) || [];
    },
  });
}

// ============================================================================
// HOOK: ENTITY TIMELINE
// ============================================================================

export function useEntityTimeline(
  entityType: 'rider' | 'vehicle' | 'battery',
  entityId: string
) {
  return useQuery({
    queryKey: ['entity_timeline', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_entity_timeline', {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });

      if (error) throw error;
      return (data as TimelineEvent[]) || [];
    },
    enabled: !!entityId,
  });
}

// ============================================================================
// HOOK: IMPORT BATCH
// ============================================================================

export function useImportBatch(batchId: string) {
  return useQuery({
    queryKey: ['import_batch', batchId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_import_batch_summary', {
        p_batch_id: batchId,
      });

      if (error) throw error;
      return data as ImportBatchSummary | null;
    },
    enabled: !!batchId,
  });
}

// ============================================================================
// HOOK: CREATE IMPORT BATCH
// ============================================================================

export function useCreateImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Omit<DataImportBatch, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('data_import_batches')
        .insert({
          batch_name: batch.batch_name,
          source_file: batch.source_file,
          status: 'pending',
          data_source: batch.data_source,
          data_period_start: batch.data_period_start,
          data_period_end: batch.data_period_end,
          imported_by: batch.imported_by,
          notes: batch.notes,
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
// HOOK: UPDATE IMPORT BATCH
// ============================================================================

export function useUpdateImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, updates }: { batchId: string; updates: Partial<DataImportBatch> }) => {
      const { data, error } = await supabase
        .from('data_import_batches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
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
