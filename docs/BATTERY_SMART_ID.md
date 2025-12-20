# Battery Smart ID Tracking

## Overview

Track Battery Smart company IDs for monitoring battery performance and condition per rider across the fleet.

**Why?** Battery Smart batteries need to be tracked individually to monitor:
- Battery lifespan and degradation
- Performance issues per battery
- Rider impact on battery condition
- Maintenance and replacement schedules

---

## Database Changes

### Batteries Table - `battery_smart_id` Column

**Added to**: `batteries` table
**Format**: Exactly 8 uppercase letters and numbers (e.g., `BS12AB34`)
**Type**: TEXT, UNIQUE, NULLABLE
**Validation**: CHECK constraint `battery_smart_id ~ '^[A-Z0-9]{8}$'`

```sql
-- Field definition
battery_smart_id TEXT UNIQUE
  CHECK (battery_smart_id IS NULL OR battery_smart_id ~ '^[A-Z0-9]{8}$')
```

**Purpose**: Store the official Battery Smart company ID for each battery

---

### Riders Table - `battery_smart_id` Column

**Added to**: `riders` table
**Format**: Exactly 8 uppercase letters and numbers (e.g., `BS12AB34`)
**Type**: TEXT, NULLABLE
**Validation**: CHECK constraint `battery_smart_id ~ '^[A-Z0-9]{8}$'`

```sql
-- Field definition
battery_smart_id TEXT
  CHECK (battery_smart_id IS NULL OR battery_smart_id ~ '^[A-Z0-9]{8}$')
```

**Purpose**: Track which Battery Smart ID is currently assigned to each rider for performance monitoring

---

## Validation Rules

### Format: `^[A-Z0-9]{8}$`

| Rule | Details |
|------|---------|
| **Length** | Exactly 8 characters |
| **Characters** | Uppercase letters (A-Z) and digits (0-9) only |
| **Case** | Must be uppercase (auto-converted on save) |
| **Whitespace** | Trimmed automatically |

### Valid Examples
- `BS12AB34` ✅
- `BAT00001` ✅
- `BEE12FGH` ✅
- `ABC12345` ✅

### Invalid Examples
- `bs12ab34` ❌ (lowercase)
- `BS12-AB34` ❌ (contains hyphen)
- `BS12AB` ❌ (only 6 chars)
- `BS12AB345` ❌ (9 chars)
- `BS12 AB34` ❌ (contains space)

---

## Data Relationships

```
Battery Smart Company
        ↓
   battery_smart_id (e.g., BS12AB34)
        ↓
   Battery Record
   ├── batteries.battery_smart_id = "BS12AB34"
   └── batteries.vehicle_id = vehicle_uuid
        ↓
   Vehicle Record
   └── vehicles.rider_id = rider_id
        ↓
   Rider Record
   └── riders.battery_smart_id = "BS12AB34" (denormalized for performance)
```

**Key Insight**: The `riders.battery_smart_id` is a denormalized copy of the battery's ID to quickly see which rider is using which battery without joining multiple tables.

---

## Auto-Normalization

Both tables have triggers that automatically:
1. Convert input to UPPERCASE
2. Trim whitespace
3. Store normalized value

**Example**:
```
Input: "  bs12ab34  "
Stored: "BS12AB34"
```

---

## TypeScript Validation

### Zod Schema

```typescript
import { batterySmartIdSchema, optionalBatterySmartIdSchema } from '@/lib/validation/batterySmartId';

// Required field
const schema = z.object({
  batterySmartId: batterySmartIdSchema
});

// Optional field
const schema = z.object({
  batterySmartId: optionalBatterySmartIdSchema
});
```

### Validation Function

```typescript
import { validateBatterySmartId } from '@/lib/validation/batterySmartId';

const result = validateBatterySmartId('BS12AB34');
if (result.isValid) {
  // Valid Battery Smart ID
} else {
  console.error(result.error);
  // Output: "Battery Smart ID must be 8 uppercase letters and numbers (e.g., BS12AB34)"
}
```

### Utility Functions

```typescript
// Format for display
formatBatterySmartId('BS12AB34') // Returns: "BS12-AB34"

// Normalize input
normalizeBatterySmartId('bs12ab34') // Returns: "BS12AB34"

// Compare IDs (case-insensitive)
isSameBatterySmartId('bs12ab34', 'BS12AB34') // Returns: true

// Batch validation
validateBatterySmartIdBatch(['BS12AB34', 'invalid', 'BAT00001'])
// Returns: Array of validation results
```

---

## Update Rider Battery Smart ID

### API Function

```typescript
import { updateRiderBatterySmartId } from '@/lib/riders/updateRiderBatterySmartId';

const result = await updateRiderBatterySmartId({
  riderId: 'R001',
  batterySmartId: 'BS12AB34',
  userId: currentUser.id
});

if (result.success) {
  console.log('Updated to:', result.rider?.battery_smart_id);
} else {
  console.error(result.error); // INVALID_BATTERY_SMART_ID, RIDER_NOT_FOUND, etc.
}
```

### Clear Battery Smart ID

```typescript
import { clearRiderBatterySmartId } from '@/lib/riders/updateRiderBatterySmartId';

const result = await clearRiderBatterySmartId('R001', userId);
// Sets battery_smart_id to NULL
```

