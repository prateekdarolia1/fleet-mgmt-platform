/**
 * Common data transformation functions used across entity types
 *
 * These transformers normalize and convert raw CSV values into
 * database-ready formats with consistent handling of edge cases.
 */

/**
 * Transforms various boolean representations into actual boolean values
 *
 * Handles:
 * - "NA" → false (CSV convention for missing boolean)
 * - Empty/null → false
 * - "TRUE", "YES", "1" → true
 * - "FALSE", "NO", "0" → false
 *
 * @param value - Any value from CSV that should be a boolean
 * @returns Normalized boolean value
 *
 * @example
 * transformBoolean("TRUE")  // → true
 * transformBoolean("NA")    // → false
 * transformBoolean("")      // → false
 * transformBoolean("YES")   // → true
 */
export function transformBoolean(value: any): boolean {
  // Handle actual boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Normalize to uppercase string
  const str = String(value).trim().toUpperCase();

  // False cases (including "NA" convention)
  const falseCases = ['NA', '', 'NULL', 'UNDEFINED', 'FALSE', 'NO', '0', 'N'];
  if (falseCases.includes(str)) {
    return false;
  }

  // True cases
  const trueCases = ['TRUE', 'YES', '1', 'Y'];
  if (trueCases.includes(str)) {
    return true;
  }

  // Default to false for unknown values
  return false;
}

/**
 * Transforms color values with "N/A" default for missing values
 *
 * Ensures consistent handling of missing color data per business requirements.
 *
 * @param value - Color value from CSV
 * @returns Color string or "N/A" if missing
 *
 * @example
 * transformColor("Blue")     // → "Blue"
 * transformColor("")         // → "N/A"
 * transformColor(null)       // → "N/A"
 * transformColor(undefined)  // → "N/A"
 */
export function transformColor(value: any): string {
  // Handle null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  // Normalize string
  const str = String(value).trim();

  // Return "N/A" for empty strings after trimming
  if (str === '' || str.toUpperCase() === 'NA' || str.toUpperCase() === 'N/A') {
    return 'N/A';
  }

  // Return the color value
  return str;
}

/**
 * Transforms and validates date strings
 *
 * Accepts various date formats and normalizes to YYYY-MM-DD format.
 * Handles both ISO date strings and Date objects.
 *
 * @param value - Date value from CSV
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 *
 * @example
 * transformDate("2024-01-15")           // → "2024-01-15"
 * transformDate("15/01/2024")           // → null (invalid format)
 * transformDate(new Date("2024-01-15")) // → "2024-01-15"
 */
export function transformDate(value: any): string | null {
  if (!value) {
    return null;
  }

  // Handle Date objects
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().split('T')[0];
  }

  // Handle string dates
  const str = String(value).trim();
  const date = new Date(str);

  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }

  // Return ISO format (YYYY-MM-DD)
  return date.toISOString().split('T')[0];
}

/**
 * Normalizes string values by trimming whitespace and converting to uppercase
 *
 * Useful for IDs, registration numbers, chassis numbers, etc.
 *
 * @param value - String value to normalize
 * @returns Uppercase trimmed string or empty string if null/undefined
 *
 * @example
 * normalizeString("  dl01ab1234  ") // → "DL01AB1234"
 * normalizeString(null)              // → ""
 */
export function normalizeString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim().toUpperCase();
}

/**
 * Normalizes string values while preserving case
 *
 * Only trims whitespace, useful for names and descriptive text.
 *
 * @param value - String value to normalize
 * @returns Trimmed string or empty string if null/undefined
 *
 * @example
 * normalizeStringPreserveCase("  John Doe  ") // → "John Doe"
 * normalizeStringPreserveCase(null)           // → ""
 */
export function normalizeStringPreserveCase(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

/**
 * Transforms numeric values with proper type checking
 *
 * @param value - Value that should be a number
 * @returns Number or null if invalid
 *
 * @example
 * transformNumber("123")   // → 123
 * transformNumber("abc")   // → null
 * transformNumber("")      // → null
 */
export function transformNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = Number(value);

  if (isNaN(num)) {
    return null;
  }

  return num;
}
