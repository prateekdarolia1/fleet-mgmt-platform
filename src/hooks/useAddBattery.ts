import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addBattery, generateBatteryId, isBatteryIdAvailable } from '@/lib/batteries/addBattery';

export interface AddBatteryInput {
  battery_id: string;
  service_provider: 'BATTERY_SMART' | 'OTHER';
  zone_id?: string | null;
  retrofit_date?: string | null;
  location?: 'NOIDA' | 'OTHER' | null;
  usc_id?: string | null;
  battery_plan?: 'D2D' | 'B2B' | 'OTHER' | null;
}

/**
 * Hook for adding a new battery to inventory
 * Handles mutation and automatic cache invalidation
 */
export const useAddBattery = (options?: {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddBatteryInput) => {
      const result = await addBattery(input);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate battery-related queries
      queryClient.invalidateQueries({ queryKey: ['batteries-list'] });
      queryClient.invalidateQueries({ queryKey: ['battery-stats'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  });
};

/**
 * Hook to generate next battery ID
 */
export const useGenerateBatteryId = () => {
  return useMutation({
    mutationFn: generateBatteryId
  });
};

/**
 * Hook to check if battery ID is available
 */
export const useCheckBatteryIdAvailable = () => {
  return useMutation({
    mutationFn: isBatteryIdAvailable
  });
};