# Battery System Integration Guide

## Complete Setup Checklist

### Phase 1: Database Setup

- [ ] **Create batteries table**
  ```bash
  # Copy migrations/create_batteries_table.sql
  # Paste into Supabase SQL Editor
  # Execute
  ```

- [ ] **Add validation constraints**
  ```bash
  # Copy migrations/add_batteries_validation.sql
  # Paste into Supabase SQL Editor
  # Execute
  ```

- [ ] **Create battery_events table**
  ```bash
  # Copy migrations/create_battery_events_table.sql
  # Paste into Supabase SQL Editor
  # Execute
  ```

- [ ] **Verify setup**
  ```bash
  npm run verify:batteries
  npm run test:batteries-validation
  npm run test:battery-events
  ```

### Phase 2: TypeScript Types

- [ ] **Generate types**
  ```bash
  npx supabase gen types typescript --project-id kkxxnpfwvlbsqvmbirqa --output ./src/integrations/supabase/types.ts
  ```

- [ ] **Verify types include**:
  - `batteries` table
  - `battery_events` table
  - All enum types

### Phase 3: Custom Hooks

- [ ] **Create useBatteries hook** (`src/hooks/useBatteries.ts`)
- [ ] **Create useBatteryEvents hook** (`src/hooks/useBatteryEvents.ts`)

### Phase 4: UI Components

- [ ] **Create battery management component**
- [ ] **Create battery mapping component**
- [ ] **Create event timeline component**

### Phase 5: Integration

- [ ] **Add to dashboard**
- [ ] **Test end-to-end**
- [ ] **Deploy to production**

---

## Phase 1 Details: Database Setup

### Step 1.1: Create Batteries Table

**File**: `migrations/create_batteries_table.sql`

```bash
# 1. Go to Supabase Dashboard
# URL: https://app.supabase.com/project/kkxxnpfwvlbsqvmbirqa/sql

# 2. Create new query

# 3. Copy the SQL file content:
cat migrations/create_batteries_table.sql

# 4. Paste into SQL editor and execute
```

**Expected output**: No errors, new table created

### Step 1.2: Add Validation Constraints

**File**: `migrations/add_batteries_validation.sql`

```bash
# 1. Go to Supabase SQL Editor

# 2. Copy validation migration:
cat migrations/add_batteries_validation.sql

# 3. Execute in SQL editor
```

**Expected output**: No errors, constraints added

### Step 1.3: Create Events Table

**File**: `migrations/create_battery_events_table.sql`

```bash
# 1. Go to Supabase SQL Editor

# 2. Copy events migration:
cat migrations/create_battery_events_table.sql

# 3. Execute in SQL editor
```

**Expected output**: No errors, events table created with triggers

### Step 1.4: Verify Installation

```bash
# Run verification suite
npm run verify:batteries

# Expected output:
# ✅ Batteries table exists (X records)
# ✅ Vehicles table accessible
# ✅ Foreign key working

# Run validation tests
npm run test:batteries-validation

# Expected output:
# 🎉 ALL VALIDATION TESTS PASSED!

# Run event tests
npm run test:battery-events

# Expected output:
# 🎉 ALL TESTS PASSED!
```

---

## Phase 2 Details: TypeScript Types

### Step 2.1: Generate Types

```bash
npx supabase gen types typescript \
  --project-id kkxxnpfwvlbsqvmbirqa \
  --output ./src/integrations/supabase/types.ts
```

### Step 2.2: Verify Types

Check that `src/integrations/supabase/types.ts` includes:

```typescript
// Should have these tables:
Database['public']['Tables']['batteries']
Database['public']['Tables']['battery_events']

// Should have these enums:
Database['public']['Enums']['service_provider']
Database['public']['Enums']['battery_location']
Database['public']['Enums']['battery_plan']
Database['public']['Enums']['battery_status']
Database['public']['Enums']['battery_event_type']
```

---

## Phase 3 Details: Custom Hooks

### Step 3.1: Create useBatteries Hook

**File**: `src/hooks/useBatteries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Battery = Database['public']['Tables']['batteries']['Row'];
type BatteryInsert = Database['public']['Tables']['batteries']['Insert'];
type BatteryUpdate = Database['public']['Tables']['batteries']['Update'];

const BATTERIES_KEY = 'batteries';

export function useBatteries() {
  const queryClient = useQueryClient();

  // Fetch all batteries
  const { data: batteries, isLoading, error } = useQuery({
    queryKey: [BATTERIES_KEY],
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
      queryClient.invalidateQueries({ queryKey: [BATTERIES_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [BATTERIES_KEY] });
    }
  });

  // Unmap battery
  const unmapBatteryMutation = useMutation({
    mutationFn: async (batteryId: string) => {
      const { data, error } = await supabase
        .from('batteries')
        .update({
          vehicle_id: null,
          status: 'ACTIVE'
        })
        .eq('battery_id', batteryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BATTERIES_KEY] });
    }
  });

  // Update battery
  const updateBatteryMutation = useMutation({
    mutationFn: async ({ batteryId, updates }: { batteryId: string; updates: BatteryUpdate }) => {
      const { data, error } = await supabase
        .from('batteries')
        .update(updates)
        .eq('battery_id', batteryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BATTERIES_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [BATTERIES_KEY] });
    }
  });

  return {
    // Query
    batteries,
    isLoading,
    error,

    // Mutations
    addBattery: addBatteryMutation.mutate,
    mapBattery: mapBatteryMutation.mutate,
    unmapBattery: unmapBatteryMutation.mutate,
    updateBattery: updateBatteryMutation.mutate,
    deleteBattery: deleteBatteryMutation.mutate,

    // Status
    isAdding: addBatteryMutation.isPending,
    isMapping: mapBatteryMutation.isPending,
    isUnmapping: unmapBatteryMutation.isPending,
    isUpdating: updateBatteryMutation.isPending,
    isDeleting: deleteBatteryMutation.isPending
  };
}
```

