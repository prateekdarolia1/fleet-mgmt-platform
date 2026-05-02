# Fleet Management Platform — Database Schema Reference

> Generated: 2026-04-03. Based on full analysis of all 70+ SQL migration files.

---

## Custom Enums

| Enum | Values |
|------|--------|
| `vehicle_status` | `Ready for Deployment`, `Deployed`, `Under Maintenance` |
| `vehicle_type` | `High Speed`, `Low Speed` |
| `battery_type` | `Fixed`, `Swappable` |
| `rider_status` | `active`, `inactive`, `suspended`, `deboarded` |
| `rental_plan` | `daily`, `weekly`, `monthly` |
| `payment_status` | `pending`, `paid`, `overdue`, `partial`, `cancelled` |
| `payment_mode` | `cash`, `upi`, `bank-transfer`, `card` |
| `payment_type` | `security_deposit`, `rental` |
| `battery_status` | `ACTIVE`, `MAPPED`, `UNMAPPED` |
| `service_provider` | `BATTERY_SMART`, `OTHER` |
| `battery_location` | `NOIDA`, `OTHER` |
| `battery_plan` | `D2D`, `B2B`, `OTHER` |
| `battery_event_type` | `CREATE`, `MAP`, `UNMAP`, `UPDATE`, `DELETE` |
| `ledger_status` | `active`, `paused`, `closed` |
| `security_deposit_status` | `retained`, `refunded`, `partially_refunded` |
| `rental_frequency` | `daily`, `weekly`, `monthly` |

---

## Tables

### `vehicles`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| vehicle_number | TEXT | NO | — | UNIQUE |
| make | TEXT | NO | — | |
| model | TEXT | NO | — | |
| color | TEXT | NO | — | |
| chassis_number | TEXT | NO | — | UNIQUE |
| motor_serial_number | TEXT | NO | — | UNIQUE |
| delivery_date | DATE | NO | — | |
| vendor | TEXT | NO | — | |
| pdi_done_by | TEXT | NO | — | |
| registration_received | BOOLEAN | NO | false | |
| insurance_received | BOOLEAN | NO | false | |
| portable_charger_received | BOOLEAN | NO | false | |
| vehicle_type | vehicle_type | NO | — | |
| battery_type | battery_type | NO | — | |
| status | vehicle_status | NO | 'Ready for Deployment' | |
| rider_id | TEXT | YES | — | Plain text, no FK to riders |
| rider_name | TEXT | YES | — | |
| rental_start_date | DATE | YES | — | |
| rental_end_date | DATE | YES | — | |
| next_maintenance_date | DATE | NO | — | |
| location | TEXT | YES | — | |
| battery_id | UUID | YES | — | FK → batteries.id ON DELETE SET NULL |
| battery_smart_id | TEXT | YES | — | External 7-8 char ID |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | auto-updated |

**Indexes:** `idx_vehicles_battery_id` (WHERE battery_id IS NOT NULL)
**Triggers:** `update_vehicles_updated_at` (BEFORE UPDATE)
**RLS:** ENABLED — authenticated users full access
**Real-time:** ENABLED (REPLICA IDENTITY FULL)

---

