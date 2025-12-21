/**
 * Vehicle-specific validation logic and field definitions
 *
 * This module defines all validation rules, transformers, and field
 * specifications for vehicle bulk imports.
 */

import type { ValidatedRow, ValidationError, FieldDefinition } from '@/types/import';
import { transformBoolean, transformColor } from '../transformers/commonTransformers';
import { calculateMaintenanceDate, isValidDateFormat, isFutureDate, transformDateDDMmmYYYY } from '../transformers/dateTransformer';

// ===== FIELD DEFINITIONS =====

/**
 * Complete field definitions for vehicle imports
 * CRITICAL: Keys MUST match exact CSV headers (including spaces, capitalization, punctuation)
 * Maps CSV columns to database fields with validation rules
 */
export const VEHICLE_FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  'Vehicle Make': {
    dbField: 'make',
    displayName: 'Vehicle Make',
    required: true,
    dataType: 'string',
    example: 'IntuitEV',
    description: 'Manufacturer/brand of the vehicle',
  },

  'Vehicle Model': {
    dbField: 'model',
    displayName: 'Vehicle Model',
    required: true,
    dataType: 'string',
    example: 'BanaEV',
    description: 'Model name/variant of the vehicle',
  },

  'Color': {
    dbField: 'color',
    displayName: 'Color',
    required: false,
    dataType: 'string',
    example: 'RED',
    description: 'Vehicle color (optional, defaults to "N/A" if missing)',
    transformer: transformColor,
  },

  'Delivery Date': {
    dbField: 'delivery_date',
    displayName: 'Delivery Date',
    required: true,
    dataType: 'date',
    example: '17 Nov 2025',
    description: 'Date when vehicle was delivered (DD MMM YYYY format)',
    validator: validateDeliveryDate,
    transformer: transformDateDDMmmYYYY,
  },

  'Vehicle Registration Number': {
    dbField: 'vehicle_number',
    displayName: 'Vehicle Registration Number',
    required: true,
    dataType: 'string',
    example: 'INT001',
    description: 'Unique vehicle registration/identification number',
    validator: validateVehicleNumber,
  },

  'Chassis Number': {
    dbField: 'chassis_number',
    displayName: 'Chassis Number',
    required: true,
    dataType: 'string',
    example: 'AS2602520',
    description: 'Unique chassis identification number',
    validator: validateChassisNumber,
  },

  'Motor Serial Number': {
    dbField: 'motor_serial_number',
    displayName: 'Motor Serial Number',
    required: true,
    dataType: 'string',
    example: 'AS2600669',
    description: 'Unique motor serial number',
    validator: validateMotorSerialNumber,
  },

  'Vendor': {
    dbField: 'vendor',
    displayName: 'Vendor',
    required: true,
    dataType: 'string',
    example: 'IntuitEV',
    description: 'Vendor/supplier of the vehicle',
  },

  'PDI Done By': {
    dbField: 'pdi_done_by',
    displayName: 'PDI Done By',
    required: true,
    dataType: 'string',
    example: 'MUNAZIR',
    description: 'Name of person who performed PDI (Pre-Delivery Inspection)',
  },

  'Registration Received?': {
    dbField: 'registration_received',
    displayName: 'Registration Received?',
    required: false,
    dataType: 'boolean',
    example: 'TRUE',
    description: 'Whether registration documents received (TRUE/FALSE/NA)',
    transformer: transformBoolean,
  },

  'Insurance Received?': {
    dbField: 'insurance_received',
    displayName: 'Insurance Received?',
    required: false,
    dataType: 'boolean',
    example: 'FALSE',
    description: 'Whether insurance documents received (TRUE/FALSE/NA)',
    transformer: transformBoolean,
  },

  'Portable Charger Received?': {
    dbField: 'portable_charger_received',
    displayName: 'Portable Charger Received?',
    required: false,
    dataType: 'boolean',
    example: 'TRUE',
    description: 'Whether portable charger received (TRUE/FALSE/NA)',
    transformer: transformBoolean,
  },

  'Vehicle Type': {
    dbField: 'vehicle_type',
    displayName: 'Vehicle Type',
    required: true,
    dataType: 'enum',
    enumValues: ['High Speed', 'Low Speed'],
    example: 'Low Speed',
    description: 'Type of vehicle (High Speed or Low Speed)',
  },

  'Battery Type': {
    dbField: 'battery_type',
    displayName: 'Battery Type',
    required: true,
    dataType: 'enum',
    enumValues: ['Fixed', 'Swappable'],
    example: 'Swappable',
    description: 'Battery configuration (Fixed or Swappable)',
  },

  'VEHICLE ID': {
    dbField: null, // Don't map to database (may be duplicate of vehicle_number)
    displayName: 'VEHICLE ID',
    required: false,
    dataType: 'string',
    example: 'INT001',
    description: 'Optional vehicle ID field (not stored in database if same as registration number)',
  },
};

