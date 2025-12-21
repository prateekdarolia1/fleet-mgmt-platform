/**
 * Vehicle CSV template generation
 *
 * Generates downloadable CSV templates with:
 * - Correct headers
 * - Sample data rows
 * - Documentation/instructions
 */

import type { CSVTemplate } from '@/types/import';
import { VEHICLE_FIELD_DEFINITIONS } from '../validation/vehicleValidator';

/**
 * Generates vehicle import CSV template with headers and sample data
 *
 * @returns CSVTemplate object ready for download
 */
export function generateVehicleTemplate(): CSVTemplate {
  // Extract headers from field definitions
  const headers = Object.values(VEHICLE_FIELD_DEFINITIONS).map(
    (def) => def.displayName
  );

  // Sample row 1: Perfect example with all fields filled
  const sampleRow1 = [
    'INT001',          // Vehicle Number
    'AS2602520',       // Chassis Number
    'AS2600669',       // Motor Serial Number
    'IntuitEV',        // Make
    'BanaEV',          // Model
    'RED',             // Color
    '2025-11-17',      // Delivery Date (YYYY-MM-DD)
    'Low Speed',       // Vehicle Type
    'Swappable',       // Battery Type
    'IntuitEV',        // Vendor
    'MUNAZIR',         // PDI Done By
    'TRUE',            // Registration Received
    'TRUE',            // Insurance Received
    'FALSE',           // Portable Charger Received
  ];

  // Sample row 2: Example with missing optional field (color) and NA booleans
  const sampleRow2 = [
    'INT002',          // Vehicle Number
    'AS2602528',       // Chassis Number
    'AS2600623',       // Motor Serial Number
    'IntuitEV',        // Make
    'BanaEV',          // Model
    'N/A',             // Color (showing N/A for missing)
    '2025-11-17',      // Delivery Date
    'Low Speed',       // Vehicle Type
    'Swappable',       // Battery Type
    'IntuitEV',        // Vendor
    'MUNAZIR',         // PDI Done By
    'NA',              // Registration Received (showing NA)
    'FALSE',           // Insurance Received
    'TRUE',            // Portable Charger Received
  ];

  const sampleRows = [sampleRow1, sampleRow2];

  const instructions = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                   VEHICLE IMPORT TEMPLATE - INSTRUCTIONS                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

## FILE REQUIREMENTS

• Format: CSV (Comma-separated values)
• Encoding: UTF-8 (save with UTF-8 encoding in Excel/Sheets)
• Max Size: 5 MB
• Max Rows: 10,000 (recommended batch size: 100-500 rows)

═══════════════════════════════════════════════════════════════════════════════

## FIELD GUIDELINES

### REQUIRED FIELDS (must be filled)

1. Vehicle Number
   • Unique vehicle registration/identification number
   • Example: INT001, DL01AB1234
   • Minimum 3 characters

2. Chassis Number
   • Unique chassis identification number
   • Example: AS2602520
   • Standard VIN: 17 characters (warning shown if different)

3. Motor Serial Number
   • Unique motor serial number
   • Example: AS2600669
   • Minimum 3 characters

4. Make
   • Manufacturer/brand name
   • Example: IntuitEV, Ather, Ola Electric

5. Model
   • Model name/variant
   • Example: BanaEV, 450X, S1 Pro

6. Delivery Date
   • CRITICAL: Must use YYYY-MM-DD format
   • Example: 2025-11-17 (November 17, 2025)
   • Used to calculate next maintenance date automatically

7. Vehicle Type
   • Must be EXACTLY one of: "High Speed" or "Low Speed"
   • Case-sensitive, use exact spelling

8. Battery Type
   • Must be EXACTLY one of: "Fixed" or "Swappable"
   • Case-sensitive, use exact spelling

9. Vendor
   • Vendor/supplier name
   • Example: IntuitEV, Ather Energy

10. PDI Done By
    • Name of person who performed Pre-Delivery Inspection
    • Example: MUNAZIR, John Doe

═══════════════════════════════════════════════════════════════════════════════

### OPTIONAL FIELDS

1. Color
   • Vehicle color
   • Leave blank or use "N/A" if not available
   • Will default to "N/A" if missing
   • Example: RED, BLUE, GREEN, N/A

2. Registration Received
   • Whether registration documents received
   • Values: TRUE, FALSE, YES, NO, NA, empty
   • "NA" or empty → FALSE
   • Example: TRUE, FALSE, NA

3. Insurance Received
   • Whether insurance documents received
   • Values: TRUE, FALSE, YES, NO, NA, empty
   • "NA" or empty → FALSE

4. Portable Charger Received
   • Whether portable charger received
   • Values: TRUE, FALSE, YES, NO, NA, empty
   • "NA" or empty → FALSE

═══════════════════════════════════════════════════════════════════════════════

## AUTOMATIC CALCULATIONS

### Next Maintenance Date (Auto-calculated)
DO NOT include this column - it will be calculated automatically!

Calculation Rule:
• If delivery_date + 90 days is in the future → use that date
• If delivery_date + 90 days is in the past → use today + 7 days

Examples:
• Delivered: 2024-12-01 (Current: 2024-12-21)
  → Maintenance: 2025-03-01 (90 days from delivery)

• Delivered: 2024-01-01 (Current: 2024-12-21)
  → Maintenance: 2024-12-28 (today + 7 days, overdue case)

═══════════════════════════════════════════════════════════════════════════════

## DATA QUALITY TIPS

✓ Remove duplicate vehicle numbers before upload
✓ Ensure all required fields are filled
✓ Use consistent date format (YYYY-MM-DD)
✓ Double-check chassis and motor serial numbers (must be unique)
✓ Use exact spelling for enums (Vehicle Type, Battery Type)
✓ Save file as UTF-8 CSV (not Excel format)

═══════════════════════════════════════════════════════════════════════════════

## VALIDATION RULES

• Vehicle Number, Chassis Number, Motor Serial Number: Must be unique (no duplicates)
• Delivery Date: Cannot use DD/MM/YYYY or MM/DD/YYYY - must be YYYY-MM-DD
• Vehicle Type: Only "High Speed" or "Low Speed" (case-sensitive)
• Battery Type: Only "Fixed" or "Swappable" (case-sensitive)
• Booleans: TRUE/FALSE/YES/NO/NA/empty (case-insensitive)

═══════════════════════════════════════════════════════════════════════════════

## NEXT STEPS

1. Fill in your vehicle data below the sample rows
2. Delete the sample rows (row 2 and 3)
3. Save as CSV with UTF-8 encoding
4. Upload in the import wizard

═══════════════════════════════════════════════════════════════════════════════

### SAMPLE DATA (DELETE BEFORE UPLOADING) ###
Row 1: Perfect example with all required fields
Row 2: Example with missing optional field (Color = N/A) and NA booleans

After this template, add your actual vehicle data starting from row 4.
Remember to delete rows 2-3 (the sample data) before uploading!

═══════════════════════════════════════════════════════════════════════════════
`.trim();

  return {
    filename: 'vehicle_import_template.csv',
    headers,
    sampleRows,
    instructions,
  };
}
