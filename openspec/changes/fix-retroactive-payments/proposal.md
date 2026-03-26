# Proposal: Fix Retroactive Payment Generation

## Why

When creating a new ledger with a past (retroactive) start date, or reactivating a paused ledger, the system fails to generate the required payment entries. This causes:
- Ledgers created with backdated start dates show zero payments
- Reactivated ledgers miss payments for the gap period between pause and reactivation
- Users see "failed to create ledger" errors despite the ledger being created
- Payment tracking becomes incomplete and unreliable

## What Changes

### Payment Generation Fix
- **Retroactive Ledger Creation**: When creating a ledger with a past start date, automatically generate all overdue payment entries from the start date to today
- **Ledger Reactivation Gap Payments**: When reactivating a paused ledger, generate payments for the gap period between `paused_at` and the new `start_date`
- **Payment ID Collision Fix**: Resolve UNIQUE constraint violations on `payment_id` column during bulk payment insertion

### Architecture Cleanup
- **Unify Dual Table System**: Consolidate `rider_ledgers`/`payments` (UI) and `rental_ledgers`/`rental_payments` (RPC) into a single source of truth
- **Remove Orphaned RPC Functions**: Deprecate or update RPC functions that work on unused tables

### UI/UX Improvements
- **Clarify Workflow Separation**: Distinguish between "Rider Activation" (IDLE→LIVE with vehicle assignment) and "Ledger Reactivation" (paused→active with payment generation)
- **Better Error Messages**: Show actual Supabase errors instead of generic "failed to create ledger"

## Capabilities

### New Capabilities
- `retroactive-payment-generation`: Automatic generation of payment entries for historical periods when creating ledgers with past start dates
- `gap-period-payments`: Payment generation for the time period between ledger pause and reactivation
- `payment-id-sequence`: Reliable, collision-free payment ID generation system

### Modified Capabilities
- None (this is fixing broken functionality, not changing established requirements)

## Impact

### Affected Code
- `src/hooks/useRiderLedgers.ts` - `createLedger()` and `reactivateLedger()` functions
- `src/components/fleet/LedgerManagement.tsx` - reactivation dialog and validation
- `src/components/fleet/CreateLedgerForm.tsx` - retroactive entry flow
- `supabase/migrations/` - potential schema changes for payment ID sequencing

### Database Tables
- `rider_ledgers` - main ledger table
- `payments` - payment entries table
- Potential cleanup of `rental_ledgers` and `rental_payments` if unused

### Dependencies
- Supabase PostgreSQL (RLS policies, triggers, functions)
- React Query for state management

### User-Facing Changes
- Ledgers created with past dates will immediately show all overdue payments
- Reactivated ledgers will show complete payment history including gap period
- Clearer distinction between rider activation and ledger reactivation workflows
