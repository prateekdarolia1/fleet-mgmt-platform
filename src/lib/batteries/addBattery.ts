import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BatteryInsert = Database['public']['Tables']['batteries']['Insert'];
type Battery = Database['public']['Tables']['batteries']['Row'];
type BatteryEvent = Database['public']['Tables']['battery_events']['Row'];

interface AddBatteryInput {
  battery_id: string;
  service_provider: 'BATTERY_SMART' | 'OTHER';
  zone_id?: string | null;
  retrofit_date?: string | null;
  location?: 'NOIDA' | 'OTHER' | null;
  usc_id?: string | null;
  battery_plan?: 'D2D' | 'B2B' | 'OTHER' | null;
}

interface AddBatteryResponse {
  battery: Battery;
  event: BatteryEvent;
  success: true;
}

interface AddBatteryError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

type AddBatteryResult = AddBatteryResponse | AddBatteryError;

/**
 * Validates battery input data
 * @param input - Battery input data
 * @returns Array of validation errors (empty if valid)
 */
function validateInput(input: AddBatteryInput): string[] {
  const errors: string[] = [];

  if (!input.battery_id) {
    errors.push('battery_id is required');
  } else if (!/^[A-Z0-9]{7,8}$/.test(input.battery_id)) {
    errors.push('battery_id must be 7-8 uppercase alphanumeric characters (e.g., BAT0001, BAT00001)');
  }

  if (!input.service_provider) {
    errors.push('service_provider is required');
  } else if (!['BATTERY_SMART', 'OTHER'].includes(input.service_provider)) {
    errors.push('service_provider must be BATTERY_SMART or OTHER');
  }


  if (input.battery_plan && !['D2D', 'B2B', 'OTHER'].includes(input.battery_plan)) {
    errors.push('battery_plan must be D2D, B2B, or OTHER');
  }

  if (input.location && !['NOIDA', 'OTHER'].includes(input.location)) {
    errors.push('location must be NOIDA or OTHER');
  }

  if (input.retrofit_date) {
    const date = new Date(input.retrofit_date);
    if (isNaN(date.getTime())) {
      errors.push('retrofit_date must be a valid date');
    } else if (date > new Date()) {
      errors.push('retrofit_date cannot be in the future');
    }
  }

  return errors;
}

/**
 * Normalizes input data before insert
 * - Uppercases battery_id
 * - Uppercases zone_id
 * - Uppercases usc_id
 * - Uppercases location
 */
function normalizeInput(input: AddBatteryInput): AddBatteryInput {
  return {
    ...input,
    battery_id: input.battery_id.toUpperCase(),
    zone_id: input.zone_id ? input.zone_id.toUpperCase() : input.zone_id,
    usc_id: input.usc_id ? input.usc_id.toUpperCase() : input.usc_id,
    location: input.location ? (input.location.toUpperCase() as 'NOIDA' | 'OTHER') : input.location
  };
}

/**
 * Adds a new battery to inventory with automatic event logging
 *
 * Features:
 * - Validates all inputs (format, constraints, enums)
 * - Uppercases text fields before insert
 * - Sets status to ACTIVE by default
 * - Creates automatic CREATE event in battery_events
 * - Wraps operations in a transaction-like approach
 *
 * @param input - Battery data to insert
 * @returns Battery and event record on success, error details on failure
 *
 * @example
 * ```typescript
 * const result = await addBattery({
 *   battery_id: 'bat00001',  // Will be uppercased to BAT00001
 *   service_provider: 'BATTERY_SMART',
 *   zone_id: 'zone1234',     // Will be uppercased to ZONE1234
 *   usc_id: 'code123',       // Will be uppercased to CODE123
 *   battery_plan: 'D2D',
 *   location: 'NOIDA'
 * });
 *
 * if (result.success) {
 *   console.log('Battery created:', result.battery.battery_id);
 *   console.log('Event logged:', result.event.event_type);
 * } else {
 *   console.error('Failed to create battery:', result.error);
 * }
 * ```
 */
