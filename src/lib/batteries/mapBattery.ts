import { supabase } from '@/integrations/supabase/client';

/**
 * Response from battery mapping operation
 */
export interface MapBatteryResponse {
  success: boolean;
  message?: string;
  error?: string;
  battery?: {
    id: string;
    battery_id: string;
    status: string;
    vehicle_id: string;
    service_provider: string;
    zone_id: string;
  };
  vehicle?: {
    id: string;
    vehicle_number: string;
    rider_name: string;
  };
  timestamp?: string;
  // Error details
  current_status?: string;
  allowed_statuses?: string[];
  current_vehicle_id?: string;
  requested_vehicle_id?: string;
  detail?: string;
}

/**
 * Input for mapping a battery to a vehicle
 */
export interface MapBatteryInput {
  batteryId: string;
  vehicleId: string;
  userId: string;
}

/**
 * Validation result for mapping operation
 */
export interface MapBatteryValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Atomically map a battery to a vehicle
 *
 * This function calls the map_battery() RPC which:
 * - Validates battery is ACTIVE or UNMAPPED
 * - Validates vehicle doesn't have a battery
 * - Uses row-level locking to prevent race conditions
 * - Updates battery status to MAPPED
 * - Logs the operation as a battery event
 * - Returns success or error with details
 *
 * @param input - Mapping operation details
 * @returns Result with success status and details
 *
 * @example
 * ```typescript
 * const result = await mapBattery({
 *   batteryId: 'battery-uuid',
 *   vehicleId: 'vehicle-uuid',
 *   userId: 'user-uuid'
 * });
 *
 * if (result.success) {
 *   console.log('Battery mapped:', result.battery?.battery_id);
 *   console.log('Vehicle:', result.vehicle?.vehicle_number);
 * } else {
 *   console.error('Mapping failed:', result.error, result.message);
 * }
 * ```
 */
