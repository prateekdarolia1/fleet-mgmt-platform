# Vehicle Import System - Complete Analysis

## Problem Summary

**All 65 rows are failing validation because there is a COMPLETE MISMATCH between:**

1. The actual CSV file headers from `import_data/Bulk_Vehicle.csv`
2. The validator field definitions in `vehicleValidator.ts`
3. The Supabase database column names

---

## 1. Supabase Database Columns (Actual Table Structure)

Based on `/supabase/migrations/` and `/src/integrations/supabase/types.ts`:

```bash
vehicle_number              (TEXT, required, unique)
make                        (TEXT, required)
model                       (TEXT, required)
color                       (TEXT, required)
chassis_number              (TEXT, required, unique)
motor_serial_number         (TEXT, required, unique)
delivery_date               (DATE, required)
vendor                      (TEXT, required)
pdi_done_by                 (TEXT, required)
registration_received       (BOOLEAN, required, default: false)
insurance_received          (BOOLEAN, required, default: false)
portable_charger_received   (BOOLEAN, required, default: false)
vehicle_type                (ENUM: 'High Speed' | 'Low Speed', required)
battery_type                (ENUM: 'Fixed' | 'Swappable', required)
status                      (ENUM, required, default: 'Ready for Deployment')
next_maintenance_date       (DATE, required)
rider_id                    (TEXT, nullable)
rider_name                  (TEXT, nullable)
rental_start_date           (DATE, nullable)
rental_end_date             (DATE, nullable)
location                    (TEXT, nullable)
created_at                  (TIMESTAMP, auto)
updated_at                  (TIMESTAMP, auto)
id                          (UUID, auto)
```

---

## 2. Current Validator Field Keys

From `/src/lib/import/validation/vehicleValidator.ts`:

```bash
VEHICLE_FIELD_DEFINITIONS = {
  vehicle_number: {...}
  chassis_number: {...}
  motor_serial_number: {...}
  make: {...}
  model: {...}
  color: {...}
  delivery_date: {...}
  vehicle_type: {...}
  battery_type: {...}
  vendor: {...}
  pdi_done_by: {...}
  registration_received: {...}
  insurance_received: {...}
  portable_charger_received: {...}
}
```

**Template Headers Generated** (from displayName properties):

```bash
Vehicle Number
Chassis Number
Motor Serial Number
Vehicle Make
Vehicle Model
Color
Delivery Date
Vehicle Type
Battery Type
Vendor
PDI Done By
Registration Received
Insurance Received
Portable Charger Received
```

---

## 3. Actual CSV Headers (from import_data/Bulk_Vehicle.csv)

```csv
Vehicle Make,Vehicle Model,Color,Delivery Date,Vehicle Registration Number,Chassis Number,Motor Serial Number,Vendor,PDI Done By,Registration Received?,Insurance Received?,Portable Charger Received?,Vehicle Type,Battery Type,VEHICLE ID
```

**Parsed into array:**

1. Vehicle Make ✓ (matches template displayName)
2. Vehicle Model ✓ (matches template displayName)
3. Color ✓ (matches template displayName)
4. Delivery Date ✓ (matches template displayName)
5. **Vehicle Registration Number** ❌ (template has "Vehicle Number")
6. Chassis Number ✓ (matches template displayName)
7. Motor Serial Number ✓ (matches template displayName)
8. Vendor ✓ (matches template displayName)
9. PDI Done By ✓ (matches template displayName)
10. **Registration Received?** ❌ (template has "Registration Received" without ?)
11. **Insurance Received?** ❌ (template has "Insurance Received" without ?)
12. **Portable Charger Received?** ❌ (template has "Portable Charger Received" without ?)
13. Vehicle Type ✓ (matches template displayName)
14. Battery Type ✓ (matches template displayName)
15. **VEHICLE ID** ❌ (NOT in validator at all!)

---

## 4. CSV Data Format Issues

### Date Format Mismatch

**CSV has:** `17 Nov 2025`
**Validator expects:** `2025-11-17` (YYYY-MM-DD)
**Validator error:** "Delivery date must be in YYYY-MM-DD format"

### Solution Needed

Add date transformer to handle "DD MMM YYYY" format:

```typescript
function transformDeliveryDate(value: any): string | null {
  const str = String(value).trim();

  // Try DD MMM YYYY format (e.g., "17 Nov 2025")
  const ddMmmYyyyRegex = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/;
  const match = str.match(ddMmmYyyyRegex);

  if (match) {
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2]];
    const year = match[3];

    return `${year}-${month}-${day}`;
  }

  // Already in YYYY-MM-DD format
  if (isValidDateFormat(str)) {
    return str;
  }

  return null;
}
```