### `riders`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| rider_id | TEXT | NO | — | UNIQUE |
| name | TEXT | NO | — | |
| phone | TEXT | NO | — | |
| email | TEXT | NO | — | |
| status | rider_status | NO | 'active' | |
| vehicle_assigned | TEXT | YES | — | |
| rental_plan | rental_plan | NO | — | |
| join_date | DATE | NO | — | |
| last_payment_date | DATE | YES | — | |
| license_document | BOOLEAN | NO | false | |
| aadhar_document | BOOLEAN | NO | false | |
| agreement_document | BOOLEAN | NO | false | |
| address | TEXT | NO | — | |
| battery_smart_id | TEXT | YES | — | CHECK: `^[A-Z0-9]{8}$` |
| duty_status | TEXT | YES | 'IDLE' | CHECK: `IDLE` \| `LIVE` |
| first_name | TEXT | YES | — | |
| last_name | TEXT | YES | — | |
| mobile_number | TEXT | YES | — | |
| dob | DATE | YES | — | |
| aadhaar_number | TEXT | YES | — | |
| pan_number | TEXT | YES | — | |
| address_line1 | TEXT | YES | — | |
| address_line2 | TEXT | YES | — | |
| city | TEXT | YES | — | |
| state | TEXT | YES | — | |
| pincode | TEXT | YES | — | |
| address_google_link | TEXT | YES | — | |
| marital_status | TEXT | YES | — | CHECK: `SINGLE` \| `MARRIED` |
| dependent_name | TEXT | YES | — | |
| dependent_relation | TEXT | YES | — | CHECK: `FATHER` \| `MOTHER` \| `BROTHER` \| `SPOUSE` \| `OTHER` |
| dependent_aadhaar | TEXT | YES | — | |
| bank_name | TEXT | YES | — | |
| branch_name | TEXT | YES | — | |
| ifsc_code | TEXT | YES | — | |
| account_number | TEXT | YES | — | |
| aggregator | TEXT | YES | — | CHECK: `SWIGGY` \| `ZOMATO` \| `ZEPTO` \| `BLINKIT` \| `BIGBASKET` \| `OTHER` |
| aggregator_other | TEXT | YES | — | |
| aggregator_id | TEXT | YES | — | |
| joined_since | DATE | YES | — | |
| avg_earnings_15_days | INTEGER | YES | — | |
| onboarded_by | TEXT | YES | — | CHECK: `SHUBHAM` \| `VAIBHAV` |
| aggregator_credentials_checked | BOOLEAN | YES | false | |
| id_credentials_checked | BOOLEAN | YES | false | |
| retained_document_details | TEXT | YES | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | auto-updated |

**Indexes:** `idx_riders_battery_smart_id`
**Triggers:** `update_riders_updated_at`, `auto_uppercase_rider_battery_smart_id`
**RLS:** ENABLED — authenticated users full access

---

### `payments`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| payment_id | TEXT | NO | — | UNIQUE (format: P###) |
| rider_id | TEXT | NO | — | Plain text, no FK to riders |
| rider_name | TEXT | NO | — | |
| amount | DECIMAL(10,2) | NO | — | |
| due_date | DATE | NO | — | |
| payment_date | DATE | YES | — | |
| status | payment_status | NO | 'pending' | |
| payment_mode | payment_mode | YES | — | |
| rental_period | TEXT | NO | — | |
| payment_type | payment_type | NO | 'rental' | |
| ledger_id | UUID | YES | — | FK → rider_ledgers.id ON DELETE CASCADE |
| cancelled_at | TIMESTAMPTZ | YES | — | |
| cancelled_by | TEXT | YES | — | |
| notes | TEXT | YES | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | auto-updated |

**Indexes:** `idx_payments_status`, `idx_payments_ledger_status (ledger_id, status)`
**Triggers:** `update_payments_updated_at`
**RLS:** ENABLED — authenticated users full access

---

### `batteries`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| battery_id | TEXT | NO | — | UNIQUE |
| service_provider | service_provider | NO | — | |
| zone_id | TEXT | YES | — | |
| retrofit_date | DATE | YES | — | |
| location | battery_location | YES | — | |
| usc_id | TEXT | YES | — | |
| battery_plan | battery_plan | YES | — | |
| status | battery_status | NO | 'ACTIVE' | |
| vehicle_id | UUID | YES | — | FK → vehicles.id ON DELETE SET NULL |
| battery_smart_id | TEXT | YES | — | UNIQUE, CHECK: `^[A-Z0-9]{8}$` |
| swaps_allowed_per_month | INTEGER | YES | 4 | DEPRECATED — use rider_ledgers instead |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | auto-updated |

**Indexes:** `idx_batteries_battery_id`, `idx_batteries_vehicle_id`, `idx_batteries_status`, `idx_batteries_battery_smart_id`
**Triggers:** `log_battery_create_trigger`, `log_battery_map_unmap_trigger`, `log_battery_delete_trigger`, `auto_uppercase_battery_smart_id`
**RLS:** ENABLED — authenticated users full access

---

