/**
 * CSV parsing utilities using PapaParse
 *
 * Handles file validation, encoding detection, and parsing of CSV files
 * for the bulk import system.
 */

import Papa from 'papaparse';
import type { ParsedRow } from '@/types/import';

// ===== CONSTANTS =====

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/csv',
  'text/plain',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ===== TYPES =====

export interface CSVParseResult {
  success: boolean;
  data?: ParsedRow[];
  headers?: string[];
  error?: string;
  encoding?: string;
  rowCount?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// ===== FILE VALIDATION =====

/**
 * Validates uploaded file before parsing
 *
 * Checks:
 * - File type (must be CSV)
 * - File size (must be under 5MB)
 * - File extension
 *
 * @param file - Uploaded file to validate
 * @returns Validation result with error message if invalid
 */
export function validateCSVFile(file: File): FileValidationResult {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      error: 'File must have .csv extension',
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
    return {
      valid: false,
      error: 'Only CSV files are allowed',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed size (5 MB)`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Parses CSV file and returns structured data
 *
 * Features:
 * - Automatic header detection
 * - UTF-8 encoding support
 * - Row indexing
 * - Empty row filtering
 * - Type inference disabled (keep as strings for validation layer)
 *
 * @param file - CSV file to parse
 * @returns Promise with parse result containing data, headers, and metadata
 */
export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  // Validate file first
  const validation = validateCSVFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true, // First row is header
      skipEmptyLines: true, // Skip empty lines
      transformHeader: (header: string) => header.trim(), // Trim header names
      transform: (value: string) => value, // Keep as strings (no type conversion)
      encoding: 'UTF-8',
      complete: (results) => {
        // Check for parse errors
        if (results.errors.length > 0) {
          const errorMessages = results.errors
            .slice(0, 3) // Show first 3 errors
            .map((err) => `Row ${err.row}: ${err.message}`)
            .join('; ');

          resolve({
            success: false,
            error: `CSV parse errors: ${errorMessages}`,
          });
          return;
        }

        // Check if we have data
        if (!results.data || results.data.length === 0) {
          resolve({
            success: false,
            error: 'CSV file contains no data rows',
          });
          return;
        }

        // Check if we have headers
        if (!results.meta.fields || results.meta.fields.length === 0) {
          resolve({
            success: false,
            error: 'CSV file has no header row',
          });
          return;
        }

        // Convert to ParsedRow format with indices
        const parsedData: ParsedRow[] = results.data.map((row: any, index: number) => ({
          rowIndex: index,
          data: row,
        }));

        resolve({
          success: true,
          data: parsedData,
          headers: results.meta.fields,
          encoding: 'UTF-8',
          rowCount: parsedData.length,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Failed to parse CSV: ${error.message}`,
        });
      },
    });
  });
}

/**
 * Detects CSV delimiter by analyzing the first few rows
 *
 * @param file - CSV file to analyze
 * @returns Detected delimiter character
 */
export async function detectDelimiter(file: File): Promise<string> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      preview: 5, // Only parse first 5 rows
      complete: (results) => {
        const delimiter = results.meta.delimiter || ',';
        resolve(delimiter);
      },
      error: () => {
        resolve(','); // Default to comma
      },
    });
  });
}

/**
 * Previews first few rows of CSV without full parsing
 *
 * Useful for showing user a preview before full import
 *
 * @param file - CSV file to preview
 * @param rowCount - Number of rows to preview (default: 5)
 * @returns Promise with preview data
 */
export async function previewCSV(
  file: File,
  rowCount: number = 5
): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: rowCount,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            success: false,
            error: 'Failed to preview CSV',
          });
          return;
        }

        const parsedData: ParsedRow[] = results.data.map((row: any, index: number) => ({
          rowIndex: index,
          data: row,
        }));

        resolve({
          success: true,
          data: parsedData,
          headers: results.meta.fields,
          rowCount: parsedData.length,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Preview failed: ${error.message}`,
        });
      },
    });
  });
}

/**
 * Checks if CSV headers match expected fields
 *
 * @param headers - Headers from CSV
 * @param expectedHeaders - Expected header names
 * @returns Object with matching status and missing/extra headers
 */
export function validateHeaders(
  headers: string[],
  expectedHeaders: string[]
): {
  valid: boolean;
  missingHeaders: string[];
  extraHeaders: string[];
} {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const normalizedExpected = expectedHeaders.map((h) => h.trim().toLowerCase());

  const missingHeaders = normalizedExpected.filter(
    (h) => !normalizedHeaders.includes(h)
  );

  const extraHeaders = normalizedHeaders.filter(
    (h) => !normalizedExpected.includes(h)
  );

  return {
    valid: missingHeaders.length === 0,
    missingHeaders,
    extraHeaders,
  };
}
