# Vehicles Battery API Documentation

## Overview

The Vehicles Battery API exposes the battery mapping status for vehicles through a SQL VIEW (`vehicles_with_batteries`) and provides efficient query functions and React hooks. This allows you to:

- Query vehicles with their battery assignment status
- Filter vehicles by battery mapping state
- Get statistics on vehicles with/without batteries
- Search for specific vehicles
- Separate vehicles into "with battery" and "without battery" lists
- Display comprehensive vehicle and battery information together

## Architecture

### SQL View: `vehicles_with_batteries`

The backbone of this API is a SQL VIEW that efficiently joins the `vehicles` and `batteries` tables:

```sql
SELECT
  -- All vehicle fields
  v.id, v.vehicle_number, v.make, v.model, ...,

  -- All battery fields (NULL if no battery mapped)
  b.id AS battery_id, b.battery_id AS battery_identifier, ...,

  -- Computed fields
  CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS battery_mapped,
  CASE WHEN b.id IS NOT NULL THEN b.battery_id ELSE NULL END AS mapped_battery_id
FROM vehicles v
LEFT JOIN batteries b ON v.id = b.vehicle_id;
```

**Key Features:**
- LEFT JOIN ensures all vehicles are included, even those without batteries
- Battery fields are NULL when no battery is mapped
- `battery_mapped` boolean flag for easy filtering
- `mapped_battery_id` convenience field for quick access to battery identifier

---

## Data Types

### `VehicleWithBattery` Interface

Extended vehicle data with battery information:

```typescript
interface VehicleWithBattery extends Vehicle {
  // Battery fields (NULL if no battery)
  battery_id?: string | null;
  battery_identifier?: string | null;
  service_provider?: 'BATTERY_SMART' | 'OTHER' | null;
  zone_id?: string | null;
  retrofit_date?: string | null;
  battery_location?: 'NOIDA' | 'OTHER' | null;
  usc_id?: string | null;
  battery_plan?: 'D2D' | 'B2B' | 'OTHER' | null;
  battery_status?: 'ACTIVE' | 'MAPPED' | 'UNMAPPED' | null;
  battery_created_at?: string | null;
  battery_updated_at?: string | null;

  // Computed fields
  battery_mapped?: boolean;
  mapped_battery_id?: string | null;
}
```

### `VehicleWithBatteryFilters` Interface

Filtering options:

```typescript
interface VehicleWithBatteryFilters {
  // Vehicle filters
  vehicle_status?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance' | null;
  vehicle_type?: 'High Speed' | 'Low Speed' | null;

  // Battery state filter
  battery_mapped?: boolean | null;        // true = with battery, false = without
  has_battery?: boolean | null;           // Alias for battery_mapped

  // Battery filters
  service_provider?: 'BATTERY_SMART' | 'OTHER' | null;
  battery_status?: 'ACTIVE' | 'MAPPED' | 'UNMAPPED' | null;
  zone_id?: string | null;

  // Search
  search?: string | null;                 // vehicle_number or rider_name

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'vehicle_number' | 'created_at' | 'battery_mapped';
  sortOrder?: 'asc' | 'desc';
}
```

### `VehicleWithBatteryListResult` Interface

API response structure:

```typescript
interface VehicleWithBatteryListResult {
  vehicles: VehicleWithBattery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  stats: {
    total: number;
    with_battery: number;
    without_battery: number;
  };
}
```

---

## Backend Functions

### Main Query Function

#### `listVehiclesWithBatteries(filters?: VehicleWithBatteryFilters)`

Query vehicles with complete battery information and statistics.

**Signature:**
```typescript
export async function listVehiclesWithBatteries(
  filters: VehicleWithBatteryFilters = {}
): Promise<VehicleWithBatteryListResult>
```

**Parameters:**
- `filters.vehicle_status`: Filter by vehicle deployment status
- `filters.vehicle_type`: Filter by vehicle type (High Speed or Low Speed)
- `filters.battery_mapped`: true = with battery, false = without battery
- `filters.service_provider`: Filter by battery service provider
- `filters.battery_status`: Filter by battery status
- `filters.zone_id`: Filter by zone
- `filters.search`: Search vehicle_number or rider_name (partial match, case-insensitive)
- `filters.page`: Page number (1-indexed, defaults to 1)
- `filters.limit`: Results per page (max 100, defaults to 10)
- `filters.sortBy`: Sort field (vehicle_number, created_at, battery_mapped)
- `filters.sortOrder`: Sort direction (asc or desc, defaults to desc)