### `rider_ledgers`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| rider_id | TEXT | NO | — | UNIQUE, plain text ref to riders.rider_id |
| rider_name | TEXT | NO | — | |
| security_deposit_amount | NUMERIC | NO | — | |
| rental_frequency | rental_frequency | NO | — | |
| rental_amount | NUMERIC | NO | — | |
| rental_start_date | DATE | NO | — | |
| swaps_allowed_per_month | INTEGER | YES | 4 | CHECK: 0–99 |
| status | ledger_status | YES | 'active' | |
| paused_at | TIMESTAMPTZ | YES | — | |
| paused_reason | TEXT | YES | — | |
| reactivated_at | TIMESTAMPTZ | YES | — | |
| security_deposit_status | security_deposit_status | YES | 'retained' | |
| deposit_refunded_at | TIMESTAMPTZ | YES | — | |
| deposit_refunded_amount | NUMERIC | YES | — | |
| created_at | TIMESTAMPTZ | NO | now() | |
| updated_at | TIMESTAMPTZ | NO | now() | auto-updated |

**Indexes:** `idx_ledgers_status`
**Triggers:** `update_rider_ledgers_updated_at`
**RLS:** ENABLED — authenticated users full access

---

### `rental_ledgers`
PK: `id` UUID — **RPC layer (synced from rider_ledgers)**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| rider_id | TEXT | NO | — | |
| rider_name | TEXT | NO | — | |
| vehicle_id | UUID | YES | — | FK → vehicles.id ON DELETE SET NULL |
| vehicle_number | TEXT | YES | — | |
| rental_start_date | DATE | YES | — | |
| rental_amount | DECIMAL(10,2) | NO | 0 | |
| security_deposit | DECIMAL(10,2) | YES | — | |
| security_deposit_status | TEXT | YES | 'pending' | CHECK: `pending` \| `collected` \| `refunded` |
| status | TEXT | NO | 'pending_start' | CHECK: `pending_start` \| `active` \| `suspended` \| `closed` \| `cancelled` |
| responsible_user_id | UUID | YES | — | FK → profiles.id ON DELETE SET NULL |
| paused_at | TIMESTAMPTZ | YES | — | |
| paused_reason | TEXT | YES | — | |
| reactivated_at | TIMESTAMPTZ | YES | — | |
| deposit_refunded_at | TIMESTAMPTZ | YES | — | |
| deposit_refunded_amount | NUMERIC(10,2) | YES | — | |
| notes | TEXT | YES | — | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | auto-updated |
| created_by | UUID | YES | — | FK → profiles.id ON DELETE SET NULL |

**Indexes:** `idx_rental_ledgers_rider_id`, `idx_rental_ledgers_vehicle_id`, `idx_rental_ledgers_status`, `idx_rental_ledgers_one_active_per_rider` (UNIQUE WHERE status IN ('pending_start','active','suspended'))
**Triggers:** `trigger_rental_ledgers_updated_at`
**RLS:** ENABLED — authenticated users full access

---

### `rental_payments`
PK: `id` UUID — **RPC layer (synced from payments)**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| ledger_id | UUID | NO | — | FK → rental_ledgers.id ON DELETE CASCADE |
| week_number | INTEGER | NO | — | UNIQUE with ledger_id |
| due_date | DATE | NO | — | |
| amount_due | DECIMAL(10,2) | NO | — | |
| paid_amount | DECIMAL(10,2) | YES | 0 | |
| balance | DECIMAL(10,2) | — | GENERATED | `amount_due - COALESCE(paid_amount, 0)` STORED |
| status | TEXT | NO | 'pending' | CHECK: `pending` \| `partial` \| `paid` \| `overdue` \| `waived` |
| payment_date | DATE | YES | — | |
| payment_mode | TEXT | YES | — | CHECK: `cash` \| `upi` \| `bank-transfer` \| `card` \| `other` |
| upi_last4 | CHAR(4) | YES | — | |
| received_by | UUID | YES | — | FK → profiles.id ON DELETE SET NULL |
| external_ref | TEXT | YES | — | |
| last_reminder_at | TIMESTAMPTZ | YES | — | |
| reminder_count | INTEGER | YES | 0 | |
| notes | TEXT | YES | — | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | auto-updated |

