/**
 * Battery-specific validation logic and field definitions
 *
 * Validates battery imports with proper field transformations
 * and business rules.
 */

import type { ValidatedRow, ValidationError, FieldDefinition } from '@/types/import';
import { isValidDateFormat } from '../transformers/dateTransformer';

// ===== FIELD DEFINITIONS =====

/**
 * Complete field definitions for battery imports
 */
export const BATTERY_FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  'Battery ID (Lilypad Internal ID)': {
    dbField: 'battery_id',
    displayName: 'Battery ID (Lilypad Internal ID)',
    required: true,
    dataType: 'string',
    example: 'B708523',
    description: 'Unique internal battery identifier (Lilypad system)',
    validator: validateBatteryId,
    transformer: (val) => String(val || '').trim().toUpperCase(),
  },

  'Service Provider': {
    dbField: 'service_provider',
    displayName: 'Service Provider',
    required: true,
    dataType: 'enum',
    enumValues: ['BATTERY_SMART', 'OTHER'],
    example: 'BATTERY_SMART',
    description: 'Battery service provider',
    transformer: transformServiceProvider,
  },

  'Zone ID (Optional)': {
    dbField: 'zone_id',
    displayName: 'Zone ID (Optional)',
    required: false,
    dataType: 'string',
    example: 'NMV02',
    description: 'Operational zone identifier',
    transformer: (val) => val ? String(val).trim().toUpperCase() : null,
  },

  'Battery Plan (Optional)': {
    dbField: 'battery_plan',
    displayName: 'Battery Plan (Optional)',
    required: false,
    dataType: 'enum',
    enumValues: ['D2D', 'B2B', 'OTHER'],
    example: 'B2B',
    description: 'Battery rental plan type',
    transformer: (val) => val ? String(val).trim().toUpperCase() : null,
  },

  'Location (Optional)': {
    dbField: 'location',
    displayName: 'Location (Optional)',
    required: false,
    dataType: 'enum',
    enumValues: ['NOIDA', 'OTHER'],
    example: 'NOIDA',
    description: 'Battery location/city',
    transformer: (val) => val ? String(val).trim().toUpperCase() : null,
  },

  'Retrofitment Date (Optional)': {
    dbField: 'retrofit_date',
    displayName: 'Retrofitment Date (Optional)',
    required: false,
    dataType: 'date',
    example: '18/07/2025',
    description: 'Date of battery retrofitment (DD/MM/YYYY)',
    validator: validateRetrofitDate,
    transformer: transformDateDDMMYYYY,
  },

  'USC ID (Optional)': {
    dbField: 'usc_id',
    displayName: 'USC ID (Optional)',
    required: false,
    dataType: 'string',
    example: 'USC-1895',
    description: 'Universal Service Code',
    transformer: (val) => {
      if (!val || String(val).trim().toUpperCase() === 'N/A') return null;
      return String(val).trim();
    },
  },

  'Batterysmart_ID': {
    dbField: 'battery_smart_id',
    displayName: 'Batterysmart_ID',
    required: false,
    dataType: 'string',
    example: 'D231518',
    description: 'External Battery Smart company identifier',
    validator: validateBatterySmartId,
    transformer: (val) => val ? String(val).trim().toUpperCase() : null,
  },
};

// ===== TRANSFORMERS =====

/**
 * Transforms service provider to match database enum
 */
function transformServiceProvider(value: any): string {
  const str = String(value || '').trim();

  // Normalize variations
  if (str.toLowerCase().includes('battery smart') ||
      str.toLowerCase().includes('batterysmart')) {
    return 'BATTERY_SMART';
  }

  if (str.toUpperCase() === 'OTHER') {
    return 'OTHER';
  }

  return str.toUpperCase();
}

/**
 * Transforms DD/MM/YYYY date format to YYYY-MM-DD
 */
function transformDateDDMMYYYY(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str || str.toUpperCase() === 'N/A') return null;

  // Try DD/MM/YYYY format first
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = str.match(ddmmyyyyRegex);

  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD format (already correct)
  if (isValidDateFormat(str)) {
    return str;
  }

  return null;
}

// ===== VALIDATORS =====

/**
 * Validates battery ID format
 */
