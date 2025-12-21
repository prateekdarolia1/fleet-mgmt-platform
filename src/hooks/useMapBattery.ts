import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  mapBattery,
  mapBatteryWithRetry,
  getMapBatteryErrorMessage,
  isLockingError,
  type MapBatteryInput,
  type MapBatteryResponse
} from '@/lib/batteries/mapBattery';

/**
 * Hook for mapping batteries to vehicles
 *
 * Features:
 * - Automatic retry on lock errors
 * - Invalidates related caches on success
 * - Type-safe with TypeScript
 * - Error handling and user-friendly messages
 *
 * @param options - Mutation options
 * @returns Mutation result with mapping function
 *
 * @example
 * ```typescript
 * const { mutate, isPending, isError, error } = useMapBattery();
 *
 * function handleMapClick(batteryId, vehicleId) {
 *   mutate({
 *     batteryId,
 *     vehicleId,
 *     userId: currentUser.id
 *   });
 * }
 *
 * return (
 *   <div>
 *     <button onClick={handleMapClick} disabled={isPending}>
 *       {isPending ? 'Mapping...' : 'Map Battery'}
 *     </button>
 *     {isError && <div className="error">{error?.message}</div>}
 *   </div>
 * );
 * ```
 */
export function useMapBattery(options: {
  onSuccess?: (data: MapBatteryResponse) => void;
  onError?: (error: Error | null) => void;
  userId: string;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MapBatteryInput) => {
      // Use retry for better UX in case of transient lock errors
      return mapBatteryWithRetry(input, 3, 100);
    },

    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      if (data.success) {
        // Invalidate batteries list
        queryClient.invalidateQueries({
          queryKey: ['batteries']
        });

        // Invalidate vehicles with batteries list
        queryClient.invalidateQueries({
          queryKey: ['vehicles-with-batteries']
        });

        // Invalidate specific vehicle data
        if (data.vehicle?.id) {
          queryClient.invalidateQueries({
            queryKey: ['vehicle', data.vehicle.id]
          });
          queryClient.invalidateQueries({
            queryKey: ['vehicle-battery-info', data.vehicle.id]
          });
        }

        // Invalidate specific battery data
        if (data.battery?.id) {
          queryClient.invalidateQueries({
            queryKey: ['battery', data.battery.id]
          });
        }

        // Call user's onSuccess callback
        options.onSuccess?.(data);
      }
    },

    onError: (error) => {
      console.error('Battery mapping failed:', error);
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Hook for mapping batteries with automatic error handling
 *
 * Provides higher-level functionality with error message generation
 * and user-friendly feedback.
 *
 * @param options - Configuration options
 * @returns Object with mutation and helper functions
 *
 * @example
 * ```typescript
 * const { mapBatteryAsync, isPending, isError, errorMessage } = useMapBatteryWithErrorHandling({
 *   userId: 'user-id',
 *   onSuccess: () => toast.success('Battery mapped!'),
 *   onError: (msg) => toast.error(msg)
 * });
 *
 * async function handleMapping(batteryId, vehicleId) {
 *   const result = await mapBatteryAsync(batteryId, vehicleId);
 *   if (!result) {
 *     // Error was handled
 *     return;
 *   }
 *   // Success
 *   console.log('Battery details:', result.battery);
 * }
 * ```
 */
export function useMapBatteryWithErrorHandling(options: {
  userId: string;
  onSuccess?: (batteryId: string, vehicleId: string) => void;
  onError?: (errorMessage: string) => void;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MapBatteryInput) => {
      return mapBatteryWithRetry(input, 3, 100);
    },

    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['batteries'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });

        if (data.vehicle?.id) {
          queryClient.invalidateQueries({
            queryKey: ['vehicle', data.vehicle.id]
          });
        }

        options.onSuccess?.(variables.batteryId, variables.vehicleId);
      } else {
        // Call onError with user-friendly message
        const errorMessage = getMapBatteryErrorMessage(data);
        options.onError?.(errorMessage);
      }
    },

    onError: (error) => {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to map battery. Please try again.';
      options.onError?.(errorMessage);
    }
  });
}

