# Batteries Validation Rules

## Goal

Prevent bad data even if the UI fails. All validation is enforced at the PostgreSQL database level.

## Validation Rules

### 1. battery_id Format

**Rule**: `^[A-Z0-9]{8}$`

**Requirements**:
- Exactly 8 characters
- Uppercase letters (A-Z) and numbers (0-9) only
- No lowercase, spaces, hyphens, or special characters

**Valid Examples**:
```
ABC12345  ✓
ABCD1234  ✓
12345678  ✓
ZZZ99999  ✓
BAT00001  ✓
```

**Invalid Examples**:
```
abc12345  ✗ (lowercase)
ABC-1234  ✗ (hyphen)
ABC123    ✗ (too short: 7 chars)
ABC12345X ✗ (too long: 9 chars)
ABC 1234  ✗ (space)
```

**Implementation**: CHECK constraint
```sql
CHECK (battery_id ~ '^[A-Z0-9]{8}$')
```

---

### 2. zone_id Format

**Rule**: `^[A-Z0-9]{8}$` (nullable)

**Requirements**:
- Same format as battery_id when provided
- Exactly 8 characters (if not NULL)
- Field is optional (can be NULL)

**Valid Examples**:
```
ZONE1234  ✓
Z0000001  ✓
SECTOR99  ✓
null      ✓ (field can be empty)
```

**Invalid Examples**:
```
zone1234  ✗ (lowercase)
ZONE123   ✗ (7 chars, too short)
ZONE12345 ✗ (9 chars, too long)
```

**Implementation**: CHECK constraint with NULL handling
```sql
CHECK (zone_id IS NULL OR zone_id ~ '^[A-Z0-9]{8}$')
```

---

### 3. usc_id Uppercase Enforcement

**Rule**: Automatically convert to UPPERCASE

**Requirements**:
- Any case input is converted to uppercase
- No validation error - automatic conversion
- Enforced on INSERT and UPDATE

**Examples**:
```
Input: 'usc123456'   → Stored: 'USC123456' ✓
Input: 'UsC_Code'    → Stored: 'USC_CODE'  ✓
Input: 'code'        → Stored: 'CODE'      ✓
Input: null          → Stored: null        ✓
```

**Implementation**: BEFORE trigger
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

All enum fields only accept predefined values (enforced at DB level).

#### service_provider
```
Valid: 'BATTERY_SMART' | 'OTHER'
Invalid: 'INVALID_PROVIDER' ✗
```

#### battery_plan
```
Valid: 'D2D' | 'B2B' | 'OTHER'
Invalid: 'C2C' ✗ | 'INVALID' ✗
```

#### location
```
Valid: 'NOIDA' | 'OTHER'
Invalid: 'DELHI' ✗ | 'Mumbai' ✗
```

#### status
```
Valid: 'ACTIVE' | 'MAPPED' | 'UNMAPPED'
Default: 'ACTIVE'
Invalid: 'INACTIVE' ✗ | 'PENDING' ✗
```

**Implementation**: PostgreSQL ENUM types
```sql
CREATE TYPE service_provider AS ENUM ('BATTERY_SMART', 'OTHER');
CREATE TYPE battery_plan AS ENUM ('D2D', 'B2B', 'OTHER');
CREATE TYPE battery_location AS ENUM ('NOIDA', 'OTHER');
CREATE TYPE battery_status AS ENUM ('ACTIVE', 'MAPPED', 'UNMAPPED');
```

---

### 5. retrofit_date Validation

**Rule**: Cannot be in the future

**Requirements**:
- retrofit_date must be today or before
- Field is optional (nullable)
- No future dates allowed

**Valid Examples**:
```
2024-12-25 ✓ (past date)
2024-01-01 ✓ (past date)
null       ✓ (field can be empty)
```

**Invalid Examples**:
```
2099-12-31 ✗ (future date)
2026-01-01 ✗ (future date)
2025-12-31 ✗ (if today is before this date)
```

**Implementation**: CHECK constraint
```sql
CHECK (retrofit_date IS NULL OR retrofit_date <= CURRENT_DATE)
```

---

### 6. Unique Constraint

**Rule**: battery_id must be unique

**Requirement**: No two batteries can have the same battery_id

**Examples**:
```
Insert 1: battery_id = 'BAT00001' ✓ Success
Insert 2: battery_id = 'BAT00001' ✗ Duplicate key violation
```

**Implementation**: UNIQUE constraint
```sql
UNIQUE (battery_id)
```

---

### 7. Foreign Key Validation

**Rule**: vehicle_id must reference existing vehicle or be NULL

**Examples**:
```
vehicle_id = '550e8400...' ✓ (if vehicle exists)
vehicle_id = null         ✓ (nullable)
vehicle_id = '000...'     ✗ (if vehicle doesn't exist)
```

**Implementation**: Foreign key constraint
```sql
FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
```

---

## Error Messages

When validation fails, you'll see errors like:

```
Error: new row for relation "batteries" violates check constraint
"check_battery_id_format"

Error: invalid input value for enum service_provider: "INVALID"

Error: duplicate key value violates unique constraint
"batteries_battery_id_key"

Error: new row for relation "batteries" violates check constraint
"check_retrofit_date_not_future"
```

---