---

## 5. The Root Problem

**CSV Parser Behavior:**

```typescript
// PapaParse creates objects like this:
{
  "Vehicle Make": "IntuitEV",
  "Vehicle Model": "BanaEV",
  "Vehicle Registration Number": "INT001",  // ← This key!
  "Registration Received?": "NA",            // ← This key!
  ...
}
```

**Validator Tries to Access:**

```typescript
row["vehicle_number"]  // ← UNDEFINED! (CSV has "Vehicle Registration Number")
row["make"]            // ← UNDEFINED! (CSV has "Vehicle Make")
```

**Result:** Every field shows as "REQUIRED FIELD MISSING" because the keys don't match!

---

## 6. Complete Mismatch Table

| CSV Header | Validator Key | Match? | Issue |
|------------|---------------|--------|-------|

| Vehicle Make | make | ❌ | Validator should use "Vehicle Make" as key |
| Vehicle Model | model | ❌ | Validator should use "Vehicle Model" as key |
| Color | color | ❌ | Validator should use "Color" as key |
| Delivery Date | delivery_date | ❌ | Validator should use "Delivery Date" as key |
| **Vehicle Registration Number** | vehicle_number | ❌ | Complete mismatch! |
| Chassis Number | chassis_number | ❌ | Validator should use "Chassis Number" as key |
| Motor Serial Number | motor_serial_number | ❌ | Validator should use "Motor Serial Number" as key |
| Vendor | vendor | ❌ | Validator should use "Vendor" as key |
| PDI Done By | pdi_done_by | ❌ | Validator should use "PDI Done By" as key |
| **Registration Received?** | registration_received | ❌ | Extra "?" in CSV |
| **Insurance Received?** | insurance_received | ❌ | Extra "?" in CSV |
| **Portable Charger Received?** | portable_charger_received | ❌ | Extra "?" in CSV |
| Vehicle Type | vehicle_type | ❌ | Validator should use "Vehicle Type" as key |
| Battery Type | battery_type | ❌ | Validator should use "Battery Type" as key |
| **VEHICLE ID** | (missing) | ❌ | Not in validator at all! |

---

## 7. Why Even the Template Fails

**The generated template creates headers:**

```bash
Vehicle Number,Chassis Number,Motor Serial Number,Vehicle Make,...
```

**But the validator looks for keys:**

```bash
row["vehicle_number"]  // ← Doesn't exist!
```

**The validator MUST use the EXACT header names as keys**, like we did for batteries:

```typescript
VEHICLE_FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  'Vehicle Make': {           // ← Use exact CSV header as key
    dbField: 'make',          // ← Maps to DB column
    displayName: 'Vehicle Make',
    ...
  },
  ...
}
```

---

## 8. Complete Fix Required

### Fix 1: Update Field Keys to Match CSV Headers

```typescript
export const VEHICLE_FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  'Vehicle Make': {
    dbField: 'make',
    displayName: 'Vehicle Make',
    required: true,
    ...
  },

  'Vehicle Model': {
    dbField: 'model',
    displayName: 'Vehicle Model',
    required: true,
    ...
  },

  'Color': {
    dbField: 'color',
    displayName: 'Color',
    required: false,
    transformer: transformColor,
    ...
  },

  'Delivery Date': {
    dbField: 'delivery_date',
    displayName: 'Delivery Date',
    required: true,
    validator: validateDeliveryDate,
    transformer: transformDeliveryDateDDMmmYYYY,  // ← NEW
    ...
  },

  'Vehicle Registration Number': {  // ← CRITICAL FIX
    dbField: 'vehicle_number',
    displayName: 'Vehicle Registration Number',
    required: true,
    validator: validateVehicleNumber,
    ...
  },

  'Chassis Number': {
    dbField: 'chassis_number',
    displayName: 'Chassis Number',
    required: true,
    validator: validateChassisNumber,
    ...
  },

  'Motor Serial Number': {
    dbField: 'motor_serial_number',
    displayName: 'Motor Serial Number',
    required: true,
    validator: validateMotorSerialNumber,
    ...
  },

  'Vendor': {
    dbField: 'vendor',
    displayName: 'Vendor',
    required: true,
    ...
  },

  'PDI Done By': {
    dbField: 'pdi_done_by',
    displayName: 'PDI Done By',
    required: true,
    ...
  },

  'Registration Received?': {  // ← Include the "?"
    dbField: 'registration_received',
    displayName: 'Registration Received?',
    required: false,
    transformer: transformBoolean,
    ...
  },

  'Insurance Received?': {  // ← Include the "?"
    dbField: 'insurance_received',
    displayName: 'Insurance Received?',
    required: false,
    transformer: transformBoolean,
    ...
  },

  'Portable Charger Received?': {  // ← Include the "?"
    dbField: 'portable_charger_received',
    displayName: 'Portable Charger Received?',
    required: false,
    transformer: transformBoolean,
    ...
  },

  'Vehicle Type': {
    dbField: 'vehicle_type',
    displayName: 'Vehicle Type',
    required: true,
    dataType: 'enum',
    enumValues: ['High Speed', 'Low Speed'],
    ...
  },

  'Battery Type': {
    dbField: 'battery_type',
    displayName: 'Battery Type',
    required: true,
    dataType: 'enum',
    enumValues: ['Fixed', 'Swappable'],
    ...
  },

  'VEHICLE ID': {  // ← Handle extra field (optional)
    dbField: null,  // Don't map to DB (may be duplicate of vehicle_number)
    displayName: 'VEHICLE ID',
    required: false,
    description: 'Optional vehicle ID field (ignored if same as Vehicle Registration Number)',
  },
};
```

