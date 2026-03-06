# Spec: Rental Ledger Management

**Capability:** `rental-ledger`
**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-03-07

---

## Overview

The Rental Ledger capability manages the financial relationship between the fleet operator and riders who rent vehicles. It tracks rental payments, security deposits, and payment schedules with automated reminders and incremental payment generation.

---

## Business Context

### CBU (Complete Business Unit)
A CBU consists of:
- **Rider**: The person renting the vehicle
- **Vehicle**: The 2-wheeler EV being rented
- **Battery**: The power source (already mapped to vehicle)

A CBU is "ready" when a rider is activated with a vehicle and battery.

### Revenue Model
- Weekly rental payments collected in advance
- One-time security deposit collected at rental start
- Payments tracked per week with due dates

---

## Functional Requirements

### FR-1: Auto Ledger Creation

**When**: A rider's duty_status changes from `IDLE` to `LIVE` with a vehicle assigned

**Then**: The system SHALL automatically create a `rental_ledgers` record with:
- `status = 'pending_start'`
- `rider_id`, `rider_name` from rider record
- `vehicle_id`, `vehicle_number` from assigned vehicle
- `rental_amount` from rider's rental plan

**Acceptance Criteria**:
- [ ] Ledger created within 1 second of activation
- [ ] Ledger visible in admin dashboard immediately
- [ ] No duplicate ledgers for same rider while active

### FR-2: Rental Start Confirmation

**When**: A ledger is in `pending_start` status

**Then**: The system SHALL prompt the admin to confirm:
1. Rental start date (required, must be within 2 days of activation)
2. Security deposit amount (optional)
3. Responsible user assignment (optional)

**Acceptance Criteria**:
- [ ] Modal appears automatically after ledger creation
- [ ] Date validation enforces 2-day window with override option
- [ ] Confirmation creates first 2 payment entries
- [ ] Ledger status changes to `active`

### FR-3: Payment Entry Generation

**Initial**: Create 2 weekly payment entries upon rental start confirmation

**Incremental**: Create subsequent payment entries 6 days before due date

**Payment Entry Fields**:
- `week_number`: Sequential (1, 2, 3, ...)
- `due_date`: Start date + (week_number × 7 days)
- `amount_due`: From ledger's rental_amount
- `status`: `pending` by default

**Acceptance Criteria**:
- [ ] Exactly 2 entries created on confirmation
- [ ] Next entry created 6 days before current week's due date
- [ ] No entries created for non-active ledgers

### FR-4: Payment Recording

**When**: Admin records a payment

**Then**: The system SHALL capture:
- `paid_amount`: Amount received (supports partial)
- `payment_mode`: cash | upi | bank-transfer | card | other
- `upi_last4`: Last 4 chars of UPI ID (if UPI mode)
- `received_by`: User ID of person collecting payment
- `payment_date`: Date of payment

**Status Updates**:
- `paid_amount >= amount_due` → status = `paid`
- `0 < paid_amount < amount_due` → status = `partial`
- `paid_amount = 0` → status remains `pending`/`overdue`

**Acceptance Criteria**:
- [ ] Partial payments tracked with remaining balance
- [ ] UPI last-4 validated as exactly 4 characters
- [ ] Audit trail maintained (who, when, how)

### FR-5: Overdue Detection

**When**: A payment's due_date has passed and status is `pending` or `partial`

**Then**: The system SHALL:
- Update status to `overdue`
- Create notification for responsible user
- Include in overdue dashboard view

**Acceptance Criteria**:
- [ ] Overdue check runs daily at 01:00
- [ ] Status updated within 24 hours of due date
- [ ] Notification created for each newly overdue payment

### FR-6: Reminder Notifications

**When**: Payment is pending or overdue

**Then**: The system SHALL send reminders:
- To responsible user (in-app notification)
- Include: rider name, vehicle, amount, due date, week number
- Actions: Mark paid, View ledger, Call rider

**Frequency**:
- First reminder: When payment becomes overdue
- Subsequent reminders: Every 24 hours if still unpaid
- Max reminders per payment: 7

**Acceptance Criteria**:
- [ ] In-app notification appears in notification center
- [ ] Quick actions available from notification
- [ ] Reminder count tracked per payment

---

## Non-Functional Requirements

### NFR-1: Performance
- Ledger creation: < 1 second
- Payment list load: < 2 seconds for 1000 entries
- Notification delivery: < 5 seconds

### NFR-2: Data Integrity
- Atomic transactions for payment operations
- No orphan payment entries
- Cascade delete payments when ledger deleted

### NFR-3: Security
- RLS enabled on all tables
- Only admins can view/manage ledgers
- Payment details visible only to authorized users

### NFR-4: Auditability
- All changes timestamped
- User attribution for all mutations
- No hard deletes (use status = 'cancelled')

---

## Edge Cases

### EC-1: Rider Deactivation Mid-Rental
- Ledger status → `suspended`
- Pending payments remain (not auto-cancelled)
- Admin can close ledger with outstanding balance

### EC-2: Vehicle Reassignment
- Update `vehicle_id` on ledger
- Historical payments preserve old vehicle reference
- Future payments use new vehicle

### EC-3: Rental Start Date in Past
- Allow with warning
- Generate overdue payments immediately
- Flag for admin review

### EC-4: Multiple Partial Payments
- Track total `paid_amount` (sum of all partials)
- Recalculate balance after each payment
- Mark `paid` when balance reaches zero

### EC-5: Payment Correction
- Allow editing payment details within 24 hours
- Log correction in notes field
- Notify if received_by changes

---

## Data Validation Rules

### Rental Start Date
- Required on confirmation
- Format: ISO date (YYYY-MM-DD)
- Warning if > 2 days from activation
- Cannot be more than 30 days in future

### Security Deposit
- Optional
- Format: Decimal(10,2)
- Min: 0, Max: 100,000
- Cannot be negative

### UPI Last 4
- Required if payment_mode = 'upi'
- Format: Exactly 4 characters
- Allowed: Alphanumeric only
- Uppercase on save

### Paid Amount
- Required when recording payment
- Format: Decimal(10,2)
- Min: 0.01
- Cannot exceed amount_due (use partial status instead)

---

## UI/UX Specifications

### Notification Payload Format
```json
{
  "type": "payment_overdue",
  "rider_name": "Rahul Kumar",
  "rider_id": "R001",
  "vehicle_number": "UP16-AB-1234",
  "amount": 500,
  "due_date": "2026-03-10",
  "week_number": 3,
  "days_overdue": 5
}
```

### Dashboard Metrics
- Total active ledgers
- Pending payments (count + amount)
- Overdue payments (count + amount)
- Collected this month

### Quick Actions
- Mark Paid → Opens payment form
- View Ledger → Navigates to ledger detail
- Call Rider → Opens phone link
- Send Reminder → Manual reminder trigger
