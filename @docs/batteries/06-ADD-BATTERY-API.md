# Add Battery API

## Overview

Backend logic for creating new batteries with automatic validation, normalization, and event logging.

**Location**: `src/lib/batteries/addBattery.ts`
**Tests**: `src/__tests__/addBattery.test.ts`

---

## Function: addBattery()

### Signature

```typescript
async function addBattery(input: AddBatteryInput): Promise<AddBatteryResult>
```

### Input

```typescript
interface AddBatteryInput {
  battery_id: string;                          // Required: BAT00001
  service_provider: 'BATTERY_SMART' | 'OTHER'; // Required
  zone_id?: string | null;                     // Optional: ZONE1234
  retrofit_date?: string | null;               // Optional: YYYY-MM-DD
  location?: 'NOIDA' | 'OTHER' | null;         // Optional
  usc_id?: string | null;                      // Optional: code123
  battery_plan?: 'D2D' | 'B2B' | 'OTHER' | null;
}
```

### Output

**Success**:
```typescript
{
  success: true;
  battery: Battery;      // Created battery record
  event: BatteryEvent;   // CREATE event record
}
```

**Error**:
```typescript
{
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

---

## Behavior

### 1. Input Validation
All inputs are validated BEFORE insert:
- ✅ battery_id format: `^[A-Z0-9]{8}$`
- ✅ service_provider: Must be BATTERY_SMART or OTHER
- ✅ zone_id format: `^[A-Z0-9]{8}$` (if provided)
- ✅ battery_plan: Must be D2D, B2B, or OTHER (if provided)
- ✅ location: Must be NOIDA or OTHER (if provided)
- ✅ retrofit_date: Must not be in future (if provided)

### 2. Input Normalization
Before insert, text fields are uppercased:
- battery_id: `bat00001` → `BAT00001`
- zone_id: `zone1234` → `ZONE1234`
- usc_id: `code123` → `CODE123`
- location: `noida` → `NOIDA`

### 3. Default Values
- ✅ status: Defaults to `ACTIVE`
- ✅ vehicle_id: Defaults to `null`
- ✅ Timestamps: Auto-set by database

### 4. Event Logging
Automatically creates a CREATE event (via database trigger):
- Event type: `CREATE`
- Logged immediately after battery insert
- Captures initial battery values in JSONB

---

## Usage Examples

### Basic Usage

```typescript
import { addBattery } from '@/lib/batteries/addBattery';

const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART'
});

if (result.success) {
  console.log('Battery created:', result.battery.battery_id);
  console.log('Status:', result.battery.status); // ACTIVE
  console.log('Event logged:', result.event.event_type); // CREATE
} else {
  console.error('Failed:', result.error);
}
```

### With Optional Fields

```typescript
const result = await addBattery({
  battery_id: 'BAT00002',
  service_provider: 'BATTERY_SMART',
  zone_id: 'ZONE1234',
  battery_plan: 'D2D',
  location: 'NOIDA',
  usc_id: 'code123',
  retrofit_date: '2024-12-25'
});

if (result.success) {
  console.log('Battery:', {
    id: result.battery.battery_id,
    status: result.battery.status,
    zone: result.battery.zone_id,
    plan: result.battery.battery_plan
  });
}
```

### With Error Handling

```typescript
const result = await addBattery({
  battery_id: 'bat00001', // lowercase (will fail validation)
  service_provider: 'BATTERY_SMART'
});

if (!result.success) {
  // Handle validation errors
  if (result.code === 'DUPLICATE_BATTERY_ID') {
    showError('This battery ID is already in use');
  } else if (result.code === 'CONSTRAINT_VIOLATION') {
    showError('Battery data violates database constraints');
  } else if (result.details instanceof Array) {
    // Validation errors
    result.details.forEach(error => console.log(error));
  } else {
    showError(result.error);
  }
}
```

### In a React Hook

```typescript
import { useMutation } from '@tanstack/react-query';
import { addBattery } from '@/lib/batteries/addBattery';
import { useToast } from '@/hooks/use-toast';

