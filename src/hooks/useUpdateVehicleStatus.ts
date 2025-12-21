import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateVehicleStatus,
  updateVehicleStatusWithRetry,
  getUpdateVehicleStatusErrorMessage,
  isStatusUpdateLockingError,
  type UpdateVehicleStatusInput,
  type UpdateVehicleStatusResponse,
  type VehicleStatus
} from '@/lib/vehicles/updateVehicleStatus';

/**
 * Hook for updating vehicle status with validation
 *
 * Features:
 * - Validates status change against business rules
 * - Automatic retry on lock errors
 * - Invalidates related caches on success
 * - Type-safe with TypeScript
 * - Prevents marking "Ready for Deployment" without battery
 *
 * @param options - Mutation options
 * @returns Mutation result with status update function
 *
 * @example
 * ```typescript
 * const { mutate, isPending, isError } = useUpdateVehicleStatus({
 *   userId: currentUser.id
 * });
 *
 * function handleStatusChange(vehicleId, newStatus) {
 *   mutate({
 *     vehicleId,
 *     newStatus,
 *     userId: currentUser.id
 *   });
 * }
 *
 * if (isError) {
 *   return <div className="error">Failed to update status</div>;
 * }
 * ```
 */
export function useUpdateVehicleStatus(options: {
  onSuccess?: (data: UpdateVehicleStatusResponse) => void;
  onError?: (error: Error | null) => void;
  userId: string;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateVehicleStatusInput) => {
      // Use retry for better UX in case of transient lock errors
      return updateVehicleStatusWithRetry(input, 3, 100);
    },

    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      if (data.success) {
        // Invalidate vehicles list
        queryClient.invalidateQueries({
          queryKey: ['vehicles']
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
        }

        // Call user's onSuccess callback
        options.onSuccess?.(data);
      }
    },

    onError: (error) => {
      console.error('Vehicle status update failed:', error);
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Hook for updating vehicle status with automatic error handling
 *
 * Provides higher-level functionality with error message generation
 * and user-friendly feedback. Automatically handles battery requirement validation.
 *
 * @param options - Configuration options
 * @returns Object with mutation and helper functions
 *
 * @example
 * ```typescript
 * const { updateStatusAsync, isPending, isError, errorMessage } =
 *   useUpdateVehicleStatusWithErrorHandling({
 *     userId: 'user-id',
 *     onSuccess: () => toast.success('Status updated!'),
 *     onError: (msg) => toast.error(msg)
 *   });
 *
 * async function handleStatusChange(vehicleId, newStatus) {
 *   const result = await updateStatusAsync({
 *     vehicleId,
 *     newStatus,
 *     userId: 'user-id'
 *   });
 *
 *   if (!result) {
 *     // Error was handled and displayed
 *     if (result?.error === 'MISSING_BATTERY') {
 *       // Show message: User must assign battery first
 *     }
 *     return;
 *   }
 *
 *   // Success - status was updated
 *   console.log('New status:', result.vehicle?.new_status);
 * }
 * ```
 */
export function useUpdateVehicleStatusWithErrorHandling(options: {
  userId: string;
  onSuccess?: (vehicleId: string, newStatus: VehicleStatus) => void;
  onError?: (errorMessage: string) => void;
} = { userId: '' }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateVehicleStatusInput) => {
      return updateVehicleStatusWithRetry(input, 3, 100);
    },

    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });

        if (data.vehicle?.id) {
          queryClient.invalidateQueries({
            queryKey: ['vehicle', data.vehicle.id]
          });
        }

        options.onSuccess?.(variables.vehicleId, variables.newStatus);
      } else {
        // Call onError with user-friendly message
        const errorMessage = getUpdateVehicleStatusErrorMessage(data);
        options.onError?.(errorMessage);
      }
    },

    onError: (error) => {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to update vehicle status. Please try again.';
      options.onError?.(errorMessage);
    }
  });
}

/**
 * Hook for checking if a status change is allowed
 *
 * Validates that a vehicle can transition to a new status.
 * Specifically checks battery requirement for "Ready for Deployment".
 *
 * @example
 * ```typescript
 * const { canChangeStatus, error, requiresBattery } =
 *   useCanChangeVehicleStatus(vehicleId, 'Ready for Deployment');
 *
 * if (!canChangeStatus) {
 *   if (requiresBattery) {
 *     return <div>Battery must be assigned before marking ready</div>;
 *   }
 *   return <div className="error">{error}</div>;
 * }
 *
 * return <Button onClick={...}>Mark Ready</Button>;
 * ```
 */
export function useCanChangeVehicleStatus(
  vehicleId: string | null,
  newStatus: VehicleStatus | null
): {
  canChangeStatus: boolean;
  error: string | null;
  requiresBattery?: boolean;
} {
  // Input validation
  if (!vehicleId) {
    return {
      canChangeStatus: false,
      error: 'Vehicle ID is required'
    };
  }

  if (!newStatus) {
    return {
      canChangeStatus: false,
      error: 'New status is required'
    };
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(vehicleId)) {
    return {
      canChangeStatus: false,
      error: 'Invalid vehicle ID format'
    };
  }

  // Validate status
  const validStatuses: VehicleStatus[] = ['Ready for Deployment', 'Deployed', 'Under Maintenance'];
  if (!validStatuses.includes(newStatus)) {
    return {
      canChangeStatus: false,
      error: `Invalid status: "${newStatus}"`
    };
  }

  // Note: Actual battery check happens on server side
  // This just validates the inputs client-side
  return {
    canChangeStatus: true,
    error: null,
    requiresBattery: newStatus === 'Ready for Deployment'
  };
}

/**
 * Hook for retrying failed status update
 *
 * Retries a failed status update with exponential backoff.
 * Useful for handling transient failures due to concurrent modifications.
 *
 * @example
 * ```typescript
 * const { mutate: retry, isPending } = useRetryStatusUpdate();
 *
 * async function handleRetry(lastFailedUpdate) {
 *   retry(lastFailedUpdate);
 * }
 * ```
 */
export function useRetryStatusUpdate(options: {
  onSuccess?: (newStatus: VehicleStatus) => void;
  onError?: (message: string) => void;
} = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateVehicleStatusInput) => {
      return updateVehicleStatusWithRetry(input, 3, 500);
    },

    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });
        options.onSuccess?.(data.vehicle?.new_status as VehicleStatus);
      } else {
        const message = getUpdateVehicleStatusErrorMessage(data);
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