**Returns:**
```typescript
{
  vehicles: VehicleWithBattery[],    // Paginated results
  total: number,                      // Total matching vehicles
  page: number,                       // Current page
  limit: number,                      // Items per page
  totalPages: number,                 // Total pages
  hasMore: boolean,                   // More pages available
  stats: {
    total: number,                    // Total vehicles in filters
    with_battery: number,             // Vehicles with battery
    without_battery: number           // Vehicles without battery
  }
}
```

**Example:**
```typescript
import { listVehiclesWithBatteries } from '@/lib/vehicles/listVehiclesWithBatteries';

// Get all vehicles with their battery status
const result = await listVehiclesWithBatteries();

// Get vehicles without battery
const result = await listVehiclesWithBatteries({
  battery_mapped: false,
  page: 1,
  limit: 20
});

// Get deployed vehicles without battery
const result = await listVehiclesWithBatteries({
  vehicle_status: 'Deployed',
  battery_mapped: false
});

// Search for specific vehicle
const result = await listVehiclesWithBatteries({
  search: 'VH001',
  page: 1
});

// Get high-speed vehicles with battery from BATTERY_SMART
const result = await listVehiclesWithBatteries({
  vehicle_type: 'High Speed',
  battery_mapped: true,
  service_provider: 'BATTERY_SMART',
  sortBy: 'vehicle_number',
  sortOrder: 'asc'
});
```

---

### Convenience Functions

#### `getVehiclesWithoutBattery(vehicleStatus?)`

Get vehicles that need battery assignment.

**Signature:**
```typescript
export async function getVehiclesWithoutBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
): Promise<VehicleWithBattery[]>
```

**Example:**
```typescript
// Get all vehicles without battery
const vehicles = await getVehiclesWithoutBattery();

// Get deployed vehicles without battery
const vehicles = await getVehiclesWithoutBattery('Deployed');
```

#### `getVehiclesWithBattery(vehicleStatus?)`

Get vehicles that have battery assignment.

**Signature:**
```typescript
export async function getVehiclesWithBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
): Promise<VehicleWithBattery[]>
```

**Example:**
```typescript
// Get all vehicles with battery
const vehicles = await getVehiclesWithBattery();

// Get ready-to-deploy vehicles with battery
const vehicles = await getVehiclesWithBattery('Ready for Deployment');
```

#### `hasVehicleBattery(vehicleId: string)`

Check if a specific vehicle has battery mapped.

**Signature:**
```typescript
export async function hasVehicleBattery(vehicleId: string): Promise<boolean>
```

**Example:**
```typescript
const hasBattery = await hasVehicleBattery('vehicle-uuid-123');
if (!hasBattery) {
  console.log('This vehicle needs a battery');
}
```

#### `getVehicleBattery(vehicleId: string)`

Get battery information for a specific vehicle.

**Signature:**
```typescript
export async function getVehicleBattery(vehicleId: string): Promise<{
  battery_id: string;
  battery_identifier: string;
  service_provider: string;
  zone_id: string;
  retrofit_date: string;
  battery_location: string;
  usc_id: string;
  battery_plan: string;
  battery_status: string;
} | null>
```

**Example:**
```typescript
const battery = await getVehicleBattery('vehicle-uuid-123');
if (battery) {
  console.log(`Vehicle has battery: ${battery.battery_identifier}`);
  console.log(`Zone: ${battery.zone_id}`);
} else {
  console.log('Vehicle has no battery');
}
```

---

## React Hooks

All hooks are available in `src/hooks/useVehiclesWithBatteries.ts` and use TanStack React Query for caching and state management.

### `useVehiclesWithBatteries(filters?, options?)`

Main hook for querying vehicles with battery information.

**Signature:**
```typescript
export function useVehiclesWithBatteries(
  filters: VehicleWithBatteryFilters = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['vehicles-with-batteries', filters],
    queryFn: () => listVehiclesWithBatteries(filters),
    staleTime: 1000 * 60  // 1 minute
  });
}
```