/**
 * Hook for bulk battery mapping with progress tracking
 *
 * Useful for mapping multiple batteries at once with progress feedback.
 *
 * @param options - Configuration options
 * @returns Object with mutation and progress info
 *
 * @example
 * ```typescript
 * const {
 *   mutate,
 *   isPending,
 *   progress,
 *   successful,
 *   failed
 * } = useMapBatteryBulk({ userId: 'user-id' });
 *
 * function handleBulkMap() {
 *   const mappings = [
 *     { batteryId: 'bat1', vehicleId: 'veh1' },
 *     { batteryId: 'bat2', vehicleId: 'veh2' }
 *   ];
 *
 *   mutate(mappings);
 * }
 *
 * return (
 *   <div>
 *     {isPending && (
 *       <ProgressBar
 *         current={progress.completed}
 *         total={progress.total}
 *       />
 *     )}
 *     <p>Successful: {successful.length}</p>
 *     <p>Failed: {failed.length}</p>
 *   </div>
 * );
 * ```
 */
export function useMapBatteryBulk(options: {
  userId: string;
  onSuccess?: (successful: number, failed: number) => void;
  onError?: (message: string) => void;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      mappings: Array<{ batteryId: string; vehicleId: string }>
    ) => {
      const results = [];
      const successful: MapBatteryResponse[] = [];
      const failed: MapBatteryResponse[] = [];

      for (const mapping of mappings) {
        const result = await mapBatteryWithRetry({
          batteryId: mapping.batteryId,
          vehicleId: mapping.vehicleId,
          userId: options.userId
        });

        results.push(result);

        if (result.success) {
          successful.push(result);
        } else {
          failed.push(result);
        }
      }

      return { results, successful, failed };
    },

    onSuccess: (data) => {
      // Invalidate caches once at the end
      queryClient.invalidateQueries({ queryKey: ['batteries'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });

      options.onSuccess?.(data.successful.length, data.failed.length);
    },

    onError: (error) => {
      const message = error instanceof Error
        ? error.message
        : 'Bulk mapping operation failed';
      options.onError?.(message);
    }
  });
}

/**
 * Hook for checking mapping eligibility before attempting
 *
 * Validates that a battery and vehicle can be mapped together
 * before attempting the actual mapping.
 *
 * @example
 * ```typescript
 * const { canMap, error } = useCanMapBattery(batteryId, vehicleId);
 *
 * if (!canMap) {
 *   return <div className="error">{error}</div>;
 * }
 *
 * return <MapBatteryButton batteryId={batteryId} vehicleId={vehicleId} />;
 * ```
 */
export function useCanMapBattery(
  batteryId: string | null,
  vehicleId: string | null
): {
  canMap: boolean;
  error: string | null;
} {
  // Input validation
  if (!batteryId || !vehicleId) {
    return {
      canMap: false,
      error: 'Battery and vehicle IDs are required'
    };
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(batteryId)) {
    return {
      canMap: false,
      error: 'Invalid battery ID format'
    };
  }

  if (!uuidRegex.test(vehicleId)) {
    return {
      canMap: false,
      error: 'Invalid vehicle ID format'
    };
  }

  return {
    canMap: true,
    error: null
  };
}

/**
 * Hook for retrying failed mappings
 *
 * Retries a failed mapping with exponential backoff.
 * Useful for handling transient failures.
 *
 * @example
 * ```typescript
 * const { mutate: retry, isPending } = useRetryMapping();
 *
 * async function handleRetry(response) {
 *   retry({
 *     batteryId: 'bat-id',
 *     vehicleId: 'veh-id',
 *     userId: 'user-id'
 *   });
 * }
 * ```
 */
export function useRetryMapping(options: {
  onSuccess?: () => void;
  onError?: (message: string) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MapBatteryInput) => {
      return mapBatteryWithRetry(input, 3, 500);
    },

    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['batteries'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });
        options.onSuccess?.();
      } else {
        const message = getMapBatteryErrorMessage(data);
        options.onError?.(message);
      }
    },

    onError: (error) => {
      const message = error instanceof Error
        ? error.message
        : 'Retry failed. Please try again.';
      options.onError?.(message);
    }
  });
}
