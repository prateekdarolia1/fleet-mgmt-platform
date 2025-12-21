/**
 * Validation engine orchestrator
 *
 * Classifies validated rows into buckets and provides summary statistics.
 */

import type { ValidatedRow, ValidationResults } from '@/types/import';

/**
 * Classifies validated rows into valid/warning/invalid buckets
 *
 * Classification rules:
 * - **Invalid**: Has one or more errors (blocks import)
 * - **Warning**: Has warnings but zero errors (can import)
 * - **Valid**: Has no errors and no warnings (clean)
 *
 * @param validatedRows - Array of validated rows
 * @returns Classified validation results with counts
 */
export function classifyValidationResults(
  validatedRows: ValidatedRow[]
): ValidationResults {
  const validRows: ValidatedRow[] = [];
  const warningRows: ValidatedRow[] = [];
  const invalidRows: ValidatedRow[] = [];

  for (const row of validatedRows) {
    if (row.status === 'invalid') {
      invalidRows.push(row);
    } else if (row.status === 'warning') {
      warningRows.push(row);
    } else {
      validRows.push(row);
    }
  }

  return {
    totalRows: validatedRows.length,
    validRows,
    warningRows,
    invalidRows,
    validCount: validRows.length,
    warningCount: warningRows.length,
    invalidCount: invalidRows.length,
  };
}

/**
 * Filters out invalid rows, keeping only valid and warning rows
 *
 * These are the rows that can proceed to import.
 *
 * @param validationResults - Validation results to filter
 * @returns Only valid and warning rows
 */
export function getImportableRows(
  validationResults: ValidationResults
): ValidatedRow[] {
  return [
    ...validationResults.validRows,
    ...validationResults.warningRows,
  ];
}

/**
 * Gets all error messages from invalid rows
 *
 * @param validationResults - Validation results
 * @returns Array of error messages with row indices
 */
export function getAllErrors(
  validationResults: ValidationResults
): Array<{
  rowIndex: number;
  field: string;
  message: string;
  code: string;
}> {
  const errors: Array<{
    rowIndex: number;
    field: string;
    message: string;
    code: string;
  }> = [];

  for (const row of validationResults.invalidRows) {
    for (const error of row.errors) {
      errors.push({
        rowIndex: row.rowIndex,
        field: error.field,
        message: error.message,
        code: error.code,
      });
    }
  }

  return errors;
}

/**
 * Gets summary statistics for validation results
 *
 * @param validationResults - Validation results
 * @returns Summary object
 */
export function getValidationSummary(
  validationResults: ValidationResults
): {
  totalRows: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  canProceed: boolean;
  errorRate: number;
  warningRate: number;
} {
  const canProceed = validationResults.invalidCount === 0;
  const errorRate = (validationResults.invalidCount / validationResults.totalRows) * 100;
  const warningRate = (validationResults.warningCount / validationResults.totalRows) * 100;

  return {
    totalRows: validationResults.totalRows,
    validCount: validationResults.validCount,
    warningCount: validationResults.warningCount,
    invalidCount: validationResults.invalidCount,
    canProceed,
    errorRate: parseFloat(errorRate.toFixed(2)),
    warningRate: parseFloat(warningRate.toFixed(2)),
  };
}
