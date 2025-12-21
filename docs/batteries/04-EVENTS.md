# Battery Events Tracking

## Overview

The `battery_events` table tracks all lifecycle changes to batteries, providing a complete audit trail. Every map, unmap, and edit operation is automatically logged.

## Goal

Maintain an immutable log of all battery state changes for:
- Audit trail
- Debugging
- Usage analytics
- Compliance reporting

## Events Tracked

### CREATE
- **When**: Battery is inserted into `batteries` table
- **What**: New battery record created
- **Auto-logged**: Yes (via trigger)
- **Example**:
  ```
  Battery BAT00001 created with status ACTIVE
  ```

### MAP
- **When**: `vehicle_id` changes from NULL to a value
- **What**: Battery assigned to a vehicle
- **Auto-logged**: Yes (via trigger)
- **Example**:
  ```
  Battery BAT00001 mapped to vehicle EVP001
  Previous: null → New: 550e8400-...
  ```

### UNMAP
- **When**: `vehicle_id` changes from a value to NULL
- **What**: Battery unassigned from a vehicle
- **Auto-logged**: Yes (via trigger)
- **Example**:
  ```
  Battery BAT00001 unmapped from vehicle EVP001
  Previous: 550e8400-... → New: null
  ```

### UPDATE
- **When**: Any field is modified (except vehicle_id changes)
- **What**: Battery details updated
- **Auto-logged**: Yes (via trigger)
- **Tracked fields**:
  - `status` (ACTIVE → MAPPED → UNMAPPED)
  - `zone_id`
  - `retrofit_date`
  - `location`
  - `battery_plan`
- **Example**:
  ```
  Battery BAT00001 updated: status ACTIVE → MAPPED
  ```

### DELETE
- **When**: Battery is deleted from `batteries` table
- **What**: Battery record removed
- **Auto-logged**: Yes (via trigger)
- **Example**:
  ```
  Battery BAT00001 deleted by admin
  ```

## Table Schema

```typescript
export type BatteryEvent = {
  id: string;                    // UUID primary key
  battery_id: string;            // Reference to battery
  event_type: 'CREATE' | 'MAP' | 'UNMAP' | 'UPDATE' | 'DELETE';
  vehicle_id: string | null;     // Vehicle ID for MAP events
  previous_vehicle_id: string | null;  // Old vehicle ID for MAP/UNMAP
  reason: string | null;         // Description of why event occurred
  performed_by: string | null;   // User who triggered event
  changes: Record<string, any>;  // JSON object with field changes
  created_at: string;            // ISO 8601 timestamp
};
```

## Field Details

### battery_id
- Foreign key to `batteries.battery_id`
- Cascading delete (deleting battery deletes all its events)
- Indexed for fast queries

### event_type
- **CREATE**: Battery created
- **MAP**: Battery assigned to vehicle
- **UNMAP**: Battery unassigned from vehicle
- **UPDATE**: Battery fields modified
- **DELETE**: Battery deleted

### vehicle_id
- UUID reference to vehicle
- Populated for MAP events
- NULL for other event types

### previous_vehicle_id
- Vehicle ID before MAP/UNMAP operation
- Helps understand the transition
- Example: `null → '550e8400...'` for MAP

### reason
- Human-readable description
- Auto-populated by trigger ("Battery created", "Battery mapped to vehicle", etc.)
- Can be overridden via application code

### performed_by
- User or system identifier
- Set to `current_user` by trigger
- Can be populated by application

### changes
- JSONB object with field changes
- Structure varies by event type
- **For CREATE**: Initial values
- **For MAP/UNMAP**: Old and new vehicle_id
- **For UPDATE**: Fields that changed
- **For DELETE**: Pre-deletion values

**Example UPDATE changes**:
```json
{
  "status": {
    "old": "ACTIVE",
    "new": "MAPPED"
  },
  "zone_id": {
    "old": "ZONE1234",
    "new": "ZONE5678"
  }
}
```

### created_at
- Automatically set to current UTC time
- Immutable (never updated)
- Indexed for efficient chronological queries

