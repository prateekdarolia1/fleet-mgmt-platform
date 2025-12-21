# Batteries Table Setup Summary

## Status: ✅ READY FOR DEPLOYMENT

All required files have been created. The batteries table setup is ready to be deployed to your Supabase instance.

---

## Files Created

### 1. **migrations/create_batteries_table.sql**
- Complete SQL migration script with:
  - 4 enums (service_provider, battery_location, battery_plan, battery_status)
  - Batteries table with all specified fields
  - Indexes for performance (battery_id, vehicle_id, status)
  - RLS policies for security
  - Foreign key to vehicles table

### 2. **BATTERIES_TABLE_SETUP.md**
- Detailed setup documentation
- Multiple setup options (Dashboard, CLI, Direct SQL)
- Usage examples in TypeScript
- Troubleshooting guide

### 3. **setup-batteries-table.mjs**
- Interactive setup helper
- Displays SQL migration script
- Step-by-step instructions
- Quick links to Supabase dashboard

### 4. **verify-batteries-table.mjs**
- Comprehensive test suite
- Tests INSERT, UPDATE, SELECT operations
- Verifies constraints (UNIQUE, DEFAULT, FK)
- Validates enum types
- Can be run after table creation

### 5. **package.json** (Updated)
- Added `npm run setup:batteries` command
- Added `npm run verify:batteries` command

---

## Table Specification

```typescript
interface Battery {
  id: UUID                                    // Primary key, auto-generated
  battery_id: string                          // UNIQUE identifier (e.g., BAT-001)
  service_provider: 'BATTERY_SMART' | 'OTHER'
  zone_id?: string
  retrofit_date?: Date
  location?: 'NOIDA' | 'OTHER'
  usc_id?: string
  battery_plan?: 'D2D' | 'B2B' | 'OTHER'
  status: 'ACTIVE' | 'MAPPED' | 'UNMAPPED'   // DEFAULT: 'ACTIVE'
  vehicle_id?: UUID                           // FK to vehicles.id
  created_at: Timestamp                       // Auto-set to NOW()
  updated_at: Timestamp                       // Auto-set to NOW()
}
```

---

## Next Steps

### Step 1: Deploy the Table

**Option A: Using Supabase Dashboard (Recommended)**
```bash
# 1. Open dashboard
# URL: https://app.supabase.com/project/kkxxnpfwvlbsqvmbirqa/sql

# 2. Create new query
# 3. Copy SQL from: ./migrations/create_batteries_table.sql
# 4. Click "Run"
```

**Option B: Using Setup Helper**
```bash
npm run setup:batteries
# Follow the printed instructions
```

**Option C: Using Supabase CLI**
```bash
supabase link --project-ref kkxxnpfwvlbsqvmbirqa
supabase db push
```

### Step 2: Verify Deployment

```bash
npm run verify:batteries
```

Expected output:
```
🔋 Verifying Batteries Table...
Test 1: Checking if batteries table exists...
✅ Batteries table exists
...
🎉 ALL TESTS PASSED - BATTERIES TABLE READY
```

### Step 3: Regenerate TypeScript Types

```bash
npx supabase gen types typescript --project-id kkxxnpfwvlbsqvmbirqa --output ./src/integrations/supabase/types.ts
```

Or if using Supabase CLI:
```bash
supabase gen types typescript > src/integrations/supabase/types.ts
```

### Step 4: Create Custom Hook

