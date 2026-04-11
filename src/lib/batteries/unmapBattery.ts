import { supabase } from '@/integrations/supabase/client';

/**
 * Response from battery unmapping operation
 */
export interface UnmapBatteryResponse {
  success: boolean;
  message?: string;
  error?: string;
  battery?: {
    id: string;
    battery_id: string;
    status: string;
    vehicle_id: null;
    service_provider: string;
    zone_id: string;
  };
  vehicle?: {
    id: string;
    vehicle_number: string;
    rider_name: string;
  };
  reason?: string;
  timestamp?: string;
  // Error details
  current_status?: string;
  provided_length?: number;
  max_length?: number;
  detail?: string;
}

/**
 * Input for unmapping a battery from a vehicle
 */
export interface UnmapBatteryInput {
  batteryId: string;
  reason: string;
  userId: string;
}

/**
 * Validation result for unmapping operation
 */
export interface UnmapBatteryValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Atomically unmap a battery from a vehicle
 *
 * This function calls the unmap_battery() RPC which:
 * - Validates reason is provided and not exceeding 200 characters
 * - Validates battery is MAPPED status
 * - Uses row-level locking to prevent race conditions
 * - Clears vehicle_id from battery
 * - Sets battery status to UNMAPPED
 * - Logs the operation as a battery event with reason
 * - Returns success or error with details
 *
 * @param input - Unmapping operation details
 * @returns Result with success status and details
 *
 * @example
 * ```typescript
 * const result = await unmapBattery({
 *   batteryId: 'battery-uuid',
 *   reason: 'Battery performance degradation',
 *   userId: 'user-uuid'
 * });
 *
 * if (result.success) {
 *   console.log('Battery unmapped:', result.battery?.battery_id);
 *   console.log('Vehicle:', result.vehicle?.vehicle_number);
 * } else {
 *   console.error('Unmapping failed:', result.error, result.message);
 * }
 * ```
 */