export async function mapBattery(
  input: MapBatteryInput
): Promise<MapBatteryResponse> {
  try {
    // Validate input before calling RPC
    const validation = validateMapBatteryInput(input);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.errors.join('; ')
      };
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('map_battery', {
      p_battery_id: input.batteryId,
      p_vehicle_id: input.vehicleId,
      p_user_id: input.userId
    });

    if (error) {
      console.error('RPC error calling map_battery:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: `Failed to map battery: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'NO_RESPONSE',
        message: 'No response from server'
      };
    }

    return data as MapBatteryResponse;

  } catch (error) {
    console.error('Unexpected error in mapBattery:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Pre-validate mapping input before sending to RPC
 *
 * @param input - Mapping operation details
 * @returns Validation result with any errors found
 */
function validateMapBatteryInput(input: MapBatteryInput): MapBatteryValidation {
  const errors: string[] = [];

  if (!input.batteryId || typeof input.batteryId !== 'string') {
    errors.push('Invalid batteryId: must be a non-empty UUID string');
  }

  if (!input.vehicleId || typeof input.vehicleId !== 'string') {
    errors.push('Invalid vehicleId: must be a non-empty UUID string');
  }

  if (!input.userId || typeof input.userId !== 'string') {
    errors.push('Invalid userId: must be a non-empty UUID string');
  }

  // Basic UUID validation (loose check)
  if (input.batteryId && !isValidUUID(input.batteryId)) {
    errors.push('batteryId is not a valid UUID format');
  }

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
 * Map multiple batteries to vehicles (sequentially)
 *
 * Note: This is a convenience function for mapping multiple batteries.
 * For bulk operations, consider batch processing with appropriate error handling.
 *
 * @param mappings - Array of battery-to-vehicle mappings
 * @param userId - User ID performing the mappings
 * @returns Results of all mapping operations
 *
 * @example
 * ```typescript
 * const results = await mapMultipleBatteries([
 *   { batteryId: 'bat1', vehicleId: 'veh1' },
 *   { batteryId: 'bat2', vehicleId: 'veh2' }
 * ], userId);
 *
 * const successful = results.filter(r => r.success);
 * const failed = results.filter(r => !r.success);
 *
 * console.log(`${successful.length} batteries mapped`);
 * console.log(`${failed.length} batteries failed`);
 * ```
 */
export async function mapMultipleBatteries(
  mappings: Array<{ batteryId: string; vehicleId: string }>,
  userId: string
): Promise<MapBatteryResponse[]> {
  const results: MapBatteryResponse[] = [];

  for (const mapping of mappings) {
    const result = await mapBattery({
      batteryId: mapping.batteryId,
      vehicleId: mapping.vehicleId,
      userId
    });
    results.push(result);

    // Log progress
    if (result.success) {
      console.log(
        `✓ Mapped ${result.battery?.battery_id} to ${result.vehicle?.vehicle_number}`
      );
    } else {
      console.error(
        `✗ Failed to map battery: ${result.error} - ${result.message}`
      );
    }
  }

  return results;
}

/**
 * Get error message for mapping failure
 *
 * Converts error codes to user-friendly messages
 *
 * @param response - Response from mapping operation
 * @returns User-friendly error message
 */
export function getMapBatteryErrorMessage(response: MapBatteryResponse): string {
  const messages: Record<string, string> = {
    BATTERY_NOT_FOUND: 'Battery not found. Please check the battery ID.',
    BATTERY_LOCKED: 'Battery is currently being modified. Please try again.',
    INVALID_BATTERY_STATUS: `Battery cannot be mapped. Status: ${response.current_status}. Only ACTIVE or UNMAPPED batteries can be mapped.`,
    BATTERY_ALREADY_MAPPED: 'Battery is already mapped to another vehicle.',
    VEHICLE_NOT_FOUND: 'Vehicle not found. Please check the vehicle ID.',
    VEHICLE_LOCKED: 'Vehicle is currently being modified. Please try again.',
    VEHICLE_ALREADY_HAS_BATTERY: `Vehicle already has a battery assigned.`,
    VALIDATION_ERROR: 'Invalid input provided. Please check your data.',
    RPC_ERROR: 'Failed to communicate with server.',
    UNEXPECTED_ERROR: 'An unexpected error occurred.'
  };

  return messages[response.error || ''] || response.message || 'Unknown error';
}

/**
 * Check if mapping failure is due to concurrent access
 *
 * @param response - Response from mapping operation
 * @returns true if failure is due to locks/concurrent access
 */
export function isLockingError(response: MapBatteryResponse): boolean {
  return (
    response.error === 'BATTERY_LOCKED' ||
    response.error === 'VEHICLE_LOCKED'
  );
}

/**
 * Check if mapping can be retried
 *
 * Some errors are temporary and can be retried (e.g., locks),
 * while others are permanent (e.g., battery not found)
 *
 * @param response - Response from mapping operation
 * @returns true if operation can be retried
 */
export function canRetryMapping(response: MapBatteryResponse): boolean {
  const retryableErrors = [
    'BATTERY_LOCKED',
    'VEHICLE_LOCKED',
    'RPC_ERROR'
  ];

  return response.error ? retryableErrors.includes(response.error) : false;
}

/**
 * Retry mapping with exponential backoff
 *
 * @param input - Mapping operation details
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 100)
 * @returns Result of successful mapping or final error
 *
 * @example
 * ```typescript
 * const result = await mapBatteryWithRetry({
 *   batteryId: 'battery-uuid',
 *   vehicleId: 'vehicle-uuid',
 *   userId: 'user-uuid'
 * }, 3, 100);
 * ```
 */
export async function mapBatteryWithRetry(
  input: MapBatteryInput,
  maxAttempts: number = 3,
  initialDelayMs: number = 100
): Promise<MapBatteryResponse> {
  let lastError: MapBatteryResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await mapBattery(input);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Check if error is retryable
    if (!canRetryMapping(result)) {
      return result;
    }

    // Don't delay after last attempt
    if (attempt < maxAttempts) {
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      console.log(
        `Retry attempt ${attempt}/${maxAttempts} for mapping. Waiting ${delayMs}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return lastError || {
    success: false,
    error: 'UNEXPECTED_ERROR',
    message: 'Mapping failed after all retries'
  };
}
