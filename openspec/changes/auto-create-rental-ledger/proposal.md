# Proposal: Auto-Create & Manage Rental Ledger

**Change ID:** `auto-create-rental-ledger`
**Status:** Draft
**Created:** 2026-03-07
**Priority:** High

---

## Summary

When a CBU (Complete Business Unit = Battery + Rider + Vehicle) becomes ready for deployment, automatically create a rental ledger, prompt for rental start date and security deposit, generate weekly payment entries (2 weeks upfront, then incrementally), and surface pending payments in a notification UI.

---

## Problem Statement

Current process requires manual ledger creation and manual tracking of weekly rental payments. This leads to:
- Missed payments due to lack of automated reminders
- Delayed onboarding when CBUs are ready
- No single source-of-truth for rental history per rider+vehicle
- Wasted data from pre-creating 6 months of payments when riders churn early

---

## Proposed Solution

### Trigger Point
When a rider is activated (duty_status: IDLE → LIVE) with a vehicle and battery, the system:
1. Auto-creates a `rental_ledgers` record with status `pending_start`
2. Opens a modal prompting admin for rental start date and security deposit
3. Upon confirmation, generates first 2 weekly payment entries

### Incremental Payment Generation
- Only 2 weeks created upfront (prevents data waste on rider attrition)
- Subsequent weeks created 6 days before due date via pg_cron job
- Reminders sent via Supabase Edge Functions

### Payment Tracking Enhancements
- Capture UPI last-4 digits for verification
- Track `received_by` user for accountability
- Support partial payments

---

## User Story

**As** an operations agent,
**I want** the system to auto-create a rental ledger when a CBU is ready,
**So that** I can track rent due, receive payments with proof, and get notified of pending/overdue payments.

---

## Scope

### In Scope
- New `rental_ledgers` table (separate from `rider_ledgers`)
- New `rental_payments` table (separate from `payments`)
- Auto-ledger creation on rider activation
- Modal for rental start date & deposit confirmation
- Weekly payment entry generation (2 weeks upfront, incremental thereafter)
- Payment marking with UPI last-4 and received_by fields
- Notifications table for pending/overdue payments
- Admin notification UI with quick actions

### Out of Scope (Future Enhancements)
- Payment gateway integrations (full UPI payment processing)
- Automatic bank reconciliation
- Complex billing rules (discounts, prorations)
- SMS/WhatsApp notification delivery (infrastructure only)

---

## Success Metrics

1. **Zero missed ledgers**: Every activated rider has a rental ledger
2. **Reduced onboarding time**: Ledger creation < 30 seconds from activation
3. **Payment visibility**: Admins see all pending/overdue in one view
4. **Data efficiency**: < 20% unused payment entries (vs current ~50% with 6-month pre-generation)

---

## Dependencies

- Existing `rider_ledgers` table (kept for rider info, not rental tracking)
- Existing `vehicles` and `riders` tables
- Existing rider activation flow in `RiderManagement.tsx`
- Supabase pg_cron extension
- Supabase Edge Functions (for notifications)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Admin closes modal without confirming | Ledger remains in `pending_start` status, visible in dashboard |
| Rider deactivates before rental starts | Ledger status → `cancelled`, no payments generated |
| Concurrent activation attempts | Use database transactions and row-level locking |

---

## Timeline Estimate

- **Phase 1**: Database schema & migrations (1-2 days)
- **Phase 2**: Backend logic & RPC functions (2-3 days)
- **Phase 3**: Frontend modal & ledger UI (2-3 days)
- **Phase 4**: pg_cron jobs & Edge Functions (1-2 days)
- **Phase 5**: Testing & rollout (1-2 days)

**Total**: 7-12 days

---

## Alternatives Considered

1. **Extend existing `rider_ledgers`**: Rejected - mixes rider info with rental tracking, harder to maintain
2. **Pre-generate all payments**: Rejected - causes data waste on rider attrition
3. **Manual ledger creation only**: Rejected - prone to human error and delays