## Indexes

```sql
-- Fast lookup by battery
CREATE INDEX idx_battery_events_battery_id ON battery_events(battery_id);

-- Fast filtering by event type
CREATE INDEX idx_battery_events_event_type ON battery_events(event_type);

-- Fast queries for specific vehicles
CREATE INDEX idx_battery_events_vehicle_id ON battery_events(vehicle_id);

-- Fast chronological queries
CREATE INDEX idx_battery_events_created_at ON battery_events(created_at);

-- Fast queries by user
CREATE INDEX idx_battery_events_performed_by ON battery_events(performed_by);
```

## TypeScript Usage

### Query All Events for a Battery

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BatteryEvent = Database['public']['Tables']['battery_events']['Row'];

async function getBatteryHistory(batteryId: string): Promise<BatteryEvent[]> {
  const { data, error } = await supabase
    .from('battery_events')
    .select('*')
    .eq('battery_id', batteryId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
```

### Query MAP Events Only

```typescript
async function getBatteryMappings(batteryId: string) {
  const { data } = await supabase
    .from('battery_events')
    .select('*')
    .eq('battery_id', batteryId)
    .eq('event_type', 'MAP')
    .order('created_at', { ascending: false });

  return data || [];
}
```

### Get Recent Changes

```typescript
async function getRecentBatteryChanges(days: number = 7) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const { data } = await supabase
    .from('battery_events')
    .select('*')
    .gte('created_at', sinceDate.toISOString())
    .order('created_at', { ascending: false });

  return data || [];
}
```

### Get Battery Timeline

```typescript
async function getBatteryTimeline(batteryId: string) {
  const { data } = await supabase
    .from('battery_events')
    .select('battery_id, event_type, vehicle_id, reason, performed_by, created_at')
    .eq('battery_id', batteryId)
    .order('created_at', { ascending: true });

  return data?.map(event => ({
    timestamp: new Date(event.created_at),
    type: event.event_type,
    description: `${event.event_type}: ${event.reason}`,
    performedBy: event.performed_by,
    vehicleId: event.vehicle_id
  })) || [];
}
```

## Automatic Logging

All events are logged automatically via database triggers. No application code needed.

### How It Works

1. **User Updates Battery**: `UNMAP`
   ```typescript
   await supabase
     .from('batteries')
     .update({ vehicle_id: null })
     .eq('battery_id', 'BAT00001');
   ```

2. **Trigger Fires**: `log_battery_map_unmap_trigger`
   - Detects vehicle_id changed from value → null
   - Type detected as `UNMAP`

3. **Event Inserted**:
   ```
   battery_events table receives new row:
   - battery_id: 'BAT00001'
   - event_type: 'UNMAP'
   - vehicle_id: null
   - previous_vehicle_id: '550e8400-...'
   - reason: 'Battery unmapped from vehicle'
   - created_at: NOW()
   ```

### Trigger Functions

#### log_battery_create_event()
- Fires: AFTER INSERT on batteries
- Logs: CREATE event with initial values

#### log_battery_map_unmap_trigger()
- Fires: AFTER UPDATE on batteries
- Detects: vehicle_id changes
- Logs: MAP, UNMAP, or UPDATE events

#### log_battery_delete_event()
- Fires: BEFORE DELETE on batteries
- Logs: DELETE event with pre-deletion values

## Testing

Run comprehensive event tests:

```bash
npm run test:battery-events
```

**Test Coverage**:
- ✓ Table existence
- ✓ CREATE event logging
- ✓ MAP event logging
- ✓ UNMAP event logging
- ✓ UPDATE event logging
- ✓ Complete event timeline

## Real-World Examples

### Example 1: Battery Lifecycle

```
Timeline for BAT00001:
─────────────────────────────────────────────────────────────
1. [CREATE] 2025-01-15 10:30:00
   Battery created with status=ACTIVE

2. [UPDATE] 2025-01-15 11:45:00
   Status changed: ACTIVE → MAPPED

3. [MAP] 2025-01-15 12:00:00
   Mapped to vehicle EVP001

4. [UNMAP] 2025-01-16 14:30:00
   Unmapped from vehicle EVP001

5. [UPDATE] 2025-01-16 14:35:00
   Zone changed: ZONE1234 → ZONE5678

6. [MAP] 2025-01-17 09:00:00
   Mapped to vehicle EVP003
```

### Example 2: Audit Report

```typescript
async function generateBatteryAuditReport(batteryId: string) {
  const events = await getBatteryHistory(batteryId);

  console.log(`\nBattery Audit Report: ${batteryId}`);
  console.log('='.repeat(60));

  events.forEach(event => {
    console.log(`\n${event.created_at}`);
    console.log(`Event: ${event.event_type}`);
    if (event.reason) console.log(`Reason: ${event.reason}`);
    if (event.performed_by) console.log(`By: ${event.performed_by}`);
    if (event.vehicle_id) console.log(`Vehicle: ${event.vehicle_id}`);
    if (event.changes) console.log(`Changes: ${JSON.stringify(event.changes, null, 2)}`);
  });
}
```

### Example 3: Usage Analytics

```typescript
async function getBatteryUsageStats(batteryId: string) {
  const events = await getBatteryHistory(batteryId);

  const stats = {
    created: events.find(e => e.event_type === 'CREATE')?.created_at,
    deleted: events.find(e => e.event_type === 'DELETE')?.created_at,
    mapCount: events.filter(e => e.event_type === 'MAP').length,
    unmapCount: events.filter(e => e.event_type === 'UNMAP').length,
    updateCount: events.filter(e => e.event_type === 'UPDATE').length,
    isMapped: events[events.length - 1]?.event_type === 'MAP'
  };

  return stats;
}
```

## Performance

### Query Performance

- **By battery_id**: ~1ms (indexed)
- **By event_type**: ~1ms (indexed)
- **By vehicle_id**: ~1ms (indexed)
- **Chronological**: ~1-5ms (indexed)

### Storage

- ~500 bytes per event
- 10,000 events ≈ 5 MB
- Index overhead ≈ 2 MB per 10,000 events

## Best Practices

1. **Always query with battery_id filter**
   ```typescript
   // Good
   .eq('battery_id', batteryId)

   // Inefficient (full table scan)
   .eq('event_type', 'MAP')
   ```

2. **Use order and limit for recent changes**
   ```typescript
   .order('created_at', { ascending: false })
   .limit(10)
   ```

3. **Archive old events periodically**
   ```typescript
   // Keep only 2 years of events
   .gte('created_at', twoYearsAgo)
   ```

4. **Display user-friendly event summaries**
   ```typescript
   const summary = {
     'CREATE': 'Battery added to system',
     'MAP': 'Battery assigned to vehicle',
     'UNMAP': 'Battery removed from vehicle',
     'UPDATE': 'Battery details updated',
     'DELETE': 'Battery removed from system'
   };
   ```

## Compliance

This audit trail supports:
- ✓ Regulatory compliance
- ✓ Data integrity verification
- ✓ Change tracking
- ✓ User accountability
- ✓ Dispute resolution
- ✓ Operational analysis

## Troubleshooting

### Events Not Being Logged?

1. Check table exists: `npm run test:battery-events`
2. Verify triggers are enabled:
   ```sql
   SELECT * FROM pg_trigger WHERE tgrelname = 'batteries';
   ```
3. Check RLS policies allow inserts

### Missing Changes in JSON?

- Only changed fields are recorded
- Use IS DISTINCT FROM operator for comparison
- Null values are tracked separately

### Performance Issues?

- Add index on battery_id (already done)
- Archive old events to separate table
- Consider partitioning by created_at

## Next Steps

1. Deploy migration: `migrations/create_battery_events_table.sql`
2. Test: `npm run test:battery-events`
3. Create UI component to display timeline
4. Integrate with activity feed
5. Build audit reports

## Support

For questions about battery events:
1. Check this documentation
2. Review migration SQL
3. Run test suite: `npm run test:battery-events`
4. Check database logs for trigger errors