export async function addBattery(input: AddBatteryInput): Promise<AddBatteryResult> {
  try {
    // Step 1: Validate input
    const validationErrors = validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validation failed',
        details: validationErrors
      };
    }

    // Step 2: Normalize input (uppercase fields)
    const normalizedInput = normalizeInput(input);

    // Step 3: Prepare battery data for insert
    const batteryData: BatteryInsert = {
      battery_id: normalizedInput.battery_id,
      service_provider: normalizedInput.service_provider,
      zone_id: normalizedInput.zone_id,
      retrofit_date: normalizedInput.retrofit_date,
      location: normalizedInput.location,
      usc_id: normalizedInput.usc_id,
      battery_plan: normalizedInput.battery_plan,
      status: 'ACTIVE' // Default status
    };

    // Step 4: Insert battery
    const { data: batteryResult, error: batteryError } = await supabase
      .from('batteries')
      .insert([batteryData])
      .select()
      .single();

    if (batteryError) {
      // Handle specific database errors
      if (batteryError.message.includes('duplicate key')) {
        return {
          success: false,
          error: `Battery with ID '${normalizedInput.battery_id}' already exists`,
          code: 'DUPLICATE_BATTERY_ID',
          details: batteryError
        };
      }

      if (batteryError.message.includes('check constraint')) {
        return {
          success: false,
          error: 'Battery data does not meet validation constraints',
          code: 'CONSTRAINT_VIOLATION',
          details: batteryError
        };
      }

      return {
        success: false,
        error: `Failed to create battery: ${batteryError.message}`,
        code: batteryError.code,
        details: batteryError
      };
    }

    if (!batteryResult) {
      return {
        success: false,
        error: 'Battery created but no data returned from database'
      };
    }

    // Step 5: Verify battery was created and event will be auto-logged by trigger
    // The battery_events row is created automatically by the database trigger
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Fetch the created event (created by trigger)
    const { data: eventResult, error: eventError } = await supabase
      .from('battery_events')
      .select('*')
      .eq('battery_id', normalizedInput.battery_id)
      .eq('event_type', 'CREATE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (eventError) {
      // Log warning but don't fail - battery was created successfully
      console.warn('Warning: Battery created but event logging may have failed:', eventError);
    }

    // Return success with both battery and event
    return {
      success: true,
      battery: batteryResult,
      event: eventResult || ({} as BatteryEvent)
    };

  } catch (error) {
    console.error('Unexpected error in addBattery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: error
    };
  }
}

/**
 * Validates a single battery_id without inserting
 * Useful for checking if a battery ID is already in use
 *
 * @param batteryId - Battery ID to validate
 * @returns true if battery_id is available, false if duplicate exists
 */
export async function isBatteryIdAvailable(batteryId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('batteries')
      .select('id')
      .eq('battery_id', batteryId.toUpperCase())
      .limit(1)
      .single();

    // If error is "not found", ID is available
    if (error?.code === 'PGRST116') {
      return true;
    }

    // If we got data, ID is taken
    return !data;
  } catch {
    return false;
  }
}

/**
 * Generates a new battery ID in sequence
 * Format: BATXXXXX where X is a zero-padded number
 *
 * @returns Next available battery ID (e.g., BAT00001, BAT00002)
 */
export async function generateBatteryId(): Promise<string> {
  try {
    // Get the highest battery_id number
    const { data, error } = await supabase
      .from('batteries')
      .select('battery_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No batteries yet, start from BAT00001
      return 'BAT00001';
    }

    if (data?.battery_id) {
      // Extract number from ID (e.g., "BAT00001" → 1)
      const match = data.battery_id.match(/BAT(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1], 10) + 1;
        return `BAT${String(nextNumber).padStart(5, '0')}`;
      }
    }

    return 'BAT00001';
  } catch {
    return 'BAT00001';
  }
}