### Fix 2: Add Date Transformer

```typescript
function transformDeliveryDateDDMmmYYYY(value: any): string | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str || str.toUpperCase() === 'N/A') return null;

  // Try "DD MMM YYYY" format (e.g., "17 Nov 2025")
  const ddMmmYyyyRegex = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/;
  const match = str.match(ddMmmYyyyRegex);

  if (match) {
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    const day = match[1].padStart(2, '0');
    const month = monthMap[match[2]];
    const year = match[3];

    if (!month) return null;  // Invalid month

    return `${year}-${month}-${day}`;
  }

  // Already in YYYY-MM-DD format
  if (isValidDateFormat(str)) {
    return str;
  }

  return null;
}
```

---

## 9. Action Plan

1. ✅ **Add date transformer** for "DD MMM YYYY" format
2. ✅ **Update VEHICLE_FIELD_DEFINITIONS** to use exact CSV headers as keys
3. ✅ **Update validator** to handle "VEHICLE ID" field (optional)
4. ✅ **Test with actual CSV** from `import_data/Bulk_Vehicle.csv`
5. ✅ **Verify transformation** to correct database column names via `dbField`

---

## 10. Validation Flow After Fix

```bash
CSV Row:
{
  "Vehicle Make": "IntuitEV",
  "Delivery Date": "17 Nov 2025",
  "Vehicle Registration Number": "INT001",
  ...
}
    ↓
Validator loops through VEHICLE_FIELD_DEFINITIONS:
    ↓
row["Vehicle Make"]  → Found! → Transform → transformedData["make"] = "IntuitEV"
row["Delivery Date"] → Found! → Transform "17 Nov 2025" → "2025-11-17" → transformedData["delivery_date"] = "2025-11-17"
row["Vehicle Registration Number"] → Found! → transformedData["vehicle_number"] = "INT001"
    ↓
Calculate next_maintenance_date:
  delivery_date + 90 days = 2026-02-15 (future)
  → transformedData["next_maintenance_date"] = "2026-02-15"
    ↓
Insert to Supabase:
  INSERT INTO vehicles (make, delivery_date, vehicle_number, next_maintenance_date, ...)
  VALUES ('IntuitEV', '2025-11-17', 'INT001', '2026-02-15', ...)
```

---

## 11. Database Error (Batteries Table)

**Separate Issue:**

Error:

```bash
Could not find the table 'public.batteries' in the schema cache
PGRST205
```

**Cause:** The `batteries` table doesn't exist in your Supabase database yet.

**Solution:** Create the batteries table migration or use the existing battery management system that uses a different table structure.

---

## Conclusion

**Why all 65 rows fail:**

- The validator looks for `row["vehicle_number"]`
- The CSV provides `row["Vehicle Registration Number"]`
- Result: All required fields appear "missing"

**Why the template fails:**

- The template generates headers like "Vehicle Number"
- But the validator looks for `row["vehicle_number"]`
- Same mismatch!

**The fix:** Update validator field keys to match **exact CSV headers** (including spaces, capitalization, and punctuation like "?").
