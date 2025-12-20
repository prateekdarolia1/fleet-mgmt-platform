import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  unmapBattery,
  unmapBatteryWithRetry,
  getUnmapBatteryErrorMessage,
  isUnmapLockingError,
  type UnmapBatteryInput,
  type UnmapBatteryResponse
} from '@/lib/batteries/unmapBattery';

/**
 * Hook for unmapping batteries from vehicles
 *
 * Features:
 * - Automatic retry on lock errors
 * - Invalidates related caches on success
 * - Type-safe with TypeScript
 * - Error handling and user-friendly messages
 *
 * @param options - Mutation options
 * @returns Mutation result with unmapping function
 *
 * @example
 * ```typescript
 * const { mutate, isPending, isError, error } = useUnmapBattery();
 *
 * function handleUnmapClick(batteryId, reason) {
 *   mutate({
 *     batteryId,
 *     reason,
 *     userId: currentUser.id
 *   });
 * }
 *
 * return (
 *   <div>
 *     <button onClick={handleUnmapClick} disabled={isPending}>
 *       {isPending ? 'Unmapping...' : 'Unmap Battery'}
 *     </button>
 *     {isError && <div className="error">{error?.message}</div>}
 *   </div>
 * );
 * ```
 */
export function useUnmapBattery(options: {
  onSuccess?: (data: UnmapBatteryResponse) => void;
  onError?: (error: Error | null) => void;
  userId: string;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UnmapBatteryInput) => {
      // Use retry for better UX in case of transient lock errors
      return unmapBatteryWithRetry(input, 3, 100);
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
      console.error('Battery unmapping failed:', error);
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Hook for unmapping batteries with automatic error handling
 *
 * Provides higher-level functionality with error message generation
 * and user-friendly feedback.
 *
 * @param options - Configuration options
 * @returns Object with mutation and helper functions
 *
 * @example
 * ```typescript
 * const { unmapBatteryAsync, isPending, isError, errorMessage } = useUnmapBatteryWithErrorHandling({
 *   userId: 'user-id',
 *   onSuccess: () => toast.success('Battery unmapped!'),
 *   onError: (msg) => toast.error(msg)
 * });
 *
 * async function handleUnmapping(batteryId, reason) {
 *   const result = await unmapBatteryAsync(batteryId, reason);
 *   if (!result) {
 *     // Error was handled
 *     return;
 *   }
 *   // Success
 *   console.log('Battery details:', result.battery);
 * }
 * ```
 */
export function useUnmapBatteryWithErrorHandling(options: {
  userId: string;
  onSuccess?: (batteryId: string, vehicleId: string) => void;
  onError?: (errorMessage: string) => void;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UnmapBatteryInput) => {
      return unmapBatteryWithRetry(input, 3, 100);
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

        options.onSuccess?.(variables.batteryId, data.vehicle?.id || '');
      } else {
        // Call onError with user-friendly message
        const errorMessage = getUnmapBatteryErrorMessage(data);
        options.onError?.(errorMessage);
      }
    },

    onError: (error) => {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to unmap battery. Please try again.';
      options.onError?.(errorMessage);
    }
  });
}

/**
 * Hook for bulk battery unmapping with progress tracking
 *
 * Useful for unmapping multiple batteries at once with progress feedback.
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
 * } = useUnmapBatteryBulk({ userId: 'user-id' });
 *
 * function handleBulkUnmap() {
 *   const unmappings = [
 *     { batteryId: 'bat1', reason: 'Battery failed' },
 *     { batteryId: 'bat2', reason: 'Maintenance' }
 *   ];
 *
 *   mutate(unmappings);
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
export function useUnmapBatteryBulk(options: {
  userId: string;
  onSuccess?: (successful: number, failed: number) => void;
  onError?: (message: string) => void;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      unmappings: Array<{ batteryId: string; reason: string }>
    ) => {
      const results = [];
      const successful: UnmapBatteryResponse[] = [];
      const failed: UnmapBatteryResponse[] = [];

      for (const unmapping of unmappings) {
        const result = await unmapBatteryWithRetry({
          batteryId: unmapping.batteryId,
          reason: unmapping.reason,
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
        : 'Bulk unmapping operation failed';
      options.onError?.(message);
    }
  });
}

/**
 * Hook for checking unmapping eligibility before attempting
 *
 * Validates that a battery can be unmapped before attempting
 * the actual unmapping.
 *
 * @example
 * ```typescript
 * const { canUnmap, error } = useCanUnmapBattery(batteryId);
 *
 * if (!canUnmap) {
 *   return <div className="error">{error}</div>;
 * }
 *
 * return <UnmapBatteryButton batteryId={batteryId} />;
 * ```
 */
export function useCanUnmapBattery(
  batteryId: string | null
): {
  canUnmap: boolean;
  error: string | null;
} {
  // Input validation
  if (!batteryId) {
    return {
      canUnmap: false,
      error: 'Battery ID is required'
    };
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(batteryId)) {
    return {
      canUnmap: false,
      error: 'Invalid battery ID format'
    };
  }

  return {
    canUnmap: true,
    error: null
  };
}

/**
 * Hook for retrying failed unmappings
 *
 * Retries a failed unmapping with exponential backoff.
 * Useful for handling transient failures.
 *
 * @example
 * ```typescript
 * const { mutate: retry, isPending } = useRetryUnmapping();
 *
 * async function handleRetry(response) {
 *   retry({
 *     batteryId: 'bat-id',
 *     reason: 'Retry',
 *     userId: 'user-id'
 *   });
 * }
 * ```
 */
export function useRetryUnmapping(options: {
  onSuccess?: () => void;
  onError?: (message: string) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UnmapBatteryInput) => {
      return unmapBatteryWithRetry(input, 3, 500);
    },

    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['batteries'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });
        options.onSuccess?.();
      } else {
        const message = getUnmapBatteryErrorMessage(data);
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
