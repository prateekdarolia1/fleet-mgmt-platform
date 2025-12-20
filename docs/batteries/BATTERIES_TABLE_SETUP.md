# Batteries Table Setup Guide

## Overview

This guide explains how to create the `batteries` table in Supabase for managing battery inventory.

## Table Specification

| Field | Type | Constraints | Default |
|-------|------|-------------|---------|
| `id` | UUID | PK | `gen_random_uuid()` |
| `battery_id` | TEXT | UNIQUE, NOT NULL | - |
| `service_provider` | ENUM | BATTERY_SMART, OTHER | - |
| `zone_id` | TEXT | nullable | - |
| `retrofit_date` | DATE | nullable | - |
| `location` | ENUM | NOIDA, OTHER | - |
| `usc_id` | TEXT | nullable | - |
| `battery_plan` | ENUM | D2D, B2B, OTHER | - |
| `status` | ENUM | ACTIVE, MAPPED, UNMAPPED | ACTIVE |
| `vehicle_id` | UUID | FK to vehicles(id) | nullable |
| `created_at` | TIMESTAMP TZ | NOT NULL | NOW() |
| `updated_at` | TIMESTAMP TZ | NOT NULL | NOW() |

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `kkxxnpfwvlbsqvmbirqa`
3. Navigate to **SQL Editor**
4. Create a new query
5. Copy the SQL from `migrations/create_batteries_table.sql`
6. Click **Execute**
7. Verify success (should see no errors)

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already done
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref kkxxnpfwvlbsqvmbirqa

# Run the migration
supabase migration new create_batteries_table
# Copy the SQL from migrations/create_batteries_table.sql into the new migration file
supabase db push
```

### Option 3: Direct SQL Execution (If you have admin access)

Execute the SQL file directly:

```bash
psql -h db.kkxxnpfwvlbsqvmbirqa.supabase.co -U postgres -d postgres -f migrations/create_batteries_table.sql
```

## Verification

After creating the table, run the verification script:

```bash
node verify-batteries-table.mjs
```

Expected output:

```
✅ Batteries table created successfully
✅ Enums defined: service_provider, battery_location, battery_plan, battery_status
✅ Indexes created: battery_id, vehicle_id, status
✅ RLS policies enabled
```

## Usage Examples

### Insert a battery

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase
  .from('batteries')
  .insert([
    {
      battery_id: 'BAT-001',
      service_provider: 'BATTERY_SMART',
      zone_id: 'Z001',
      retrofit_date: '2025-01-15',
      location: 'NOIDA',
      usc_id: 'USC-001',
      battery_plan: 'D2D',
      status: 'ACTIVE',
      vehicle_id: null
    }
  ]);
```

### Map a battery to a vehicle

```typescript
const { data, error } = await supabase
  .from('batteries')
  .update({
    vehicle_id: 'vehicle-uuid-here',
    status: 'MAPPED'
  })
  .eq('battery_id', 'BAT-001');
```

### Query batteries by status

```typescript
const { data, error } = await supabase
  .from('batteries')
  .select('*')
  .eq('status', 'ACTIVE');
```

### Get battery with vehicle details

```typescript
const { data, error } = await supabase
  .from('batteries')
  .select(`
    *,
    vehicles(id, vehicle_number, make, model)
  `)
  .eq('battery_id', 'BAT-001');
```

## Acceptance Criteria

- ✅ `battery_id` is unique (enforced by UNIQUE constraint)
- ✅ Default status is 'ACTIVE' (enforced by DEFAULT constraint)
- ✅ Foreign key relationship to vehicles table
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Indexes for performance optimization
- ✅ Row Level Security (RLS) policies enabled
- ✅ All enums properly defined

## Next Steps

1. Execute the SQL migration
2. Run the verification script
3. Update TypeScript types: Run `npx supabase gen types typescript` to regenerate `src/integrations/supabase/types.ts`
4. Create a custom hook: `src/hooks/useBatteries.ts`
5. Add UI components for battery management

## Troubleshooting

### "Type already exists" error

- The enums might already be created from a previous attempt
- Solution: Drop the enums first and re-run the migration:

  ```sql
  DROP TYPE IF EXISTS service_provider CASCADE;
  DROP TYPE IF EXISTS battery_location CASCADE;
  DROP TYPE IF EXISTS battery_plan CASCADE;
  DROP TYPE IF EXISTS battery_status CASCADE;
  ```

### "Permission denied" error

- Your user role doesn't have DDL permissions
- Solution: Use a role with higher privileges (postgres user or similar)

### Foreign key constraint error

- The `vehicles` table doesn't exist
- Verify that the vehicles table is already created by running: `SELECT COUNT(*) FROM vehicles;`

## Security Considerations

- RLS policies are enabled and restrict access to authenticated users
- All enums are type-safe and prevent invalid values
- Foreign key constraint prevents orphaned battery records
- Indexes ensure query performance on large datasets