## Testing Validation

Run comprehensive validation tests:

```bash
npm run test:batteries-validation
```

**Test Coverage**:
- ✓ battery_id valid/invalid formats (8 tests)
- ✓ zone_id valid/invalid formats (5 tests)
- ✓ usc_id uppercase conversion (2 tests)
- ✓ Enum enforcement (7 tests)
- ✓ retrofit_date validation (2 tests)
- ✓ Combined constraints (2 tests)

**Total**: 25+ individual test cases

---

## TypeScript Integration

### Safe Insert

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BatteryInsert = Database['public']['Tables']['batteries']['Insert'];

async function createBattery(battery: BatteryInsert) {
  const { data, error } = await supabase
    .from('batteries')
    .insert([battery])
    .select()
    .single();

  if (error) {
    // Handle validation error
    if (error.message.includes('check_battery_id_format')) {
      console.error('Invalid battery_id format');
    } else if (error.message.includes('duplicate')) {
      console.error('Battery ID already exists');
    } else {
      console.error('Validation failed:', error.message);
    }
  }

  return data;
}
```

### Application-Level Validation (Recommended)

```typescript
const validateBattery = (data: any) => {
  const errors: Record<string, string> = {};

  // Validate battery_id
  if (!data.battery_id) {
    errors.battery_id = 'Required';
  } else if (!/^[A-Z0-9]{8}$/.test(data.battery_id)) {
    errors.battery_id = 'Must be 8 uppercase alphanumeric characters';
  }

  // Validate zone_id
  if (data.zone_id && !/^[A-Z0-9]{8}$/.test(data.zone_id)) {
    errors.zone_id = 'Must be 8 uppercase alphanumeric characters';
  }

  // Validate retrofit_date
  if (data.retrofit_date) {
    const date = new Date(data.retrofit_date);
    if (date > new Date()) {
      errors.retrofit_date = 'Cannot be in the future';
    }
  }

  // Validate enums
  const validProviders = ['BATTERY_SMART', 'OTHER'];
  if (data.service_provider && !validProviders.includes(data.service_provider)) {
    errors.service_provider = 'Invalid service provider';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

---

## Data Migration

If migrating existing data, clean it first:

```typescript
const cleanBatteryData = (rawData: any) => ({
  battery_id: rawData.battery_id
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, '0'),
  zone_id: rawData.zone_id
    ? rawData.zone_id
        .replace(/[^A-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8)
        .padEnd(8, '0')
    : null,
  usc_id: rawData.usc_id ? rawData.usc_id.toUpperCase() : null,
  service_provider: ['BATTERY_SMART', 'OTHER'].includes(rawData.service_provider)
    ? rawData.service_provider
    : 'OTHER',
  battery_plan: ['D2D', 'B2B', 'OTHER'].includes(rawData.battery_plan)
    ? rawData.battery_plan
    : 'OTHER',
  location: ['NOIDA', 'OTHER'].includes(rawData.location) ? rawData.location : 'OTHER',
  status: ['ACTIVE', 'MAPPED', 'UNMAPPED'].includes(rawData.status)
    ? rawData.status
    : 'ACTIVE',
  retrofit_date:
    rawData.retrofit_date && new Date(rawData.retrofit_date) <= new Date()
      ? rawData.retrofit_date
      : null,
  // ... other fields
});
```

---

## Performance Impact

**Overhead per operation**:
- CHECK constraints: ~0.1ms (regex matching)
- Enums: ~0.05ms (type validation)
- Triggers: ~0.5ms (function execution)
- Total: ~1-2ms per DB roundtrip (negligible)

---

## Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Lowercase battery_id | Validation fails | Use UPPERCASE: `ABC12345` |
| Wrong length battery_id | Validation fails | Use exactly 8 chars: `BAT00001` |
| Invalid enum | Validation fails | Use only: `BATTERY_SMART`, `D2D`, `NOIDA`, `ACTIVE` |
| Future retrofit_date | Validation fails | Use past date or null: `2024-12-25` |
| Duplicate battery_id | Duplicate key error | Use unique ID: `BAT00002` |

---

## Troubleshooting

**Q: Getting "violates check constraint" error?**
A: Check which constraint failed in error message, then review the rule above.

**Q: Uppercase conversion not working?**
A: The trigger only works on INSERT/UPDATE. Check if the table has the trigger applied.

**Q: Invalid enum error?**
A: Verify the value exactly matches one of the valid options (case-sensitive).

---

## Summary Table

| Field | Type | Rule | Example |
|-------|------|------|---------|
| battery_id | TEXT | `^[A-Z0-9]{8}$` | BAT00001 |
| zone_id | TEXT | `^[A-Z0-9]{8}$` \| null | ZONE1234 |
| usc_id | TEXT | AUTO-UPPERCASE | USC_CODE |
| service_provider | ENUM | BATTERY_SMART, OTHER | BATTERY_SMART |
| location | ENUM | NOIDA, OTHER | NOIDA |
| battery_plan | ENUM | D2D, B2B, OTHER | D2D |
| status | ENUM | ACTIVE, MAPPED, UNMAPPED | ACTIVE |
| retrofit_date | DATE | ≤ TODAY | 2024-12-25 |

**Database is protected against bad data!** 🔒