**Example: Basic Usage**
```typescript
import { useVehiclesWithBatteries } from '@/hooks/useVehiclesWithBatteries';

function VehiclesList() {
  const { data, isLoading, error } = useVehiclesWithBatteries();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Total vehicles: {data?.stats.total}</p>
      <p>With battery: {data?.stats.with_battery}</p>
      <p>Without battery: {data?.stats.without_battery}</p>

      <table>
        <thead>
          <tr>
            <th>Vehicle Number</th>
            <th>Status</th>
            <th>Battery</th>
          </tr>
        </thead>
        <tbody>
          {data?.vehicles.map(v => (
            <tr key={v.id}>
              <td>{v.vehicle_number}</td>
              <td>{v.vehicle_status}</td>
              <td>{v.battery_mapped ? v.battery_identifier : 'No Battery'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Example: With Filters**
```typescript
function DeployedWithoutBattery() {
  const { data, isLoading, refetch } = useVehiclesWithBatteries({
    vehicle_status: 'Deployed',
    battery_mapped: false,
    limit: 50
  });

  return (
    <div>
      <h2>Vehicles Needing Batteries ({data?.stats.without_battery})</h2>
      {data?.vehicles.map(v => (
        <div key={v.id}>
          {v.vehicle_number} - {v.rider_name}
        </div>
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

**Example: With Pagination**
```typescript
function VehiclesTableWithPagination() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useVehiclesWithBatteries({
    page,
    limit: 20
  });

  return (
    <div>
      <table>
        {/* Table content */}
      </table>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>

        <span>
          Page {data?.page} of {data?.totalPages}
        </span>

        <button
          disabled={!data?.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### `useVehiclesWithoutBattery(vehicleStatus?)`

Convenience hook for vehicles that need batteries.

**Signature:**
```typescript
export function useVehiclesWithoutBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
) {
  return useQuery({
    queryKey: ['vehicles-without-battery', vehicleStatus],
    queryFn: () => getVehiclesWithoutBattery(vehicleStatus),
    staleTime: 1000 * 60  // 1 minute
  });
}
```

**Example:**
```typescript
function VehiclesNeedingBatteries() {
  const { data: vehiclesWithoutBattery } = useVehiclesWithoutBattery();

  return (
    <div>
      <h3>All Vehicles Needing Batteries ({vehiclesWithoutBattery?.length})</h3>
      {vehiclesWithoutBattery?.map(v => (
        <li key={v.id}>{v.vehicle_number}</li>
      ))}
    </div>
  );
}

function DeployedVehiclesNeedingBatteries() {
  const { data: deployedWithoutBattery } = useVehiclesWithoutBattery('Deployed');

  return (
    <div>
      <h3>Deployed Vehicles Needing Batteries ({deployedWithoutBattery?.length})</h3>
      {deployedWithoutBattery?.map(v => (
        <li key={v.id}>{v.vehicle_number}</li>
      ))}
    </div>
  );
}
```

### `useVehiclesWithBattery(vehicleStatus?)`

Convenience hook for vehicles that have batteries.

**Signature:**
```typescript
export function useVehiclesWithBattery(
  vehicleStatus?: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance'
) {
  return useQuery({
    queryKey: ['vehicles-with-battery', vehicleStatus],
    queryFn: () => getVehiclesWithBattery(vehicleStatus),
    staleTime: 1000 * 60  // 1 minute
  });
}
```

**Example:**
```typescript
function ReadyVehicles() {
  const { data: readyVehicles } = useVehiclesWithBattery('Ready for Deployment');

  return (
    <div>
      <h3>Ready for Deployment ({readyVehicles?.length})</h3>
      {readyVehicles?.map(v => (
        <div key={v.id}>
          <strong>{v.vehicle_number}</strong> - Battery: {v.battery_identifier}
        </div>
      ))}
    </div>
  );
}
```

### `useVehicleBatteryStatus(vehicleId: string)`

Check if a specific vehicle has battery.

**Signature:**
```typescript
export function useVehicleBatteryStatus(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-battery-status', vehicleId],
    queryFn: () => hasVehicleBattery(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60  // 1 minute
  });
}
```

**Example:**
```typescript
function VehicleDetails({ vehicleId }) {
  const { data: hasBattery, isLoading } = useVehicleBatteryStatus(vehicleId);

  return (
    <div>
      {isLoading ? 'Checking...' : (
        <span className={hasBattery ? 'success' : 'warning'}>
          {hasBattery ? '✓ Has Battery' : '⚠ Needs Battery'}
        </span>
      )}
    </div>
  );
}
```

### `useVehicleBatteryInfo(vehicleId: string)`

Get battery information for specific vehicle.

**Signature:**
```typescript
export function useVehicleBatteryInfo(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-battery-info', vehicleId],
    queryFn: () => getVehicleBattery(vehicleId),
    enabled: !!vehicleId,
    staleTime: 1000 * 60  // 1 minute
  });
}
```

**Example:**
```typescript
function VehicleBatteryDetails({ vehicleId }) {
  const { data: battery, isLoading } = useVehicleBatteryInfo(vehicleId);

  if (isLoading) return <div>Loading...</div>;
  if (!battery) return <div>No battery assigned</div>;

  return (
    <div>
      <h4>Battery Information</h4>
      <p><strong>ID:</strong> {battery.battery_identifier}</p>
      <p><strong>Zone:</strong> {battery.zone_id}</p>
      <p><strong>Provider:</strong> {battery.service_provider}</p>
      <p><strong>Status:</strong> {battery.battery_status}</p>
      <p><strong>Plan:</strong> {battery.battery_plan}</p>
      <p><strong>Retrofit Date:</strong> {battery.retrofit_date}</p>
    </div>
  );
}
```

### `useVehicleInventoryWithBatteries(filters?)`

Composite hook combining all vehicle and battery data with statistics.

**Signature:**
```typescript
export function useVehicleInventoryWithBatteries(
  filters: VehicleWithBatteryFilters = {}
) {
  return {
    // All vehicles matching filter
    vehicles: VehicleWithBattery[],
    isLoading: boolean,
    error: Error | null,

    // Statistics
    stats: {
      total: number,
      with_battery: number,
      without_battery: number
    },

    // Pagination
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasMore: boolean
    },

    // Separated lists
    vehiclesWithBattery: VehicleWithBattery[],
    vehiclesWithoutBattery: VehicleWithBattery[],

    // Refetch
    refetch: () => Promise<void>
  };
}
```

**Example:**
```typescript
function VehicleInventoryDashboard() {
  const {
    vehicles,
    stats,
    vehiclesWithoutBattery,
    vehiclesWithBattery,
    isLoading,
    refetch
  } = useVehicleInventoryWithBatteries({ vehicle_status: 'Deployed' });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="stats">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Deployed</p>
        </div>
        <div className="stat-card success">
          <h3>{stats.with_battery}</h3>
          <p>With Battery</p>
        </div>
        <div className="stat-card warning">
          <h3>{stats.without_battery}</h3>
          <p>Need Battery</p>
        </div>
      </div>

      <div className="tabs">
        <div className="tab">
          <h3>Vehicles with Battery ({vehiclesWithBattery.length})</h3>
          {vehiclesWithBattery.map(v => (
            <div key={v.id}>{v.vehicle_number} - {v.battery_identifier}</div>
          ))}
        </div>

        <div className="tab">
          <h3>Vehicles Needing Battery ({vehiclesWithoutBattery.length})</h3>
          {vehiclesWithoutBattery.map(v => (
            <div key={v.id}>{v.vehicle_number} - {v.rider_name}</div>
          ))}
        </div>
      </div>

      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Find Vehicles Without Battery

```typescript
const { data } = useVehiclesWithBatteries({
  battery_mapped: false
});

// All vehicles that don't have batteries
const vehiclesNeedingBatteries = data?.vehicles || [];
```

### Pattern 2: Filter by Status and Battery State

```typescript
const { data } = useVehiclesWithBatteries({
  vehicle_status: 'Deployed',
  battery_mapped: true,
  service_provider: 'BATTERY_SMART'
});

// All BATTERY_SMART batteries on deployed vehicles
```

### Pattern 3: Search and Filter

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filters, setFilters] = useState({});