export function useAddBattery() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: addBattery,
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Success',
          description: `Battery ${result.battery.battery_id} created`
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Usage in component
function AddBatteryForm() {
  const addMutation = useAddBattery();

  const handleSubmit = (formData) => {
    addMutation.mutate({
      battery_id: formData.batteryId,
      service_provider: formData.serviceProvider,
      // ... other fields
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={addMutation.isPending}>
        {addMutation.isPending ? 'Creating...' : 'Create Battery'}
      </button>
    </form>
  );
}
```

---

## Validation Details

### battery_id
- **Format**: `^[A-Z0-9]{8}$` (8 uppercase alphanumeric characters)
- **Required**: Yes
- **Examples**:
  - ✅ `BAT00001` - Valid
  - ✅ `BAT00002` - Valid
  - ✅ `ABC12345` - Valid
  - ❌ `bat00001` - Lowercase not allowed
  - ❌ `BAT-0001` - Hyphen not allowed
  - ❌ `BAT001` - Too short

### service_provider
- **Values**: `BATTERY_SMART` | `OTHER`
- **Required**: Yes
- **Default**: None (must be provided)
- **Examples**:
  - ✅ `BATTERY_SMART`
  - ✅ `OTHER`
  - ❌ `battery_smart` - Case matters
  - ❌ `INVALID` - Not in enum

### zone_id
- **Format**: `^[A-Z0-9]{8}$` (if provided)
- **Required**: No
- **Nullable**: Yes
- **Examples**:
  - ✅ `ZONE1234`
  - ✅ `Z0000001`
  - ✅ `null` or undefined (optional)
  - ❌ `zone1234` - Lowercase not allowed
  - ❌ `ZONE123` - Too short

### usc_id
- **Auto-uppercase**: Yes (any case accepted, stored as uppercase)
- **Required**: No
- **Nullable**: Yes
- **Examples**:
  - Input: `code123` → Stored: `CODE123`
  - Input: `UsC_Code` → Stored: `USC_CODE`

### battery_plan
- **Values**: `D2D` | `B2B` | `OTHER` | null
- **Required**: No
- **Default**: null
- **Examples**:
  - ✅ `D2D` (Door-to-Door)
  - ✅ `B2B` (Business-to-Business)
  - ✅ `OTHER`
  - ✅ null or undefined
  - ❌ `C2C` - Not in enum

### location
- **Values**: `NOIDA` | `OTHER` | null
- **Required**: No
- **Default**: null
- **Examples**:
  - ✅ `NOIDA`
  - ✅ `OTHER`
  - ✅ null or undefined
  - ❌ `Delhi` - Not in enum
  - ❌ `noida` - Case matters

### retrofit_date
- **Format**: `YYYY-MM-DD` (ISO date string)
- **Constraint**: Cannot be in future
- **Required**: No
- **Default**: null
- **Examples**:
  - ✅ `2024-12-25` (past date)
  - ✅ `2024-01-01`
  - ✅ null or undefined
  - ❌ `2099-12-31` (future date)
  - ❌ `not-a-date` (invalid format)

---

## Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| `DUPLICATE_BATTERY_ID` | Battery ID already exists | battery_id is not unique |
| `CONSTRAINT_VIOLATION` | Data violates database constraints | Format or enum validation failed |
| `VALIDATION_ERROR` | Input validation failed | See error.details for specifics |
| (generic) | Other database error | Connection issues, permissions, etc. |

---

## Automatic Behaviors

### Status Defaults to ACTIVE
```typescript
// Input doesn't include status
const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART'
});

// Output battery has status = 'ACTIVE'
console.log(result.battery.status); // 'ACTIVE'
```

### CREATE Event Logged Automatically
```typescript
// No manual event creation needed
const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART'
});

// Event automatically created by trigger
console.log(result.event.event_type); // 'CREATE'
console.log(result.event.battery_id); // 'BAT00001'
```

### Timestamps Auto-set
```typescript
// created_at and updated_at set by database
const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART'
});

console.log(result.battery.created_at); // Current timestamp
console.log(result.battery.updated_at); // Current timestamp
```

---

## Helper Functions

### isBatteryIdAvailable()

Check if a battery ID is available before attempting to create:

```typescript
import { isBatteryIdAvailable } from '@/lib/batteries/addBattery';

const available = await isBatteryIdAvailable('BAT00001');
if (!available) {
  console.log('Battery ID is taken');
} else {
  // Safe to use this ID
  await addBattery({ battery_id: 'BAT00001', ... });
}
```

### generateBatteryId()

Generate the next battery ID in sequence:

```typescript
import { generateBatteryId } from '@/lib/batteries/addBattery';

