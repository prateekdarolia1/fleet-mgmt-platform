# Batteries Table Validation Rules

## Overview

Database-level validation ensures data quality even if the UI fails. All validation is enforced at the PostgreSQL level using CHECK constraints and triggers.

## Validation Rules

### 1. battery_id Format Validation

**Rule**: `^[A-Z0-9]{8}$`

**Requirements**:
- Exactly 8 characters
- Only uppercase letters (A-Z) and numbers (0-9)
- No spaces, hyphens, underscores, or special characters
- No lowercase letters

**Valid Examples**:
```
ABC12345
ABCD1234
12345678
ZZZ00000
ABC00001
```

**Invalid Examples**:
```
abc12345    ❌ lowercase letters
ABC-1234    ❌ hyphen not allowed
ABC123      ❌ too short (7 chars)
ABC1234567  ❌ too long (9 chars)
ABC1234_    ❌ underscore not allowed
ABC 1234    ❌ space not allowed
```

**Implementation**: PostgreSQL CHECK constraint
```sql
CHECK (battery_id ~ '^[A-Z0-9]{8}$')
```

---

### 2. zone_id Format Validation

**Rule**: `^[A-Z0-9]{8}$` (nullable)

**Requirements**:
- Same as battery_id when provided
- Exactly 8 characters (uppercase letters and numbers only)
- Field is nullable (optional)

**Valid Examples**:
```
ZONE1234
Z0000001
SECTOR99
null        ✓ field can be empty
```

**Invalid Examples**:
```
zone1234    ❌ lowercase
ZONE123     ❌ too short
ZONE12345   ❌ too long
ZONE-1234   ❌ hyphen
```

**Implementation**: PostgreSQL CHECK constraint with NULL handling
```sql
CHECK (zone_id IS NULL OR zone_id ~ '^[A-Z0-9]{8}$')
```

---

### 3. usc_id Uppercase Enforcement

**Rule**: Automatically convert to UPPERCASE

**Requirements**:
- Any case input is converted to uppercase
- No validation error - just automatic conversion
- Enforced on INSERT and UPDATE

**Examples**:
```
Input:  'usc123456'    → Stored as: 'USC123456' ✓
Input:  'UsC_Code'     → Stored as: 'USC_CODE' ✓
Input:  'USC123'       → Stored as: 'USC123' ✓
```

**Implementation**: PostgreSQL BEFORE trigger
```sql
CREATE FUNCTION enforce_usc_id_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.usc_id IS NOT NULL THEN
    NEW.usc_id := UPPER(NEW.usc_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 4. Enum Enforcement

**Rule**: Only predefined enum values allowed

#### service_provider
```
Valid Values:
  - 'BATTERY_SMART'
  - 'OTHER'

Invalid: 'INVALID_PROVIDER' ❌
```

#### location
```
Valid Values:
  - 'NOIDA'
  - 'OTHER'

Invalid: 'DELHI' ❌
```

#### battery_plan
```
Valid Values:
  - 'D2D'
  - 'B2B'
  - 'OTHER'

Invalid: 'C2C' ❌
```

#### status
```
Valid Values:
  - 'ACTIVE' (default)
  - 'MAPPED'
  - 'UNMAPPED'

