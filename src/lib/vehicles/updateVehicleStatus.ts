import { supabase } from '@/integrations/supabase/client';

/**
 * Valid vehicle statuses
 */
export type VehicleStatus = 'Ready for Deployment' | 'Deployed' | 'Under Maintenance';

/**
 * Response from vehicle status update operation
 */
export interface UpdateVehicleStatusResponse {
  success: boolean;
  message?: string;
  error?: string;
  vehicle?: {
    id: string;
    vehicle_number: string;
    previous_status?: string;
    new_status?: string;
  };
  action?: string;
  reason?: string;
  timestamp?: string;
  // Error details
  provided_status?: string;
  valid_statuses?: string[];
  detail?: string;
}

/**
 * Input for updating vehicle status
 */
export interface UpdateVehicleStatusInput {
  vehicleId: string;
  newStatus: VehicleStatus;
  userId: string;
}

/**
 * Validation result for vehicle status update
 */
export interface UpdateVehicleStatusValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Safely update vehicle status with business rule validation
 *
 * This function calls the update_vehicle_status() RPC which:
 * - Validates status is a valid enum value
 * - Validates vehicle exists
 * - Enforces: Cannot mark "Ready for Deployment" without a battery
 * - Uses row-level locking to prevent race conditions
 * - Returns success or error with details
 *
 * @param input - Status update operation details
 * @returns Result with success status and details
 *
 * @example
 * ```typescript
 * const result = await updateVehicleStatus({
 *   vehicleId: 'vehicle-uuid',
 *   newStatus: 'Ready for Deployment',
 *   userId: 'user-uuid'
 * });
 *
 * if (result.success) {
 *   console.log('Vehicle status updated:', result.vehicle?.new_status);
 * } else if (result.error === 'MISSING_BATTERY') {
 *   // Show user: Battery must be assigned first
 *   console.error('Assign a battery before marking ready for deployment');
 * } else {
 *   console.error('Update failed:', result.error, result.message);
 * }
 * ```
 */
export async function updateVehicleStatus(
  input: UpdateVehicleStatusInput
): Promise<UpdateVehicleStatusResponse> {
  try {
    // Validate input before calling RPC
    const validation = validateStatusUpdateInput(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.errors.join('; ')
      };
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('update_vehicle_status', {
      p_vehicle_id: input.vehicleId,
      p_new_status: input.newStatus,
      p_user_id: input.userId
    });

    if (error) {
      console.error('RPC error calling update_vehicle_status:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: `Failed to update vehicle status: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'NO_RESPONSE',
        message: 'No response from server'
      };
    }

    return data as UpdateVehicleStatusResponse;

  } catch (error) {
    console.error('Unexpected error in updateVehicleStatus:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Pre-validate status update input before sending to RPC
 *
 * @param input - Status update operation details
 * @returns Validation result with any errors found
 */
function validateStatusUpdateInput(input: UpdateVehicleStatusInput): UpdateVehicleStatusValidation {
  const errors: string[] = [];
  const validStatuses: VehicleStatus[] = ['Ready for Deployment', 'Deployed', 'Under Maintenance'];

  if (!input.vehicleId || typeof input.vehicleId !== 'string') {
    errors.push('Invalid vehicleId: must be a non-empty UUID string');
  }

  if (!input.newStatus || typeof input.newStatus !== 'string') {
    errors.push('Invalid newStatus: must be a non-empty string');
  }

  if (input.newStatus && !validStatuses.includes(input.newStatus as VehicleStatus)) {
    errors.push(
      `Invalid status: "${input.newStatus}". Must be one of: ${validStatuses.join(', ')}`
    );
  }

  if (!input.userId || typeof input.userId !== 'string') {
    errors.push('Invalid userId: must be a non-empty UUID string');
  }

  // Basic UUID validation (loose check)
  if (input.vehicleId && !isValidUUID(input.vehicleId)) {
    errors.push('vehicleId is not a valid UUID format');
  }

  if (input.userId && !isValidUUID(input.userId)) {
    errors.push('userId is not a valid UUID format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if a string is a valid UUID
 *
 * @param uuid - String to validate
 * @returns true if valid UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get error message for status update failure
 *
 * Converts error codes to user-friendly messages
 *
 * @param response - Response from status update operation
 * @returns User-friendly error message
 */
export function getUpdateVehicleStatusErrorMessage(
  response: UpdateVehicleStatusResponse
): string {
  const messages: Record<string, string> = {
    INVALID_STATUS: `Invalid status provided. Valid options are: Ready for Deployment, Deployed, Under Maintenance.`,
    VEHICLE_NOT_FOUND: 'Vehicle not found. Please check the vehicle ID.',
    VEHICLE_LOCKED: 'Vehicle is currently being modified. Please try again.',
    MISSING_BATTERY: 'Vehicle cannot be marked "Ready for Deployment" without a battery assigned. Please map a battery first.',
    VALIDATION_ERROR: 'Invalid input provided. Please check your data.',
    RPC_ERROR: 'Failed to communicate with server.',
    UNEXPECTED_ERROR: 'An unexpected error occurred.'
  };

  return messages[response.error || ''] || response.message || 'Unknown error';
}

/**
 * Check if status update failure is due to concurrent access
 *
 * @param response - Response from status update operation
 * @returns true if failure is due to locks/concurrent access
 */
export function isStatusUpdateLockingError(response: UpdateVehicleStatusResponse): boolean {
  return response.error === 'VEHICLE_LOCKED';
}

/**
 * Check if status update can be retried
 *
 * Some errors are temporary and can be retried (e.g., locks),
 * while others are permanent (e.g., vehicle not found, missing battery)
 *
 * @param response - Response from status update operation
 * @returns true if operation can be retried
 */
export function canRetryStatusUpdate(response: UpdateVehicleStatusResponse): boolean {
  const retryableErrors = [
    'VEHICLE_LOCKED',
    'RPC_ERROR'
  ];

  return response.error ? retryableErrors.includes(response.error) : false;
}

/**
 * Retry status update with exponential backoff
 *
 * @param input - Status update operation details
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of successful update or final error
 *
 * @example
 * ```typescript
 * const result = await updateVehicleStatusWithRetry({
 *   vehicleId: 'vehicle-uuid',
 *   newStatus: 'Ready for Deployment',
 *   userId: 'user-uuid'
 * }, 3, 100);
 * ```
 */
export async function updateVehicleStatusWithRetry(
  input: UpdateVehicleStatusInput,
  maxAttempts: number = 3,
  initialDelayMs: number = 100
): Promise<UpdateVehicleStatusResponse> {
  let lastError: UpdateVehicleStatusResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await updateVehicleStatus(input);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Check if error is retryable
    if (!canRetryStatusUpdate(result)) {
      return result;
    }

    // Don't delay after last attempt
    if (attempt < maxAttempts) {
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `Retry attempt ${attempt}/${maxAttempts} for status update. Waiting ${delayMs}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return lastError || {
    success: false,
    error: 'UNEXPECTED_ERROR',
    message: 'Status update failed after all retries'
  };
}
