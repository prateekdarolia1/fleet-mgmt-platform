/**
 * Unit Tests for Point-in-Time Query Hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEntityStateAtDate,
  useActiveRidersCountAtDate,
  useDeployedVehiclesCountAtDate,
  useRevenueByPeriod,
  useEntityTimeline,
} from '@/hooks/usePointInTimeQueries';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Point-in-Time Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEntityStateAtDate', () => {
    it('should fetch entity state at specific date', async () => {
      const mockData = {
        entity_type: 'rider',
        entity_id: 'DR001',
        status: 'active',
        vehicle_assigned: 'VH001',
        confidence_score: 0.95,
        data_source: 'CL87_CSV',
      };

      (supabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(
        () => useEntityStateAtDate('rider', 'DR001', new Date('2024-01-15')),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('get_entity_state_at_date', {
        p_entity_type: 'rider',
        p_entity_id: 'DR001',
        p_date: '2024-01-15',
      });
    });

    it('should handle entity not found', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: { error: 'Entity not active at specified date' },
        error: null,
      });

      const { result } = renderHook(
        () => useEntityStateAtDate('rider', 'DR999', new Date('2020-01-01')),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.error).toBeDefined();
    });
  });

  describe('useActiveRidersCountAtDate', () => {
    it('should fetch active riders count', async () => {
      const mockData = {
        date: '2024-01-15',
        active_riders_count: 42,
        avg_confidence_score: 0.85,
        data_quality: 'high',
      };

      (supabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(
        () => useActiveRidersCountAtDate(new Date('2024-01-15')),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.active_riders_count).toBe(42);
      expect(result.current.data?.data_quality).toBe('high');
    });
  });

  describe('useDeployedVehiclesCountAtDate', () => {
    it('should fetch deployed vehicles count with breakdown', async () => {
      const mockData = {
        date: '2024-01-15',
        deployed_vehicles_count: 35,
        vehicles_with_rider: 30,
        vehicles_without_rider: 5,
        avg_confidence_score: 0.90,
        data_quality: 'high',
      };

      (supabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(
        () => useDeployedVehiclesCountAtDate(new Date('2024-01-15')),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.deployed_vehicles_count).toBe(35);
      expect(result.current.data?.vehicles_with_rider).toBe(30);
    });
  });

  describe('useRevenueByPeriod', () => {
    it('should fetch revenue by period', async () => {
      const mockData = [
        {
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          total_revenue: 150000,
          payment_count: 100,
          avg_confidence_score: 0.95,
          data_quality: 'high',
        },
        {
          period_start: '2024-02-01',
          period_end: '2024-02-29',
          total_revenue: 165000,
          payment_count: 110,
          avg_confidence_score: 0.90,
          data_quality: 'high',
        },
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(
        () => useRevenueByPeriod(new Date('2024-01-01'), new Date('2024-02-29'), 'month'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.length).toBe(2);
      expect(result.current.data?.[0].total_revenue).toBe(150000);
    });
  });

  describe('useEntityTimeline', () => {
    it('should fetch entity timeline', async () => {
      const mockData = [
        {
          event_date: '2024-01-10T00:00:00Z',
          event_type: 'ONBOARD',
          event_source: 'CL87_CSV',
          event_data: { vehicle_assigned: 'VH001' },
          confidence: 0.90,
          is_historical: true,
        },
        {
          event_date: '2024-01-15T00:00:00Z',
          event_type: 'VEHICLE_ASSIGNED',
          event_source: 'PLATFORM',
          event_data: { vehicle_id: 'VH001' },
          confidence: 1.0,
          is_historical: false,
        },
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const { result } = renderHook(
        () => useEntityTimeline('rider', 'DR001'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.length).toBe(2);
      expect(result.current.data?.[0].event_type).toBe('ONBOARD');
    });
  });
});