function validateBatteryId(value: any): ValidationError | null {
  const str = String(value || '').trim();

  if (!str) {
    return {
      field: 'battery_id',
      severity: 'error',
      code: 'REQUIRED_FIELD',
      message: 'Battery ID is required',
    };
  }

  // Check if it matches expected pattern (starts with B followed by digits)
  if (!/^B\d+$/.test(str.toUpperCase())) {
    return {
      field: 'battery_id',
      severity: 'warning',
      code: 'NONSTANDARD_FORMAT',
      message: 'Battery ID format is non-standard',
      suggestion: 'Expected format: B followed by digits (e.g., B708523)',
    };
  }

  return null;
}

/**
 * Validates retrofit date
 */
function validateRetrofitDate(value: any): ValidationError | null {
  if (!value) return null; // Optional field

  const transformed = transformDateDDMMYYYY(value);

  if (!transformed) {
    return {
      field: 'retrofit_date',
      severity: 'error',
      code: 'INVALID_DATE_FORMAT',
      message: 'Invalid date format',
      suggestion: 'Use DD/MM/YYYY or YYYY-MM-DD format',
    };
  }

  // Warn if future date
  const date = new Date(transformed);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date > today) {
    return {
      field: 'retrofit_date',
      severity: 'warning',
      code: 'FUTURE_DATE',
      message: 'Retrofitment date is in the future',
    };
  }

  return null;
}

/**
 * Validates Battery Smart ID
 */
function validateBatterySmartId(value: any): ValidationError | null {
  if (!value) return null; // Optional field

  const str = String(value).trim();

  // Check if it matches expected pattern (D followed by digits)
  if (!/^D\d+$/.test(str.toUpperCase())) {
    return {
      field: 'battery_smart_id',
      severity: 'warning',
      code: 'NONSTANDARD_FORMAT',
      message: 'Battery Smart ID format is non-standard',
      suggestion: 'Expected format: D followed by digits (e.g., D231518)',
    };
  }

  return null;
}

// ===== MAIN VALIDATION FUNCTION =====

/**
 * Validates a single battery row from CSV
 */
export function validateBatteryRow(
  row: Record<string, any>,
  rowIndex: number
): ValidatedRow {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const transformedData: Record<string, any> = {};

  // Validate each field
  for (const [fieldName, definition] of Object.entries(BATTERY_FIELD_DEFINITIONS)) {
    const rawValue = row[fieldName];

    // Check required fields
    if (definition.required) {
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        errors.push({
          field: fieldName,
          severity: 'error',
          code: 'REQUIRED_FIELD',
          message: `${definition.displayName} is required`,
        });
        continue;
      }
    }

    // Apply transformer
    const transformedValue = definition.transformer
      ? definition.transformer(rawValue)
      : rawValue;

    // Validate enums
    if (definition.dataType === 'enum' && transformedValue) {
      if (!definition.enumValues?.includes(transformedValue)) {
        errors.push({
          field: fieldName,
          severity: 'error',
          code: 'INVALID_ENUM',
          message: `${definition.displayName} must be one of: ${definition.enumValues?.join(', ')}`,
          suggestion: `Got: "${transformedValue}"`,
        });
      }
    }

    // Run custom validator
    if (definition.validator && transformedValue !== null && transformedValue !== undefined) {
      const validationError = definition.validator(transformedValue);
      if (validationError) {
        if (validationError.severity === 'error') {
          errors.push(validationError);
        } else {
          warnings.push(validationError);
        }
      }
    }

    // Store using database field name (dbField) not CSV header
    if (definition.dbField) {
      transformedData[definition.dbField] = transformedValue;
    }
  }

  // Set default status (UNMAPPED for new batteries)
  transformedData.status = 'UNMAPPED';

  // Determine row status
  let status: 'valid' | 'warning' | 'invalid' = 'valid';
  if (errors.length > 0) {
    status = 'invalid';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return {
    rowIndex,
    originalData: row,
    transformedData,
    errors,
    warnings,
    status,
  };
}

/**
 * Validates multiple battery rows in batch
 */
export function validateBatteryRows(rows: Record<string, any>[]): ValidatedRow[] {
  return rows.map((row, index) => validateBatteryRow(row, index));
}