const { data } = useVehiclesWithBatteries({
  ...filters,
  search: searchTerm,
  page: 1,
  limit: 20
});
```

### Pattern 4: Synchronized Lists

```typescript
const {
  vehiclesWithBattery,
  vehiclesWithoutBattery,
  stats,
  refetch
} = useVehicleInventoryWithBatteries();

// Use separated lists for side-by-side comparison
// Refetch to sync both lists
```

### Pattern 5: Check Individual Vehicle Status

```typescript
async function shouldAssignBattery(vehicleId: string) {
  const hasBattery = await hasVehicleBattery(vehicleId);
  return !hasBattery;  // true if needs battery
}
```

---

## Performance Metrics

### Query Performance

| Query | Typical Time | Notes |
|-------|-------------|-------|
| List all vehicles | 50-150ms | Uses pagination |
| Filter by status | 50-100ms | Indexed filter |
| Filter by battery_mapped | 40-80ms | Indexed computed field |
| Search by vehicle_number | 80-120ms | Full table scan with ILIKE |
| Combined filters | 100-200ms | Multiple indexes used |

### Cache Strategy

- **Query staleTime**: 1 minute (60,000ms)
  - Data considered fresh for 1 minute
  - Subsequent queries use cached data without refetch
  - After 1 minute, data marked as stale but cache still used
  - User interactions trigger a background refetch

### Pagination Guidelines

- **Default limit**: 10 items per page
- **Maximum limit**: 100 items per page
- **Recommended limit**: 20-50 items per page for UI performance
- Use `hasMore` to determine if more pages exist
- Use `totalPages` to show pagination controls

---

## Error Handling

### Common Errors

```typescript
const { data, error, isLoading } = useVehiclesWithBatteries();