Create `src/hooks/useBatteries.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Battery = Database['public']['Tables']['batteries']['Row'];
type BatteryInsert = Database['public']['Tables']['batteries']['Insert'];

export function useBatteries() {
  const queryClient = useQueryClient();

  // Fetch all batteries
  const { data: batteries, isLoading, error } = useQuery({
    queryKey: ['batteries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batteries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Battery[];
    }
  });

  // Add battery
  const addBatteryMutation = useMutation({
    mutationFn: async (battery: BatteryInsert) => {
      const { data, error } = await supabase
        .from('batteries')
        .insert([battery])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batteries'] });
    }
  });

  // Map battery to vehicle
  const mapBatteryMutation = useMutation({
    mutationFn: async ({ batteryId, vehicleId }: { batteryId: string; vehicleId: string }) => {
      const { data, error } = await supabase
        .from('batteries')
        .update({
          vehicle_id: vehicleId,
          status: 'MAPPED'
        })
        .eq('battery_id', batteryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batteries'] });
    }
  });

  // Update battery status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ batteryId, status }: { batteryId: string; status: Battery['status'] }) => {
      const { data, error } = await supabase
        .from('batteries')
        .update({ status })
        .eq('battery_id', batteryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batteries'] });
    }
  });

  // Delete battery
  const deleteBatteryMutation = useMutation({
    mutationFn: async (batteryId: string) => {
      const { error } = await supabase
        .from('batteries')
        .delete()
        .eq('battery_id', batteryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batteries'] });
    }
  });

  return {
    batteries,
    isLoading,
    error,
    addBattery: addBatteryMutation.mutate,
    mapBattery: mapBatteryMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteBattery: deleteBatteryMutation.mutate
  };
}
```

### Step 5: Create UI Component (Optional)

Create `src/components/fleet/BatteryManagement.tsx` for battery management UI.

---

## Acceptance Criteria Checklist

- ✅ **battery_id unique**: UNIQUE constraint enforced at database level
- ✅ **Default status = ACTIVE**: DEFAULT constraint in column definition
- ✅ **Foreign key to vehicles**: REFERENCES vehicles(id) ON DELETE SET NULL
- ✅ **All enums defined**: 4 enums created for type safety
- ✅ **Indexes created**: 3 indexes for query performance
  - `idx_batteries_battery_id` - For unique lookups
  - `idx_batteries_vehicle_id` - For relationship queries
  - `idx_batteries_status` - For filtering by status
- ✅ **RLS enabled**: Row Level Security policies for authenticated users
- ✅ **Timestamps**: created_at and updated_at auto-managed

---

## Troubleshooting

### Problem: "Table already exists"
**Solution**: Drop and recreate using:
```sql
DROP TABLE IF EXISTS batteries CASCADE;
```
Then run the migration again.

### Problem: "Enum already exists"
**Solution**: Drop enums first:
```sql
DROP TYPE IF EXISTS service_provider CASCADE;
DROP TYPE IF EXISTS battery_location CASCADE;
DROP TYPE IF EXISTS battery_plan CASCADE;
DROP TYPE IF EXISTS battery_status CASCADE;
```

### Problem: "Permission denied"
**Solution**: Ensure you're using a role with DDL permissions:
- Use the postgres user (superuser)
- Or grant CREATE privileges to your role

### Problem: Foreign key constraint error
**Solution**: Verify the vehicles table exists:
```sql
SELECT COUNT(*) FROM vehicles;
```

---

## Quick Commands

```bash
# Setup batteries table
npm run setup:batteries

# Verify batteries table is working
npm run verify:batteries

# Regenerate types
npx supabase gen types typescript --project-id kkxxnpfwvlbsqvmbirqa --output ./src/integrations/supabase/types.ts

# View migration SQL
cat ./migrations/create_batteries_table.sql

# View documentation
cat BATTERIES_TABLE_SETUP.md
```

---

## Database Relationships

```
vehicles
  ├─ 1:N → batteries (via vehicle_id FK)
  └─ Each vehicle can have multiple batteries

batteries
  ├─ N:1 → vehicles (via vehicle_id FK)
  └─ Each battery belongs to at most one vehicle
```

---

## Notes

- The batteries table is fully isolated and won't affect existing tables
- All enums are specific to the batteries table
- RLS policies require authentication (anonymous access will be blocked)
- Indexes are automatically maintained by PostgreSQL
- The table is ready for production use once deployed

---

## Support

For questions or issues:
1. Check `BATTERIES_TABLE_SETUP.md` for detailed documentation
2. Review `verify-batteries-table.mjs` output for specific errors
3. Check Supabase logs in the dashboard
4. Verify SQL syntax in `migrations/create_batteries_table.sql`

---

**Created**: 2025-12-20
**Status**: Ready for Deployment
**Version**: 1.0