**Indexes:** `idx_rental_payments_ledger_id`, `idx_rental_payments_due_date`, `idx_rental_payments_status`, `idx_rental_payments_overdue` (WHERE status IN ('pending','partial'))
**Triggers:** `trigger_rental_payments_updated_at`
**RLS:** ENABLED — authenticated users full access

---

### `notifications`
PK: `id` UUID

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | gen_random_uuid() | PK |
| target_user_id | UUID | NO | — | FK → profiles.id ON DELETE CASCADE |
| type | TEXT | NO | — | CHECK: `payment_due` \| `payment_overdue` \| `payment_received` \| `ledger_created` \| `ledger_pending_confirmation` |
| title | TEXT | NO | — | |
| message | TEXT | NO | — | |
| payload | JSONB | YES | '{}' | |
| read | BOOLEAN | YES | false | |
| read_at | TIMESTAMPTZ | YES | — | |
| action_url | TEXT | YES | — | |
| action_label | TEXT | YES | — | |
| priority | TEXT | YES | 'normal' | CHECK: `low` \| `normal` \| `high` \| `urgent` |
| expires_at | TIMESTAMPTZ | YES | — | |
| created_at | TIMESTAMPTZ | YES | now() | |

**Indexes:** `idx_notifications_target_user`, `idx_notifications_unread`, `idx_notifications_type`, `idx_notifications_unread_by_user`
**RLS:** ENABLED — users see own notifications only; service role has full access

---

### `battery_events`
PK: `id` UUID

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| battery_id | TEXT | NO | FK → batteries.battery_id ON DELETE CASCADE |
| event_type | battery_event_type | NO | |
| vehicle_id | UUID | YES | |
| previous_vehicle_id | UUID | YES | |
| reason | TEXT | YES | |
| performed_by | TEXT | YES | |
| changes | JSONB | YES | |
| created_at | TIMESTAMPTZ | NO | default now() |

**RLS:** ENABLED — authenticated users read/insert

---

### `vehicle_events`
PK: `id` UUID

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| vehicle_id | UUID | NO | FK → vehicles.id ON DELETE CASCADE |
| event_type | TEXT | NO | CHECK: `CREATE` \| `MAP_BATTERY` \| `UNMAP_BATTERY` \| `UPDATE` \| `DELETE` \| `STATUS_CHANGE` \| `ASSIGN_RIDER` \| `UNASSIGN_RIDER` |
| battery_id | UUID | YES | FK → batteries.id ON DELETE SET NULL |
| rider_id | UUID | YES | FK → riders.id ON DELETE SET NULL |
| previous_status | TEXT | YES | |
| new_status | TEXT | YES | |
| reason | TEXT | YES | |
| performed_by | TEXT | YES | |
| changes | JSONB | YES | |
| created_at | TIMESTAMPTZ | NO | default now() |

**RLS:** ENABLED — SELECT/INSERT: true

---

### `rider_events`
PK: `id` UUID

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| rider_id | UUID | NO | FK → riders.id ON DELETE CASCADE |
| event_type | TEXT | NO | CHECK: `CREATE` \| `UPDATE` \| `DELETE` \| `STATUS_CHANGE` \| `DUTY_STATUS_CHANGE` \| `ASSIGN_VEHICLE` \| `UNASSIGN_VEHICLE` |
| vehicle_id | UUID | YES | FK → vehicles.id ON DELETE SET NULL |
| previous_status / new_status | TEXT | YES | |
| previous_duty_status / new_duty_status | TEXT | YES | |
| reason | TEXT | YES | |
| performed_by | TEXT | YES | |
| changes | JSONB | YES | |
| created_at | TIMESTAMPTZ | NO | default now() |

**RLS:** ENABLED — SELECT/INSERT: true

---

### `data_import_batches`
PK: `id` UUID

Tracks ERP-grade CSV import jobs. Columns: `batch_name`, `source_file`, `import_date`, `data_period_start/end`, `records_total/created/updated/skipped`, `defaults_applied` JSONB, `warnings` JSONB, `status` (pending→in_progress→completed/failed/rolled_back), `imported_by`, `notes`.