Invalid: 'INACTIVE' ❌
```

**Implementation**: PostgreSQL ENUM types
```sql
CREATE TYPE service_provider AS ENUM ('BATTERY_SMART', 'OTHER');
CREATE TYPE battery_plan AS ENUM ('D2D', 'B2B', 'OTHER');
CREATE TYPE battery_status AS ENUM ('ACTIVE', 'MAPPED', 'UNMAPPED');
```

---

### 5. Retrofit Date Validation

**Rule**: Cannot be in the future

**Requirements**:
- retrofit_date must be today or before
- Field is nullable (optional)
- No future dates allowed

**Valid Examples**:
```
2025-01-01  ✓ past date
2024-12-25  ✓ past date
null        ✓ nullable field
```

**Invalid Examples**:
```
2099-12-31  ❌ future date
2026-01-01  ❌ future date
2025-12-31  ❌ future date
```

**Implementation**: PostgreSQL CHECK constraint
```sql
CHECK (retrofit_date IS NULL OR retrofit_date <= CURRENT_DATE)
```

---

### 6. Enum Enforcement (Database Level)

**Type Safety**: All enum fields use PostgreSQL ENUM types
- Invalid values rejected at database level
- Type-safe in TypeScript with auto-generated types
- No bypassing through raw SQL

---

## Error Messages

When validation fails, you'll get database errors like:

```
Error: new row for relation "batteries" violates check constraint
"check_battery_id_format"

Error: invalid input value for enum service_provider: "INVALID"

Error: new row for relation "batteries" violates check constraint
"check_retrofit_date_not_future"
```

---

## Testing Validation

### Run Comprehensive Tests

```bash
npm run test:batteries-validation
```

This tests:
- ✓ battery_id format (valid and invalid)
- ✓ zone_id format (valid and invalid)
- ✓ usc_id uppercase conversion
- ✓ Enum enforcement (all types)
- ✓ Retrofit date validation
- ✓ Combined constraints

### Example Test Output

```
═══════════════════════════════════════════════════════════════
  🔒 BATTERIES TABLE VALIDATION TESTS
═══════════════════════════════════════════════════════════════

TEST 1: battery_id Format Validation
═══════════════════════════════════════════════════════════════

✅ Valid battery_id: 'ABC12345'
✅ Valid battery_id: 'ABCD1234'
✅ Valid battery_id: '12345678' (all numbers)
✅ Invalid battery_id: 'abc12345' (lowercase)
   Correctly rejected: new row for relation "batteries" violates check constraint
✅ Invalid battery_id: 'ABC-1234' (contains hyphen)
   Correctly rejected: new row for relation "batteries" violates check constraint
✅ Invalid battery_id: 'ABC123' (too short)
   Correctly rejected: new row for relation "batteries" violates check constraint

...

🎉 ALL VALIDATION TESTS PASSED!
✓ battery_id format enforced: ^[A-Z0-9]{8}$
✓ zone_id format enforced: ^[A-Z0-9]{8}$ (nullable)
✓ usc_id uppercase conversion working
✓ Enum enforcement: service_provider, battery_plan, status
✓ retrofit_date future-date prevention
✓ Combined constraints working together

Database is now protected against bad data!
```

---

## Implementation Steps

### Step 1: Apply Main Table Migration

```bash
# Create batteries table with enums and structure
npm run setup:batteries
```

### Step 2: Apply Validation Constraints

In Supabase Dashboard:

1. Go to **SQL Editor**
2. Create a new query
3. Copy SQL from `migrations/add_batteries_validation.sql`
4. Click **Run**

### Step 3: Verify Validation Works

```bash
npm run test:batteries-validation
```

Expected: All tests pass ✅

---

## Usage in TypeScript

### Insert with Validation

```typescript
import { supabase } from '@/integrations/supabase/client';

// This will be validated at DB level even if UI validation fails
const { data, error } = await supabase
  .from('batteries')
  .insert([
    {
      battery_id: 'BAT00001',      // Must match ^[A-Z0-9]{8}$
      service_provider: 'BATTERY_SMART',  // Must be valid enum
      zone_id: 'ZONE1234',          // Must match ^[A-Z0-9]{8}$ or be null
      usc_id: 'code123',            // Auto-converted to uppercase
      battery_plan: 'D2D',          // Must be valid enum
      status: 'ACTIVE',             // Default value, must be valid enum
      retrofit_date: '2024-12-01'   // Must not be in future
    }
  ]);