export async function unmapBattery(
  input: UnmapBatteryInput
): Promise<UnmapBatteryResponse> {
  try {
    // Validate input before calling RPC
    const validation = validateUnmapBatteryInput(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.errors.join('; ')
      };
    }

    // Call the RPC function
    const { data, error } = await (supabase as any).rpc('unmap_battery', {
      p_battery_id: input.batteryId,
      p_reason: input.reason,
      p_user_id: input.userId
    });

    if (error) {
      console.error('RPC error calling unmap_battery:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: `Failed to unmap battery: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'NO_RESPONSE',
        message: 'No response from server'
      };
    }

    return data as unknown as UnmapBatteryResponse;

  } catch (error) {
    console.error('Unexpected error in unmapBattery:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Pre-validate unmapping input before sending to RPC
 *
 * @param input - Unmapping operation details
 * @returns Validation result with any errors found
 */
function validateUnmapBatteryInput(input: UnmapBatteryInput): UnmapBatteryValidation {
  const errors: string[] = [];

  if (!input.batteryId || typeof input.batteryId !== 'string') {
    errors.push('Invalid batteryId: must be a non-empty UUID string');
  }

  if (!input.reason || typeof input.reason !== 'string') {
    errors.push('Invalid reason: must be a non-empty string');
  }

  if (input.reason && input.reason.trim().length === 0) {
    errors.push('Reason cannot be empty or whitespace only');
  }

  if (input.reason && input.reason.length > 200) {
    errors.push(
      `Reason exceeds maximum length: ${input.reason.length} characters (max 200)`
    );
  }

  if (!input.userId || typeof input.userId !== 'string') {
    errors.push('Invalid userId: must be a non-empty UUID string');
  }

  // Basic UUID validation (loose check)
  if (input.batteryId && !isValidUUID(input.batteryId)) {
    errors.push('batteryId is not a valid UUID format');
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
 * Unmap multiple batteries from vehicles (sequentially)
 *
 * Note: This is a convenience function for unmapping multiple batteries.
 * For bulk operations, consider batch processing with appropriate error handling.
 *
 * @param unmappings - Array of battery unmappings with reasons
 * @param userId - User ID performing the unmappings
 * @returns Results of all unmapping operations
 *
 * @example
 * ```typescript
 * const results = await unmapMultipleBatteries([
 *   { batteryId: 'bat1', reason: 'Battery failed diagnostics' },
 *   { batteryId: 'bat2', reason: 'Maintenance required' }
 * ], userId);
 *
 * const successful = results.filter(r => r.success);
 * const failed = results.filter(r => !r.success);
 *
 * console.log(`${successful.length} batteries unmapped`);
 * console.log(`${failed.length} batteries failed`);
 * ```
 */
export async function unmapMultipleBatteries(
  unmappings: Array<{ batteryId: string; reason: string }>,
  userId: string
): Promise<UnmapBatteryResponse[]> {
  const results: UnmapBatteryResponse[] = [];

  for (const unmapping of unmappings) {
    const result = await unmapBattery({
      batteryId: unmapping.batteryId,
      reason: unmapping.reason,
      userId
    });
    results.push(result);

    // Log progress
    if (result.success) {
      console.log(
        `✓ Unmapped ${result.battery?.battery_id} from ${result.vehicle?.vehicle_number}`
      );
    } else {
      console.error(
        `✗ Failed to unmap battery: ${result.error} - ${result.message}`
      );
    }
  }

  return results;
}

/**
 * Get error message for unmapping failure
 *
 * Converts error codes to user-friendly messages
 *
 * @param response - Response from unmapping operation
 * @returns User-friendly error message
 */
export function getUnmapBatteryErrorMessage(response: UnmapBatteryResponse): string {
  const messages: Record<string, string> = {
    MISSING_REASON: 'Please provide a reason for unmapping the battery.',
    REASON_TOO_LONG: `Reason is too long. Maximum 200 characters allowed (provided: ${response.provided_length}).`,
    BATTERY_NOT_FOUND: 'Battery not found. Please check the battery ID.',
    BATTERY_LOCKED: 'Battery is currently being modified. Please try again.',
    INVALID_BATTERY_STATUS: `Battery cannot be unmapped. Status: ${response.current_status}. Only MAPPED batteries can be unmapped.`,
    BATTERY_NOT_MAPPED: 'Battery is not mapped to any vehicle.',
    VEHICLE_NOT_FOUND: 'Vehicle associated with battery does not exist.',
    VEHICLE_LOCKED: 'Vehicle is currently being modified. Please try again.',
    VALIDATION_ERROR: 'Invalid input provided. Please check your data.',
    RPC_ERROR: 'Failed to communicate with server.',
    UNEXPECTED_ERROR: 'An unexpected error occurred.'
  };

  return messages[response.error || ''] || response.message || 'Unknown error';
}

/**
 * Check if unmapping failure is due to concurrent access
 *
 * @param response - Response from unmapping operation
 * @returns true if failure is due to locks/concurrent access
 */
export function isUnmapLockingError(response: UnmapBatteryResponse): boolean {
  return (
    response.error === 'BATTERY_LOCKED' ||
    response.error === 'VEHICLE_LOCKED'
  );
}

/**
 * Check if unmapping can be retried
 *
 * Some errors are temporary and can be retried (e.g., locks),
 * while others are permanent (e.g., battery not found)
 *
 * @param response - Response from unmapping operation
 * @returns true if operation can be retried
 */
export function canRetryUnmapping(response: UnmapBatteryResponse): boolean {
  const retryableErrors = [
    'BATTERY_LOCKED',
    'VEHICLE_LOCKED',
    'RPC_ERROR'
  ];

  return response.error ? retryableErrors.includes(response.error) : false;
}

/**
 * Retry unmapping with exponential backoff
 *
 * @param input - Unmapping operation details
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of successful unmapping or final error
 *
 * @example
 * ```typescript
 * const result = await unmapBatteryWithRetry({
 *   batteryId: 'battery-uuid',
 *   reason: 'Battery maintenance',
 *   userId: 'user-uuid'
 * }, 3, 100);
 * ```
 */
export async function unmapBatteryWithRetry(
  input: UnmapBatteryInput,
  maxAttempts: number = 3,
  initialDelayMs: number = 100
): Promise<UnmapBatteryResponse> {
  let lastError: UnmapBatteryResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await unmapBattery(input);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Check if error is retryable
    if (!canRetryUnmapping(result)) {
      return result;
    }

    // Don't delay after last attempt
    if (attempt < maxAttempts) {
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `Retry attempt ${attempt}/${maxAttempts} for unmapping. Waiting ${delayMs}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return lastError || {
    success: false,
    error: 'UNEXPECTED_ERROR',
    message: 'Unmapping failed after all retries'
  };
}