### Find Riders by Battery Smart ID

```typescript
import { findRidersByBatterySmartId } from '@/lib/riders/updateRiderBatterySmartId';

const riders = await findRidersByBatterySmartId('BS12AB34');
// Returns all riders currently assigned to this battery
```

---

## UI Integration

### Example: Update Rider Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { batterySmartIdSchema } from '@/lib/validation/batterySmartId';

const schema = z.object({
  batterSmartId: batterySmartIdSchema.optional()
});

export const UpdateRiderForm = ({ riderId }) => {
  const form = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    const result = await updateRiderBatterySmartId({
      riderId,
      batterySmartId: data.batterySmartId || null,
      userId: currentUser.id
    });

    if (result.success) {
      toast.success(`Battery Smart ID updated`);
    } else {
      toast.error(getUpdateBatterySmartIdErrorMessage(result));
    }
  };

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="batterySmartId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Battery Smart ID</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="e.g., BS12AB34"
                maxLength={8}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
};
```

---

## Performance Monitoring Queries

### Find Problem Batteries

```sql
-- Batteries with shortest lifespan
SELECT
  b.battery_smart_id,
  b.battery_id,
  r.name as last_rider,
  AGE(NOW(), b.created_at) as battery_age,
  COUNT(*) as riders_used_by
FROM batteries b
JOIN riders r ON b.battery_smart_id = r.battery_smart_id
GROUP BY b.battery_smart_id, b.battery_id, r.name, b.created_at
ORDER BY battery_age
LIMIT 10;
```

### Track Rider Impact on Batteries

```sql
-- Riders and their battery history
SELECT
  r.name as rider_name,
  b.battery_smart_id,
  b.vehicle_id,
  v.vehicle_number,
  AGE(NOW(), b.created_at) as battery_usage_duration
FROM riders r
LEFT JOIN batteries b ON r.battery_smart_id = b.battery_smart_id
LEFT JOIN vehicles v ON b.vehicle_id = v.id
WHERE r.rider_id = 'R001'
ORDER BY b.created_at DESC;
```

### Identify Maintenance Issues

```sql
-- Batteries currently in use by riders
SELECT
  r.name as rider_name,
  b.battery_smart_id,
  b.battery_id,
  v.vehicle_number,
  b.status,
  AGE(NOW(), b.created_at) as age
FROM riders r
JOIN batteries b ON r.battery_smart_id = b.battery_smart_id
JOIN vehicles v ON b.vehicle_id = v.id
WHERE b.status = 'MAPPED'
ORDER BY b.created_at DESC;
```

---

## Migration & Deployment

### Run the Migration

```bash
psql -U [user] -d [database] -f migrations/add_battery_smart_id.sql
```

### Changes Applied

1. ✅ Added `battery_smart_id` column to `batteries` table
2. ✅ Added `battery_smart_id` column to `riders` table
3. ✅ Created CHECK constraints for format validation
4. ✅ Created auto-uppercase triggers
5. ✅ Created validation function `validate_battery_smart_id()`
6. ✅ Created indexes for fast lookups

### Backward Compatibility

- ✅ New column is NULLABLE
- ✅ Existing data not affected
- ✅ Validation only applies to new/updated records
- ✅ Can be populated gradually

---

## Error Codes & Messages

| Error Code | Cause | User Message |
|------------|-------|--------------|
| `INVALID_BATTERY_SMART_ID` | Format doesn't match pattern | "Invalid Battery Smart ID format. Must be 8 uppercase letters/numbers (e.g., BS12AB34)." |
| `RIDER_NOT_FOUND` | Rider ID doesn't exist | "Rider not found. Please check the rider ID." |
| `DATABASE_ERROR` | Database operation failed | "Failed to update rider Battery Smart ID. Please try again." |
| `UNEXPECTED_ERROR` | Unexpected error | "An unexpected error occurred while updating Battery Smart ID." |

---

## Testing

### Unit Tests

```typescript
import { validateBatterySmartId, formatBatterySmartId } from '@/lib/validation/batterySmartId';

describe('Battery Smart ID Validation', () => {
  test('accepts valid format', () => {
    const result = validateBatterySmartId('BS12AB34');
    expect(result.isValid).toBe(true);
  });

  test('rejects lowercase', () => {
    const result = validateBatterySmartId('bs12ab34');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('uppercase');
  });

  test('rejects wrong length', () => {
    const result = validateBatterySmartId('BS12AB');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('8 characters');
  });

  test('formats correctly', () => {
    expect(formatBatterySmartId('BS12AB34')).toBe('BS12-AB34');
  });
});
```

---

## Future Enhancements

1. **Battery Change History** - Track all rider-to-battery assignments over time
2. **Performance Degradation** - Monitor battery health metrics over time
3. **Predictive Maintenance** - Alert when batteries near end of life
4. **Rider Impact Score** - Calculate how each rider affects battery longevity
5. **Automatic Rotation** - Redistribute batteries to balance wear

---

## Resources

- **Validation Function**: `/src/lib/validation/batterySmartId.ts`
- **Update Function**: `/src/lib/riders/updateRiderBatterySmartId.ts`
- **Migration**: `/migrations/add_battery_smart_id.sql`
- **Database Function**: `validate_battery_smart_id(TEXT)` (PostgreSQL)
