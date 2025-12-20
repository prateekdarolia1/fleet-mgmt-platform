import { z } from 'zod';

/**
 * Battery Smart ID format validation
 *
 * Pattern: ^[A-Z0-9]{8}$
 * - Exactly 8 characters
 * - Uppercase letters (A-Z) and digits (0-9)
 * - Examples: BS12AB34, BAT00001, BEE12FGH
 */

/**
 * Zod schema for Battery Smart ID validation
 * Can be used with react-hook-form and other validation libraries
 */
export const batterySmartIdSchema = z
  .string()
  .min(1, 'Battery Smart ID is required')
  .max(8, 'Battery Smart ID must be exactly 8 characters')
  .regex(
    /^[A-Z0-9]{8}$/,
    'Battery Smart ID must be exactly 8 uppercase letters and numbers (e.g., BS12AB34)'
  )
  .transform(val => val.toUpperCase().trim());

/**
 * Optional Battery Smart ID schema (for nullable fields)
 */
export const optionalBatterySmartIdSchema = z
  .string()
  .max(8, 'Battery Smart ID must be exactly 8 characters')
  .regex(
    /^[A-Z0-9]{8}$/,
    'Battery Smart ID must be exactly 8 uppercase letters and numbers (e.g., BS12AB34)'
  )
  .transform(val => val.toUpperCase().trim())
  .nullable()
  .optional();

/**
 * Validate Battery Smart ID format
 *
 * @param id - Battery Smart ID to validate
 * @returns { isValid, error } object
 *
 * @example
 * ```typescript
 * const result = validateBatterySmartId('BS12AB34');
 * if (result.isValid) {
 *   // Valid Battery Smart ID
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateBatterySmartId(id: string | null | undefined): {
  isValid: boolean;
  error: string | null;
} {
  if (!id) {
    return {
      isValid: false,
      error: 'Battery Smart ID is required'
    };
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Battery Smart ID cannot be empty'
    };
  }

  if (trimmed.length !== 8) {
    return {
      isValid: false,
      error: `Battery Smart ID must be exactly 8 characters (got ${trimmed.length})`
    };
  }

  if (!/^[A-Z0-9]{8}$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Battery Smart ID must contain only uppercase letters (A-Z) and numbers (0-9)'
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Validate Battery Smart ID with optional null/undefined support
 *
 * @param id - Battery Smart ID to validate (can be null/undefined)
 * @returns { isValid, error } object
 */
export function validateOptionalBatterySmartId(id: string | null | undefined): {
  isValid: boolean;
  error: string | null;
} {
  // NULL/undefined is valid for optional fields
  if (!id) {
    return {
      isValid: true,
      error: null
    };
  }

  return validateBatterySmartId(id);
}

/**
 * Normalize Battery Smart ID (uppercase and trim)
 *
 * @param id - Battery Smart ID to normalize
 * @returns Normalized Battery Smart ID or empty string if null
 *
 * @example
 * ```typescript
 * normalizeBatterySmartId('bs12ab34') // Returns 'BS12AB34'
 * normalizeBatterySmartId('  BS12AB34  ') // Returns 'BS12AB34'
 * normalizeBatterySmartId(null) // Returns ''
 * ```
 */
export function normalizeBatterySmartId(id: string | null | undefined): string {
  if (!id) return '';
  return id.trim().toUpperCase();
}

/**
 * Format Battery Smart ID for display
 *
 * Adds visual formatting to make it more readable
 *
 * @param id - Battery Smart ID to format
 * @returns Formatted Battery Smart ID (e.g., "BS12-AB34")
 *
 * @example
 * ```typescript
 * formatBatterySmartId('BS12AB34') // Returns 'BS12-AB34'
 * ```
 */
export function formatBatterySmartId(id: string | null | undefined): string {
  const normalized = normalizeBatterySmartId(id);
  if (!normalized) return '';

  // Format as XX##-XX##
  return `${normalized.substring(0, 4)}-${normalized.substring(4, 8)}`;
}

/**
 * Parse formatted Battery Smart ID back to raw format
 *
 * @param formatted - Formatted Battery Smart ID (e.g., "BS12-AB34")
 * @returns Raw Battery Smart ID (e.g., "BS12AB34")
 *
 * @example
 * ```typescript
 * parseBatterySmartId('BS12-AB34') // Returns 'BS12AB34'
 * ```
 */
export function parseBatterySmartId(formatted: string | null | undefined): string {
  if (!formatted) return '';
  return formatted.replace(/-/g, '').toUpperCase().trim();
}

/**
 * Check if two Battery Smart IDs are equal (case-insensitive)
 *
 * @param id1 - First Battery Smart ID
 * @param id2 - Second Battery Smart ID
 * @returns true if both IDs are the same (after normalization)
 */
export function isSameBatterySmartId(
  id1: string | null | undefined,
  id2: string | null | undefined
): boolean {
  const normalized1 = normalizeBatterySmartId(id1);
  const normalized2 = normalizeBatterySmartId(id2);

  if (!normalized1 || !normalized2) {
    return normalized1 === normalized2;
  }

  return normalized1 === normalized2;
}

/**
 * Get user-friendly error message for Battery Smart ID validation
 *
 * @param validationResult - Result from validateBatterySmartId()
 * @returns User-friendly error message
 */
export function getBatterySmartIdErrorMessage(validationResult: {
  isValid: boolean;
  error: string | null;
}): string | null {
  if (validationResult.isValid) {
    return null;
  }

  const errorMap: Record<string, string> = {
    'Battery Smart ID is required': 'Please provide a Battery Smart ID',
    'Battery Smart ID cannot be empty': 'Battery Smart ID cannot be empty',
    'must be exactly 8 characters': 'Battery Smart ID must be exactly 8 characters',
    'must contain only uppercase letters': 'Battery Smart ID must be uppercase letters and numbers only'
  };

  const error = validationResult.error || 'Invalid Battery Smart ID';

  // Try to match the error message to a user-friendly version
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }

  return error;
}

/**
 * Example Battery Smart IDs for testing
 */
export const BATTERY_SMART_ID_EXAMPLES = [
  'BS12AB34',
  'BAT00001',
  'BEE12FGH',
  'ABC12345',
  'XYZ98765'
];

/**
 * Batch validate multiple Battery Smart IDs
 *
 * @param ids - Array of Battery Smart IDs to validate
 * @returns Array of validation results with indices
 */
export function validateBatterySmartIdBatch(ids: (string | null | undefined)[]): Array<{
  index: number;
  id: string | null | undefined;
  isValid: boolean;
  error: string | null;
}> {
  return ids.map((id, index) => ({
    index,
    id,
    ...validateBatterySmartId(id)
  }));
}

/**
 * Get all invalid Battery Smart IDs from a batch
 *
 * @param ids - Array of Battery Smart IDs to validate
 * @returns Array of invalid entries
 */
export function getInvalidBatterySmartIds(
  ids: (string | null | undefined)[]
): Array<{
  index: number;
  id: string | null | undefined;
  error: string | null;
}> {
  return validateBatterySmartIdBatch(ids)
    .filter(result => !result.isValid)
    .map(({ index, id, error }) => ({ index, id, error }));
}
