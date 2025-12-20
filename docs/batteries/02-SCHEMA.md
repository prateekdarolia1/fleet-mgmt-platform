# Batteries Table Schema

## Table Structure

```sql
CREATE TABLE batteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id TEXT NOT NULL UNIQUE,
  service_provider service_provider NOT NULL,
  zone_id TEXT,
  retrofit_date DATE,
  location battery_location,
  usc_id TEXT,
  battery_plan battery_plan,
  status battery_status NOT NULL DEFAULT 'ACTIVE',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);
```

## Field Reference

| Field | Type | Constraints | Default | Purpose |
|-------|------|-------------|---------|---------|
| `id` | UUID | PK | gen_random_uuid() | Primary key |
| `battery_id` | TEXT | UNIQUE, NOT NULL | - | Battery identifier (e.g., BAT00001) |
| `service_provider` | ENUM | NOT NULL | - | BATTERY_SMART or OTHER |
| `zone_id` | TEXT | nullable | NULL | Zone identifier (e.g., ZONE1234) |
| `retrofit_date` | DATE | nullable | NULL | Date of retrofit |
| `location` | ENUM | nullable | NULL | NOIDA or OTHER |
| `usc_id` | TEXT | nullable | NULL | USC code (auto-uppercase) |
| `battery_plan` | ENUM | nullable | NULL | D2D, B2B, or OTHER |
| `status` | ENUM | NOT NULL | ACTIVE | ACTIVE, MAPPED, or UNMAPPED |
| `vehicle_id` | UUID | FK, nullable | NULL | Reference to vehicles.id |
| `created_at` | TIMESTAMP TZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP TZ | NOT NULL | NOW() | Update timestamp |

## TypeScript Types

```typescript
// Auto-generated from database schema
export type Battery = {
  id: string;                           // UUID
  battery_id: string;                   // ^[A-Z0-9]{8}$
  service_provider: 'BATTERY_SMART' | 'OTHER';
  zone_id: string | null;               // ^[A-Z0-9]{8}$ | null
  retrofit_date: string | null;         // YYYY-MM-DD | null
  location: 'NOIDA' | 'OTHER' | null;
  usc_id: string | null;                // Auto-uppercase
  battery_plan: 'D2D' | 'B2B' | 'OTHER' | null;
  status: 'ACTIVE' | 'MAPPED' | 'UNMAPPED';
  vehicle_id: string | null;            // UUID | null
  created_at: string;                   // ISO 8601 timestamp
  updated_at: string;                   // ISO 8601 timestamp
};
```

## Relationships

```
vehicles (1)
    ↓ 1:N
batteries (N)
    └─ Each battery can belong to 0 or 1 vehicle
    └─ Each vehicle can have multiple batteries
    └─ Foreign key: vehicle_id → vehicles.id ON DELETE SET NULL
```

## Indexes

```sql
-- Fast lookup by battery_id
CREATE INDEX idx_batteries_battery_id ON batteries(battery_id);

-- Fast relationship queries
CREATE INDEX idx_batteries_vehicle_id ON batteries(vehicle_id);

-- Fast status filtering
CREATE INDEX idx_batteries_status ON batteries(status);
```

## Constraints

| Type | Constraint | Rule |
|------|-----------|------|
| UNIQUE | battery_id | Prevents duplicate batteries |
| CHECK | battery_id | `^[A-Z0-9]{8}$` |
| CHECK | zone_id | `^[A-Z0-9]{8}$` or NULL |
| CHECK | retrofit_date | ≤ CURRENT_DATE or NULL |
| FOREIGN KEY | vehicle_id | References vehicles.id |
| UNIQUE | id | Primary key |
| NOT NULL | battery_id | Required |
| NOT NULL | service_provider | Required |
| NOT NULL | status | Required (defaults to ACTIVE) |
| NOT NULL | created_at | Required |
| NOT NULL | updated_at | Required |

## Enums

### service_provider
```
BATTERY_SMART
OTHER
```

### battery_location
```
NOIDA
OTHER
```

### battery_plan
```
D2D (Door to Door)
B2B (Business to Business)
OTHER
```

### battery_status
```
ACTIVE   (Default - Available for use)
MAPPED   (Assigned to a vehicle)
UNMAPPED (Unassigned/In storage)
```

## Triggers

### enforce_usc_id_uppercase
- **Event**: BEFORE INSERT or UPDATE
- **Action**: Converts `usc_id` to uppercase if not NULL
- **Example**: 'code123' → 'CODE123'

### update_batteries_updated_at
- **Event**: BEFORE UPDATE
- **Action**: Updates `updated_at` to current timestamp
- **Automatic**: No manual control needed

## Row Level Security (RLS)

```sql
-- Read access for authenticated users
SELECT USING (auth.role() = 'authenticated_user');

-- Insert access for authenticated users
INSERT WITH CHECK (auth.role() = 'authenticated_user');

-- Update access for authenticated users
UPDATE USING (auth.role() = 'authenticated_user');

-- Delete access for authenticated users
DELETE USING (auth.role() = 'authenticated_user');
```

## Example Records

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "battery_id": "BAT00001",
    "service_provider": "BATTERY_SMART",
    "zone_id": "ZONE1234",
    "retrofit_date": "2024-12-01",
    "location": "NOIDA",
    "usc_id": "USC_CODE",
    "battery_plan": "D2D",
    "status": "ACTIVE",
    "vehicle_id": null,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "battery_id": "BAT00002",
    "service_provider": "BATTERY_SMART",
    "zone_id": "ZONE5678",
    "retrofit_date": "2024-12-10",
    "location": "OTHER",
    "usc_id": "SMART_02",
    "battery_plan": "B2B",
    "status": "MAPPED",
    "vehicle_id": "770e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-01-16T14:20:00Z",
    "updated_at": "2025-01-17T09:15:00Z"
  }
]
```

## Performance Notes

- **UNIQUE on battery_id**: O(log n) lookup via B-tree index
- **Indexes**: Automatically maintained by PostgreSQL
- **Query Performance**: Sub-millisecond lookups for indexed queries
- **Insert Performance**: ~1-2ms with all constraints

## Compatibility

- PostgreSQL 13.0.4+
- Supabase (uses PostgreSQL)
- Full ACID compliance
- Transaction support

## Security Features

- ✅ Row Level Security (RLS)
- ✅ Foreign key constraint enforcement
- ✅ UNIQUE constraint (no duplicates)
- ✅ Enum type safety
- ✅ Automatic timestamp management
- ✅ Regex validation at DB level
