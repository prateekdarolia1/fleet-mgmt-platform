import { supabase } from '@/integrations/supabase/client';
import { validateBatterySmartId, normalizeBatterySmartId } from '@/lib/validation/batterySmartId';

/**
 * Response from updating rider Battery Smart ID
 */
export interface UpdateRiderBatterySmartIdResponse {
  success: boolean;
  message?: string;
  error?: string;
  rider?: {
    id: string;
    rider_id: string;
    name: string;
    battery_smart_id: string | null;
  };
  timestamp?: string;
  detail?: string;
}

/**
 * Input for updating rider Battery Smart ID
 */
export interface UpdateRiderBatterySmartIdInput {
  riderId: string;
  batterySmartId: string | null;
  userId: string;
}

/**
 * Update rider's Battery Smart ID for tracking battery performance
 *
 * This function:
 * - Validates Battery Smart ID format (8 uppercase alphanumeric chars)
 * - Updates the rider's battery_smart_id field
 * - Automatically normalizes (uppercase, trim) the input
 * - Returns clear error messages for validation failures
 *
 * @param input - Update operation details
 * @returns Result with success status and details
 *
 * @example
 * ```typescript
 * const result = await updateRiderBatterySmartId({
 *   riderId: 'R001',
 *   batterySmartId: 'BS12AB34',
 *   userId: 'user-uuid'
 * });
 *
 * if (result.success) {
 *   console.log('Battery Smart ID updated:', result.rider?.battery_smart_id);
 * } else if (result.error === 'INVALID_BATTERY_SMART_ID') {
 *   console.error('Invalid Battery Smart ID format');
 * } else {
 *   console.error('Update failed:', result.error);
 * }
 * ```
 */
export async function updateRiderBatterySmartId(
  input: UpdateRiderBatterySmartIdInput
): Promise<UpdateRiderBatterySmartIdResponse> {
  try {
    // Normalize and validate Battery Smart ID
    if (input.batterySmartId) {
      const normalized = normalizeBatterySmartId(input.batterySmartId);
      const validation = validateBatterySmartId(normalized);

      if (!validation.isValid) {
        return {
          success: false,
          error: 'INVALID_BATTERY_SMART_ID',
          message: validation.error || 'Invalid Battery Smart ID format',
          detail: 'Battery Smart ID must be 8 uppercase letters and numbers (e.g., BS12AB34)'
        };
      }

      // Update input with normalized value
      input.batterySmartId = normalized;
    }

    // Update rider in database
    const { data, error } = await supabase
      .from('riders')
      .update({ battery_smart_id: input.batterySmartId })
      .eq('id', input.riderId)
      .select('id, rider_id, name, battery_smart_id')
      .single();

    if (error) {
      console.error('Database error updating rider Battery Smart ID:', error);

      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'RIDER_NOT_FOUND',
          message: 'Rider not found'
        };
      }

      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: `Failed to update rider: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'RIDER_NOT_FOUND',
        message: 'Rider not found'
      };
    }

    return {
      success: true,
      message: input.batterySmartId
        ? `Battery Smart ID updated to ${input.batterySmartId}`
        : 'Battery Smart ID cleared',
      rider: {
        id: data.id,
        rider_id: data.rider_id,
        name: data.name,
        battery_smart_id: data.battery_smart_id
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Unexpected error updating rider Battery Smart ID:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get error message for Battery Smart ID update failure
 *
 * Converts error codes to user-friendly messages
 *
 * @param response - Response from updateRiderBatterySmartId()
 * @returns User-friendly error message
 */
export function getUpdateBatterySmartIdErrorMessage(
  response: UpdateRiderBatterySmartIdResponse
): string {
  const messages: Record<string, string> = {
    INVALID_BATTERY_SMART_ID: 'Invalid Battery Smart ID format. Must be 8 uppercase letters/numbers (e.g., BS12AB34).',
    RIDER_NOT_FOUND: 'Rider not found. Please check the rider ID.',
    DATABASE_ERROR: 'Failed to update rider Battery Smart ID. Please try again.',
    UNEXPECTED_ERROR: 'An unexpected error occurred while updating Battery Smart ID.'
  };

  return messages[response.error || ''] || response.message || 'Unknown error';
}

/**
 * Clear rider's Battery Smart ID (set to NULL)
 *
 * @param riderId - ID of the rider
 * @returns Result from updateRiderBatterySmartId with null value
 *
 * @example
 * ```typescript
 * const result = await clearRiderBatterySmartId('R001');
 * if (result.success) {
 *   console.log('Battery Smart ID cleared');
 * }
 * ```
 */
export async function clearRiderBatterySmartId(
  riderId: string,
  userId: string
): Promise<UpdateRiderBatterySmartIdResponse> {
  return updateRiderBatterySmartId({
    riderId,
    batterySmartId: null,
    userId
  });
}

/**
 * Get rider's current Battery Smart ID
 *
 * @param riderId - ID of the rider
 * @returns Battery Smart ID or null if not set
 */
export async function getRiderBatterySmartId(riderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('battery_smart_id')
      .eq('id', riderId)
      .single();

    if (error) {
      console.error('Error fetching rider Battery Smart ID:', error);
      return null;
    }

    return data?.battery_smart_id || null;
  } catch (error) {
    console.error('Unexpected error fetching rider Battery Smart ID:', error);
    return null;
  }
}

/**
 * Find riders by Battery Smart ID
 *
 * Returns all riders currently assigned to a specific Battery Smart ID
 *
 * @param batterySmartId - Battery Smart ID to search for
 * @returns Array of riders with that Battery Smart ID
 */
export async function findRidersByBatterySmartId(batterySmartId: string): Promise<
  Array<{
    id: string;
    rider_id: string;
    name: string;
    battery_smart_id: string;
  }>
> {
  try {
    const normalized = normalizeBatterySmartId(batterySmartId);
    const validation = validateBatterySmartId(normalized);

    if (!validation.isValid) {
      console.error('Invalid Battery Smart ID format:', validation.error);
      return [];
    }

    const { data, error } = await supabase
      .from('riders')
      .select('id, rider_id, name, battery_smart_id')
      .eq('battery_smart_id', normalized);

    if (error) {
      console.error('Error searching riders by Battery Smart ID:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error searching riders:', error);
    return [];
  }
}

/**
 * Batch update Battery Smart IDs for multiple riders
 *
 * Updates Battery Smart ID for multiple riders at once
 *
 * @param updates - Array of rider IDs and Battery Smart IDs to update
 * @param userId - User ID performing the update
 * @returns Results for each update
 */
export async function batchUpdateRiderBatterySmartIds(
  updates: Array<{
    riderId: string;
    batterySmartId: string | null;
  }>,
  userId: string
): Promise<UpdateRiderBatterySmartIdResponse[]> {
  const results: UpdateRiderBatterySmartIdResponse[] = [];

  for (const update of updates) {
    const result = await updateRiderBatterySmartId({
      riderId: update.riderId,
      batterySmartId: update.batterySmartId,
      userId
    });
    results.push(result);
  }

  return results;
}