if (error) {
  console.error('Failed to load vehicles:', error.message);
  // Show user-friendly error message
}
```

### Retry Strategy

React Query automatically retries failed queries:
- Failed queries retry up to 3 times
- Exponential backoff: 1000ms, 2000ms, 4000ms
- Manual refetch available: `refetch()`

### Network Errors

```typescript
try {
  const result = await listVehiclesWithBatteries({
    vehicle_status: 'Deployed'
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Network error:', error.message);
  }
}
```

---

## Best Practices

1. **Use appropriate filters to reduce data volume**
   - Always filter by status or zone when possible
   - Use pagination for large result sets
   - Avoid loading all vehicles when you only need a subset

2. **Leverage composite hooks for related queries**
   - `useVehicleInventoryWithBatteries()` combines all data
   - Reduces number of separate queries
   - Provides pre-computed statistics

3. **Cache management**
   - Rely on React Query caching (1-minute default)
   - Call `refetch()` only when data should be fresh
   - Don't refetch on every render

4. **Pagination for large datasets**
   - Always use pagination for vehicle listings
   - Limit per page: 20-50 items
   - Use `hasMore` for infinite scroll or "load more" patterns

5. **Search optimization**
   - Search is case-insensitive (ILIKE)
   - Searches vehicle_number and rider_name
   - Use `enabled` option to prevent search before user input:
     ```typescript
     const [term, setTerm] = useState('');
     const { data } = useVehiclesWithBatteries(
       { search: term },
       { enabled: !!term }  // Only search when term exists
     );
     ```

6. **Combined filters**
   - Combine filters to get precise results
   - Example: "Deployed vehicles without battery"
     ```typescript
     {
       vehicle_status: 'Deployed',
       battery_mapped: false
     }
     ```

7. **Type safety**
   - Use TypeScript interfaces for filters
   - IDEs provide autocomplete and type checking
   - Prevents runtime filter errors

---

## Integration Checklist

- [ ] SQL view created: `vehicles_with_batteries`
- [ ] Query functions imported from `@/lib/vehicles/listVehiclesWithBatteries`
- [ ] React hooks imported from `@/hooks/useVehiclesWithBatteries`
- [ ] Filters properly typed with `VehicleWithBatteryFilters`
- [ ] Error handling implemented in components
- [ ] Loading states shown while data fetches
- [ ] Pagination controls working
- [ ] Search functionality working
- [ ] Refetch triggers working
- [ ] Testing against real data complete

---

## Related Documentation

- [Batteries API Documentation](./06-ADD-BATTERY-API.md) - Creating batteries
- [Battery Listings API](./07-LISTING-API.md) - Querying batteries
- [Battery Events](./04-EVENTS.md) - Tracking changes
- [Schema Reference](./02-SCHEMA.md) - Database structure