---

### `retroactive_events`
PK: `id` UUID

Point-in-time audit trail for historical data imports. Columns: `entity_type` (rider/vehicle/battery/payment/rental_ledger), `entity_id`, `event_type`, `effective_date`, `recorded_date`, `event_data` JSONB, `source`, `confidence` DECIMAL(3,2), `import_batch_id` FK → data_import_batches.

---

### `places`
PK: `id` UUID

Geographic data. Columns: `state_or_ut`, `type`, `cities` JSONB, `pincodes` JSONB. GIN indexes on JSONB columns.

---

## FK Cascade Summary

| Child Table | FK Column | References | ON DELETE |
|-------------|-----------|------------|-----------|
| vehicles | battery_id | batteries.id | SET NULL |
| batteries | vehicle_id | vehicles.id | SET NULL |
| payments | ledger_id | rider_ledgers.id | CASCADE |
| rider_events | rider_id | riders.id | CASCADE |
| rider_events | vehicle_id | vehicles.id | SET NULL |
| vehicle_events | vehicle_id | vehicles.id | CASCADE |
| vehicle_events | battery_id | batteries.id | SET NULL |
| vehicle_events | rider_id | riders.id | SET NULL |
| battery_events | battery_id | batteries.battery_id | CASCADE |
| rental_ledgers | vehicle_id | vehicles.id | SET NULL |
| rental_payments | ledger_id | rental_ledgers.id | CASCADE |
| notifications | target_user_id | profiles.id | CASCADE |

**⚠️ No FK (plain TEXT rider_id):**
- `vehicles.rider_id` → plain TEXT, no FK
- `payments.rider_id` → plain TEXT, no FK
- `rider_ledgers.rider_id` → plain TEXT, no FK

This means deleting a rider row does NOT cascade to vehicles, payments, or rider_ledgers — those must be cleaned up manually.

---

## RPC Functions

| Function | Purpose |
|----------|---------|
| `map_battery(p_battery_id, p_vehicle_id, p_battery_smart_id, p_user_id)` | Map battery to vehicle with validation |
| `update_vehicle_status(p_vehicle_id, p_new_status, p_user_id)` | Status transition with business rules |
| `validate_battery_smart_id(id)` | Validate 8-char uppercase alphanumeric format |
| `confirm_rental_start(...)` | Confirm rental start (supports retroactive dates) |
| `create_rental_ledger(...)` | Create ledger + generate initial payments |
| `generate_weekly_payments(...)` | Generate payment schedule for a ledger |
| `mark_overdue_payments()` | Cron job — mark past-due pending payments as overdue |
| `mark_rental_payment_paid(...)` | Record payment receipt |
| `update_updated_at_column()` | Shared trigger function for timestamp updates |

---

## Dual-Table Architecture

```
UI Layer (source of truth)          RPC Layer (synced via triggers)
──────────────────────────          ───────────────────────────────
rider_ledgers          ──────────→  rental_ledgers
payments               ──────────→  rental_payments
```

Database triggers auto-sync from source → target on write. Bulk operations use dual-write pattern.

---

## Entity Relationship Summary

```
profiles (1) ──→ (many) user_roles
profiles (1) ──→ (many) notifications
profiles (1) ──→ (many) rental_ledgers (responsible_user_id, created_by)

riders (1) ──→ (1) rider_ledgers (via rider_id TEXT)
riders (1) ──→ (many) rider_events (UUID FK)
riders (1) ──→ (many) payments (via rider_id TEXT)

rider_ledgers (1) ──→ (many) payments (ledger_id UUID FK)

vehicles (1) ──→ (1) batteries (battery_id UUID FK)
vehicles (1) ──→ (many) vehicle_events (UUID FK)
vehicles (1) ──→ (many) rental_ledgers (vehicle_id UUID FK)

batteries (1) ──→ (many) battery_events (battery_id TEXT FK)

rental_ledgers (1) ──→ (many) rental_payments (ledger_id UUID FK)
```
