/**
 * Battery CSV template generator
 *
 * Generates downloadable template with proper headers,
 * sample data, and inline documentation.
 */

import type { CSVTemplate } from '@/types/import';
import { BATTERY_FIELD_DEFINITIONS } from '../validation/batteryValidator';

/**
 * Generates battery import template
 */
export function generateBatteryTemplate(): CSVTemplate {
  const headers = Object.values(BATTERY_FIELD_DEFINITIONS).map(def => def.displayName);

  // Sample row 1: All fields populated
  const sampleRow1 = [
    'B708523',           // Battery ID
    'Battery Smart',     // Service Provider
    'NMV02',            // Zone ID
    'B2B',              // Battery Plan
    'Noida',            // Location
    '18/07/2025',       // Retrofitment Date (DD/MM/YYYY)
    'USC-1895',         // USC ID
    'D146301',          // Battery Smart ID
  ];

  // Sample row 2: With optional fields as N/A
  const sampleRow2 = [
    'B654748',           // Battery ID
    'Battery Smart',     // Service Provider
    'NMV02',            // Zone ID
    'B2B',              // Battery Plan
    'Noida',            // Location
    '28/11/2025',       // Retrofitment Date
    'N/A',              // USC ID (optional)
    'D231228',          // Battery Smart ID
  ];

  const instructions = `
# BATTERY IMPORT TEMPLATE

## Required Fields:
- Battery ID (Lilypad Internal ID): Unique internal battery identifier (Format: B followed by digits, e.g., B708523)
- Service Provider: Must be "Battery Smart" or "OTHER"

## Optional Fields:
- Zone ID: Operational zone identifier (e.g., NMV02)
- Battery Plan: Plan type - "D2D", "B2B", or "OTHER"
- Location: Battery location/city (e.g., "NOIDA")
- Retrofitment Date: Date of battery retrofitment in DD/MM/YYYY format (e.g., 18/07/2025)
- USC ID: Universal Service Code (use "N/A" if not applicable)
- Battery Smart ID: External Battery Smart company identifier (Format: D followed by digits, e.g., D231518)

## Important Notes:
- Date format: Use DD/MM/YYYY (e.g., 18/07/2025)
- Service Provider variations accepted: "Battery Smart", "BatterySmart", "BATTERY_SMART" all work
- Optional fields can be left blank or use "N/A"
- Battery ID format: B followed by digits (non-standard formats will show warnings)
- Battery Smart ID format: D followed by digits (non-standard formats will show warnings)
- Status will be automatically set to "UNMAPPED" for new batteries

## Validation Rules:
- Battery ID is required and must be unique
- Future retrofitment dates will show warnings
- All data will be validated before import
- Only 100% error-free rows will be imported
- Rows with warnings can be imported (user decision)

## Examples:
Row 1 (All fields): B708523,Battery Smart,NMV02,B2B,Noida,18/07/2025,USC-1895,D146301
Row 2 (Optional N/A): B654748,Battery Smart,NMV02,B2B,Noida,28/11/2025,N/A,D231228
`.trim();

  return {
    filename: 'battery_import_template.csv',
    headers,
    sampleRows: [sampleRow1, sampleRow2],
    instructions,
  };
}
