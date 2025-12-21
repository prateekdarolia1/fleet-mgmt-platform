/**
 * CSV Injection Prevention Utilities
 *
 * Implements OWASP guidelines for CSV injection prevention
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * Dangerous patterns that indicate potential CSV injection
 */
const DANGEROUS_PATTERNS = [
  /cmd/i,
  /powershell/i,
  /DDE/i,
  /WEBSERVICE/i,
  /HYPERLINK/i,
  /IMPORTXML/i,
  /IMPORTHTML/i,
  /IMPORTDATA/i,
  /\|\s*'\/c/i,
  /exec/i,
];

/**
 * Detects if a value contains dangerous patterns
 */
export function detectDangerousPatterns(value: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Removes all control characters from a string
 * Control characters: ASCII 0x00-0x1F and 0x7F-0x9F
 */
export function removeControlCharacters(value: string): string {
  return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Sanitizes a value for safe CSV export
 * Prevents CSV injection (formula injection) attacks
 */
export function sanitizeForCSVExport(value: any): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Step 1: Remove control characters
  str = removeControlCharacters(str);

  // Step 2: Check for dangerous patterns
  if (detectDangerousPatterns(str)) {
    console.warn('[CSV Security] Dangerous pattern detected:', str.substring(0, 50));
    str = `'${str}`;
  }

  // Step 3: Prefix formula characters (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return str;
}

/**
 * Escapes a CSV cell for proper formatting
 * Combines sanitization with CSV escaping rules
 */
export function escapeCSVCell(cell: string): string {
  // First sanitize for injection
  let sanitized = sanitizeForCSVExport(cell);

  // Then apply CSV escaping
  if (sanitized.includes('"')) {
    sanitized = sanitized.replace(/"/g, '""');
  }

  // Wrap in quotes if contains comma, newline, or quotes
  if (/[,\n\r"]/.test(sanitized)) {
    sanitized = `"${sanitized}"`;
  }

  return sanitized;
}
