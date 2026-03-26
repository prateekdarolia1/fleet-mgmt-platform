# Spec: Table Synchronization

## ADDED Requirements

### Requirement: Rider ledgers must sync to rental ledgers automatically
When a ledger is created or updated in `rider_ledgers`, the system SHALL automatically synchronize the changes to `rental_ledgers` via database triggers.

#### Scenario: New ledger syncs to rental_ledgers
- **WHEN** user creates a new ledger in rider_ledgers
- **THEN** database trigger inserts corresponding row in rental_ledgers
- **AND** all fields are copied (rider_id, rental_amount, status, etc.)
- **AND** sync happens within the same transaction

#### Scenario: Ledger status change syncs
- **WHEN** ledger status changes from "active" to "paused" in rider_ledgers
- **THEN** rental_ledgers status is updated to "paused"
- **AND** paused_at and paused_reason are synced
- **AND** reactivated_at is synced when ledger is reactivated

#### Scenario: Ledger reactivation syncs
- **WHEN** paused ledger is reactivated in rider_ledgers
- **THEN** rental_ledgers status is updated to "active"
- **AND** reactivated_at timestamp is synced
- **AND** new rental_amount is synced if changed

### Requirement: Payments must sync to rental payments automatically
When a payment is created or updated in `payments`, the system SHALL automatically synchronize the changes to `rental_payments` via database triggers.

#### Scenario: New payment syncs to rental_payments
- **WHEN** system creates a payment in payments table
- **THEN** database trigger inserts corresponding row in rental_payments
- **AND** all fields are copied (ledger_id, due_date, amount_due, status, week_number)

#### Scenario: Payment status change syncs
- **WHEN** payment status changes from "pending" to "paid" in payments
- **THEN** rental_payments status is updated to "paid"
- **AND** sync happens atomically with the update

#### Scenario: Bulk payment insert syncs
- **WHEN** system inserts 50 retroactive payments in payments table
- **THEN** all 50 payments are synced to rental_payments via triggers
- **AND** no payments are lost during sync

### Requirement: Handle sync conflicts gracefully
If a sync operation fails due to conflicting data or schema issues, the system SHALL log the error and continue without failing the primary operation.

#### Scenario: Trigger failure logging
- **WHEN** sync trigger fails to insert into rental_ledgers
- **THEN** error is logged to sync_errors table
- **AND** primary operation (insert into rider_ledgers) succeeds
- **AND** system continues normally

#### Scenario: On conflict do update
- **WHEN** syncing to a row that already exists in rental_ledgers
- **THEN** system updates the existing row instead of failing
- **AND** all changed fields are updated

### Requirement: Support dual-write for bulk operations
For bulk payment operations (retroactive generation, gap periods), the system SHALL write to both tables explicitly to ensure immediate consistency.

#### Scenario: Gap period dual-write
- **WHEN** reactivating ledger and generating 10 gap payments
- **THEN** system writes to payments table
- **AND** system writes to rental_payments table in same operation
- **AND** both tables have identical payment data

#### Scenario: Retroactive payment dual-write
- **WHEN** creating ledger with 50 retroactive payments
- **THEN** system writes all payments to payments table
- **AND** system writes all payments to rental_payments table in same operation
- **AND** both tables have identical payment data

### Requirement: Schema alignment before sync
Before implementing sync triggers, the system SHALL ensure both table pairs have compatible schemas.

#### Scenario: Missing columns in rental_ledgers
- **WHEN** rider_ledgers has column that rental_ledgers doesn't
- **THEN** system adds missing column to rental_ledgers first
- **AND** sync trigger references the new column

#### Scenario: Column type mismatch
- **WHEN** rider_ledgers.column is NUMERIC but rental_ledgers.column is INTEGER
- **THEN** system aligns column types before enabling triggers
- **AND** sync succeeds without type conversion errors

### Requirement: Monitor sync health
The system SHALL provide visibility into sync status to detect drift between tables.

#### Scenario: Row count comparison
- **WHEN** system performs health check
- **THEN** system compares row counts: COUNT(rider_ledgers) vs COUNT(rental_ledgers)
- **AND** system compares row counts: COUNT(payments) vs COUNT(rental_payments)
- **AND** alert is raised if counts differ by more than 1%

#### Scenario: Sync repair function
- **WHEN** sync drift is detected between tables
- **THEN** admin can run sync_repair() function
- **AND** function copies missing rows from source to target
- **AND** function updates diverged rows to match source

### Requirement: Trigger error recovery
When triggers fail, the system SHALL provide a way to recover lost syncs.

#### Scenario: Manual sync after trigger failure
- **WHEN** sync_errors table shows failed triggers
- **THEN** admin can run manual_sync_rider_ledger(ledger_id) function
- **AND** function manually copies data from rider_ledgers to rental_ledgers
- **AND** function manually copies payments to rental_payments