// ===== FIELD VALIDATORS =====

/**
 * Validates vehicle number (registration number)
 */
function validateVehicleNumber(value: any): ValidationError | null {
  const str = String(value || '').trim();

  if (!str) {
    return {
      field: 'vehicle_number',
      severity: 'error',
      code: 'REQUIRED_FIELD',
      message: 'Vehicle number is required',
    };
  }

  // Check minimum length
  if (str.length < 3) {
    return {
      field: 'vehicle_number',
      severity: 'error',
      code: 'INVALID_LENGTH',
      message: 'Vehicle number must be at least 3 characters',
    };
  }

  return null;
}

/**
 * Validates chassis number
 */
function validateChassisNumber(value: any): ValidationError | null {
  const str = String(value || '').trim();

  if (!str) {
    return {
      field: 'chassis_number',
      severity: 'error',
      code: 'REQUIRED_FIELD',
      message: 'Chassis number is required',
    };
  }

  // Warn if not standard VIN length (17 characters)
  if (str.length !== 17 && str.length > 0) {
    return {
      field: 'chassis_number',
      severity: 'warning',
      code: 'NONSTANDARD_LENGTH',
      message: 'Chassis number is not standard VIN length (17 characters)',
      suggestion: `Current length: ${str.length}. Standard VINs are 17 characters.`,
    };
  }

  return null;
}

/**
 * Validates motor serial number
 */
function validateMotorSerialNumber(value: any): ValidationError | null {
  const str = String(value || '').trim();

  if (!str) {
    return {
      field: 'motor_serial_number',
      severity: 'error',
      code: 'REQUIRED_FIELD',
      message: 'Motor serial number is required',
    };
  }

  // Check minimum length
  if (str.length < 3) {
    return {
      field: 'motor_serial_number',
      severity: 'error',
      code: 'INVALID_LENGTH',
      message: 'Motor serial number must be at least 3 characters',
    };
  }

  return null;
}

/**
 * Validates delivery date
 */
function validateDeliveryDate(value: any): ValidationError | null {
  const str = String(value || '').trim();

  if (!str) {
    return {
      field: 'delivery_date',
      severity: 'error',
      code: 'REQUIRED_FIELD',
      message: 'Delivery date is required',
    };
  }

  // Check format
  if (!isValidDateFormat(str)) {
    return {
      field: 'delivery_date',
      severity: 'error',
      code: 'INVALID_DATE_FORMAT',
      message: 'Delivery date must be in YYYY-MM-DD format',
      suggestion: `Got: "${str}". Expected format: 2024-01-15`,
    };
  }

  // Warn if future date
  if (isFutureDate(str)) {
    return {
      field: 'delivery_date',
      severity: 'warning',
      code: 'FUTURE_DATE',
      message: 'Delivery date is in the future',
      suggestion: 'Please verify this is correct',
    };
  }

  return null;
}

// ===== MAIN VALIDATION FUNCTION =====

/**
 * Validates a single vehicle row from CSV
 *
 * Performs comprehensive validation including:
 * - Required field checking
 * - Data type validation
 * - Enum validation
 * - Custom field validators
 * - Data transformation
 * - Derived field calculation (next_maintenance_date)
 *
 * @param row - Raw CSV row data
 * @param rowIndex - Row number in CSV (0-indexed)
 * @returns ValidatedRow with status, errors, warnings, and transformed data
 */
export function validateVehicleRow(
  row: Record<string, any>,
  rowIndex: number
): ValidatedRow {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const transformedData: Record<string, any> = {};

  // Validate each field
  for (const [fieldName, definition] of Object.entries(VEHICLE_FIELD_DEFINITIONS)) {
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

    // Apply transformer if defined
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

  // Calculate derived fields

  // 1. Calculate next_maintenance_date from delivery_date
  if (transformedData.delivery_date && errors.length === 0) {
    try {
      transformedData.next_maintenance_date = calculateMaintenanceDate(transformedData.delivery_date);
    } catch (err) {
      errors.push({
        field: 'Delivery Date',  // Use CSV header for error reporting
        severity: 'error',
        code: 'MAINTENANCE_DATE_CALC_FAILED',
        message: 'Failed to calculate maintenance date',
        suggestion: 'Please verify delivery date is valid',
      });
    }
  }

  // 2. Set default status (always "Ready for Deployment" for new vehicles)
  transformedData.status = 'Ready for Deployment';

  // 3. Set null values for optional fields not in CSV
  transformedData.rider_id = null;
  transformedData.rider_name = null;
  transformedData.rental_start_date = null;
  transformedData.rental_end_date = null;
  transformedData.location = null;

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
 * Validates multiple vehicle rows in batch
 *
 * @param rows - Array of CSV row data
 * @returns Array of ValidatedRow objects
 */
export function validateVehicleRows(rows: Record<string, any>[]): ValidatedRow[] {
  return rows.map((row, index) => validateVehicleRow(row, index));
}