### Step 3.2: Create useBatteryEvents Hook

**File**: `src/hooks/useBatteryEvents.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BatteryEvent = Database['public']['Tables']['battery_events']['Row'];

export function useBatteryEvents(batteryId: string) {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['battery-events', batteryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battery_events')
        .select('*')
        .eq('battery_id', batteryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BatteryEvent[];
    },
    enabled: !!batteryId
  });

  return {
    events,
    isLoading,
    error,
    timeline: events?.reverse() || []  // Chronological order
  };
}
```

---

## Phase 4 Details: UI Components

### Step 4.1: Battery Management Component

**File**: `src/components/fleet/BatteryManagement.tsx`

```typescript
import { useBatteries } from '@/hooks/useBatteries';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function BatteryManagement() {
  const { batteries, isLoading, mapBattery, unmapBattery } = useBatteries();
  const { toast } = useToast();

  const handleMapBattery = (batteryId: string, vehicleId: string) => {
    mapBattery(
      { batteryId, vehicleId },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: `Battery mapped to vehicle`
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive'
          });
        }
      }
    );
  };

  const handleUnmapBattery = (batteryId: string) => {
    unmapBattery(batteryId, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: `Battery unmapped from vehicle`
        });
      }
    });
  };

  if (isLoading) return <div>Loading batteries...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Battery Management</h2>

      {batteries?.map(battery => (
        <div key={battery.id} className="border p-4 rounded">
          <h3 className="font-semibold">{battery.battery_id}</h3>
          <p className="text-sm text-gray-600">Status: {battery.status}</p>

          {battery.vehicle_id ? (
            <Button onClick={() => handleUnmapBattery(battery.battery_id)}>
              Unmap from Vehicle
            </Button>
          ) : (
            <Button onClick={() => handleMapBattery(battery.battery_id, 'vehicle-id')}>
              Map to Vehicle
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Step 4.2: Event Timeline Component

**File**: `src/components/fleet/BatteryTimeline.tsx`

```typescript
import { useBatteryEvents } from '@/hooks/useBatteryEvents';
import { formatDate } from '@/lib/utils';

export function BatteryTimeline({ batteryId }: { batteryId: string }) {
  const { timeline, isLoading } = useBatteryEvents(batteryId);

  if (isLoading) return <div>Loading events...</div>;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Event Timeline</h3>

      {timeline.map(event => (
        <div key={event.id} className="border-l-2 pl-4 pb-4">
          <div className="font-semibold">{event.event_type}</div>
          <div className="text-sm text-gray-600">
            {formatDate(event.created_at)}
          </div>
          {event.reason && <div className="text-sm">{event.reason}</div>}
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 5: End-to-End Testing

### Test Scenario: Battery Lifecycle

```typescript
async function testBatteryLifecycle() {
  // 1. Create battery
  const battery = await addBattery({
    battery_id: 'BAT99999',
    service_provider: 'BATTERY_SMART',
    battery_plan: 'D2D'
  });

  // Verify CREATE event logged
  let events = await getBatteryEvents('BAT99999');
  assert(events.some(e => e.event_type === 'CREATE'));

  // 2. Map to vehicle
  await mapBattery('BAT99999', 'vehicle-uuid');

  // Verify MAP event logged
  events = await getBatteryEvents('BAT99999');
  assert(events.some(e => e.event_type === 'MAP'));

  // 3. Update status
  await updateBattery('BAT99999', { status: 'MAPPED' });

  // Verify UPDATE event logged
  events = await getBatteryEvents('BAT99999');
  assert(events.some(e => e.event_type === 'UPDATE'));

  // 4. Unmap from vehicle
  await unmapBattery('BAT99999');

  // Verify UNMAP event logged
  events = await getBatteryEvents('BAT99999');
  assert(events.some(e => e.event_type === 'UNMAP'));

  // 5. Delete battery
  await deleteBattery('BAT99999');

  // Verify DELETE event logged
  events = await getBatteryEvents('BAT99999');
  assert(events.some(e => e.event_type === 'DELETE'));

  console.log('✅ All lifecycle tests passed!');
}
```

---

## Deployment Checklist

- [ ] All migrations applied to production database
- [ ] Types regenerated
- [ ] Hooks created and tested
- [ ] UI components implemented
- [ ] End-to-end testing completed
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Monitoring enabled for database triggers

---

## Support Resources

- **Setup**: `docs/batteries/01-SETUP.md`
- **Schema**: `docs/batteries/02-SCHEMA.md`
- **Validation**: `docs/batteries/03-VALIDATION.md`
- **Events**: `docs/batteries/04-EVENTS.md`
- **Integration**: This file

## Quick Commands

```bash
# Setup
npm run setup:batteries

# Test table
npm run verify:batteries

# Test validation
npm run test:batteries-validation

# Test events
npm run test:battery-events

# View documentation
ls -la docs/batteries/

# View migrations
ls -la migrations/create_battery*
ls -la migrations/add_battery*
```

Ready to build amazing battery management features! 🔋