if (error) {
  // Handle validation error
  console.error('Validation failed:', error.message);
  // Example: "new row for relation "batteries" violates check constraint"
}
```

### Update with Validation

```typescript
const { data, error } = await supabase
  .from('batteries')
  .update({
    zone_id: 'ZONE5678',  // Validated
    status: 'MAPPED'      // Must be valid enum
  })
  .eq('battery_id', 'BAT00001');

if (error) {
  console.error('Update validation failed:', error.message);
}
```

---

## Data Migration Safety

If migrating existing data:

```typescript
// Before migration, clean data to match validation rules
const cleanBatteryId = (id: string) => {
  // Ensure 8 chars, uppercase alphanumeric
  return id.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 8);
};

const cleanZoneId = (zone: string) => {
  // Same as battery_id
  return zone ? zone.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 8) : null;
};

const cleanUscId = (usc: string) => {
  // Just uppercase - trigger will handle conversion
  return usc ? usc.toUpperCase() : null;
};
```

---

## Performance Considerations

### Indexes
- `idx_batteries_battery_id` - Fast lookups by battery_id
- `idx_batteries_vehicle_id` - Fast vehicle relationships
- `idx_batteries_status` - Fast status filtering

### Constraints Performance
- CHECK constraints: Negligible overhead (~0.1ms)
- Triggers: ~0.5ms per insert/update
- Enums: O(1) validation lookup

### When to Validate

**Database Level** (Current):
- Protection against bad data
- Always enforced
- Prevents UI bypass
- ~1-2ms overhead per operation

**Application Level** (Also Recommended):
- Better UX (immediate feedback)
- Reduced failed requests
- User-friendly error messages

---

## Troubleshooting

### "violates check constraint" Error

**Cause**: Data doesn't match validation rule

**Solution**:
1. Check which constraint failed (error message shows it)
2. Review validation rule above
3. Clean data before insert/update
4. Example: `'abc123'` → `'ABC12345'`

### Enum Type Error

**Cause**: Invalid enum value provided

**Solution**:
1. Verify value matches allowed values
2. Check for typos
3. Example: `'ACTIVE'` ✓, `'Active'` ❌

### Retrofit Date in Future

**Cause**: Trying to set future date

**Solution**:
1. Use date from past or today
2. Leave null if not applicable
3. Example: `'2099-12-31'` ❌, `'2024-12-25'` ✓

---

## Security Considerations

### SQL Injection Protection
- Parameterized queries (Supabase client handles this)
- Enum types prevent value injection
- Constraints cannot be bypassed with SQL

### Data Integrity
- UNIQUE constraint on battery_id
- Foreign key to vehicles table
- RLS policies for access control

### Audit Trail
- created_at and updated_at timestamps
- Triggers update timestamps automatically
- Can be used for audit logging

---

## Future Enhancements

Potential additions:
- [ ] Barcode validation for battery_id
- [ ] Serial number format validation
- [ ] Capacity validation (min/max kWh)
- [ ] Warranty date tracking
- [ ] Audit table for changes
- [ ] Soft delete with is_deleted flag

---

## Quick Reference

| Field | Type | Rule | Example |
|-------|------|------|---------|
| battery_id | TEXT | `^[A-Z0-9]{8}$` | BAT00001 |
| zone_id | TEXT | `^[A-Z0-9]{8}$` \| null | ZONE1234 |
| usc_id | TEXT | UPPERCASE | USC_CODE |
| service_provider | ENUM | BATTERY_SMART, OTHER | BATTERY_SMART |
| location | ENUM | NOIDA, OTHER | NOIDA |
| battery_plan | ENUM | D2D, B2B, OTHER | D2D |
| status | ENUM | ACTIVE, MAPPED, UNMAPPED | ACTIVE |
| retrofit_date | DATE | ≤ TODAY | 2024-12-25 |

---

## Support

For validation issues:
1. Run: `npm run test:batteries-validation`
2. Check error message for constraint name
3. Review rule above
4. Check example data format
5. Validate input before insert

Database validation prevents bad data at the source! 🔒