const nextId = await generateBatteryId();
console.log(nextId); // 'BAT00001', 'BAT00002', etc.

// Use in form as default value
const [batteryId, setBatteryId] = useState('');

useEffect(() => {
  generateBatteryId().then(setBatteryId);
}, []);
```

---

## Acceptance Criteria

### Battery Appears in Inventory
✅ Battery is inserted into `batteries` table
✅ Immediately queryable by `battery_id`
✅ Visible in inventory listings

### Status = ACTIVE
✅ Automatically set to `ACTIVE` on insert
✅ No manual status update needed
✅ Reflects in returned battery object

### Audit Entry Created
✅ CREATE event automatically logged
✅ Event linked to battery via battery_id
✅ Captured in battery_events table
✅ Includes initial battery values

---

## Performance

- **Validation**: <1ms (regex checks)
- **Insert**: ~2ms (with trigger execution)
- **Event creation**: Automatic (via trigger)
- **Total operation**: ~2-3ms

---

## Security

✅ Parameterized queries (SQL injection prevention)
✅ Type-safe with TypeScript
✅ Enum validation (enum type safety)
✅ Format validation (regex checks)
✅ RLS policies enforced (row-level security)

---

## Troubleshooting

### "Battery ID already exists"
```typescript
// Problem: Trying to create duplicate battery_id
const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART'
});
// Error: DUPLICATE_BATTERY_ID

// Solution: Use unique ID
const nextId = await generateBatteryId();
await addBattery({
  battery_id: nextId, // Will be unique
  service_provider: 'BATTERY_SMART'
});
```

### "Validation failed"
```typescript
// Problem: Invalid input format
const result = await addBattery({
  battery_id: 'bat00001', // lowercase!
  service_provider: 'BATTERY_SMART'
});
// Error: battery_id must be 8 uppercase alphanumeric characters

// Solution: Uppercase the input
await addBattery({
  battery_id: 'BAT00001', // uppercase
  service_provider: 'BATTERY_SMART'
});
```

### "Retrofit date in future"
```typescript
// Problem: Date in future
const result = await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART',
  retrofit_date: '2099-12-31' // future!
});
// Error: retrofit_date cannot be in the future

// Solution: Use past date
await addBattery({
  battery_id: 'BAT00001',
  service_provider: 'BATTERY_SMART',
  retrofit_date: '2024-12-25' // past date
});
```

---

## Best Practices

1. **Always uppercase inputs**
   ```typescript
   // Good
   battery_id: userInput.toUpperCase()

   // Also good - function validates format
   battery_id: 'BAT00001'
   ```

2. **Validate before submit**
   ```typescript
   // In form component
   const errors = validateBatteryInput(formData);
   if (errors.length > 0) {
     showValidationErrors(errors);
     return;
   }
   ```

3. **Handle all error cases**
   ```typescript
   if (!result.success) {
     if (Array.isArray(result.details)) {
       // Validation errors
       showValidationErrors(result.details);
     } else {
       // Database error
       showDatabaseError(result.error);
     }
   }
   ```

4. **Generate IDs when needed**
   ```typescript
   // Auto-generate sequential IDs
   const nextId = await generateBatteryId();
   ```

5. **Use in React with proper loading states**
   ```typescript
   const addMutation = useMutation({
     mutationFn: addBattery,
     onSuccess: (result) => {
       if (result.success) {
         queryClient.invalidateQueries({
           queryKey: ['batteries']
         });
       }
     }
   });
   ```

---

## Testing

Run tests:
```bash
npm test src/__tests__/addBattery.test.ts
```

Test coverage includes:
- ✅ Input validation (all fields)
- ✅ Error handling (all error types)
- ✅ Default values (status = ACTIVE)
- ✅ Event creation
- ✅ Database operations
- ✅ Edge cases

---

## API Reference

See also:
- **Hooks**: `src/hooks/useBatteries.ts`
- **Schema**: `@docs/batteries/02-SCHEMA.md`
- **Validation**: `@docs/batteries/03-VALIDATION.md`
- **Events**: `@docs/batteries/04-EVENTS.md`
