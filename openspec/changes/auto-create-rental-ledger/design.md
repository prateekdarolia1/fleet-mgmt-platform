# Design: Auto-Create & Manage Rental Ledger

**Change ID:** `auto-create-rental-ledger`
**Last Updated:** 2026-03-07

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           FRONTEND (React)                               │   │
│  │                                                                          │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │   │
│  │  │ RiderManagement │    │ RentalLedger    │    │ NotificationTab │     │   │
│  │  │   + Activation  │───▶│   ConfirmModal  │    │   (New UI)      │     │   │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘     │   │
│  │           │                      │                      │               │   │
│  └───────────┼──────────────────────┼──────────────────────┼───────────────┘   │
│              │                      │                      │                    │
│              ▼                      ▼                      ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        SUPABASE (PostgreSQL)                            │   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │rental_ledgers│  │rental_      │  │notifications│  │   riders    │    │   │
│  │  │   (NEW)     │──│payments(NEW)│  │   (NEW)     │  │  (existing) │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │         │                │                                            │   │
│  │         │                │                                            │   │
│  │  ┌──────▼────────────────▼──────┐    ┌─────────────────────────────┐  │   │
│  │  │     RPC Functions            │    │      pg_cron Jobs           │  │   │
│  │  │  • create_rental_ledger()    │    │  • generate_week_payments() │  │   │
│  │  │  • confirm_rental_start()    │    │  • mark_overdue_payments()  │  │   │
│  │  │  • mark_payment_paid()       │    │                             │  │   │
│  │  └──────────────────────────────┘    └─────────────────────────────┘  │   │
│  │                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    SUPABASE EDGE FUNCTIONS (Deno)                       │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│  │  │  send-payment-reminder/                                          │    │   │
│  │  │  • Called by pg_cron via webhook                                │    │   │
│  │  │  • Sends notifications to admin (in-app) and rider (future SMS) │    │   │
│  │  └─────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Table: `rental_ledgers` (NEW)

```sql
CREATE TABLE rental_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id TEXT NOT NULL,                    -- FK to riders.rider_id
  rider_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),   -- Can be null if vehicle unassigned
  vehicle_number TEXT,                       -- Denormalized for display

  -- Rental Configuration
  rental_start_date DATE,                    -- NULL until admin confirms
  rental_amount DECIMAL(10,2) NOT NULL,      -- Weekly rent amount
  security_deposit DECIMAL(10,2),            -- One-time deposit
  security_deposit_status TEXT DEFAULT 'pending'
    CHECK (security_deposit_status IN ('pending', 'collected', 'refunded')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_start'
    CHECK (status IN ('pending_start', 'active', 'suspended', 'closed', 'cancelled')),

  -- Assignment
  responsible_user_id UUID REFERENCES profiles(id), -- Who follows up on payments

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(rider_id, status) WHERE status IN ('pending_start', 'active', 'suspended')
    -- Only one active ledger per rider
);
```

### Table: `rental_payments` (NEW)

```sql
CREATE TABLE rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES rental_ledgers(id) ON DELETE CASCADE,

  -- Week Info
  week_number INTEGER NOT NULL,              -- 1, 2, 3, ...
  due_date DATE NOT NULL,                    -- Calculated from rental_start_date

  -- Amount
  amount_due DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),                 -- For partial payments
  balance DECIMAL(10,2) GENERATED ALWAYS AS
    (amount_due - COALESCE(paid_amount, 0)) STORED,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),

  -- Payment Details
  payment_date DATE,
  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'bank-transfer', 'card', 'other')),
  upi_last4 CHAR(4),                         -- Last 4 digits of UPI ID for verification
  received_by UUID REFERENCES profiles(id),  -- Who received the payment
  external_ref TEXT,                         -- Transaction reference

  -- Reminder Tracking
  last_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ledger_id, week_number)
);
```

### Table: `notifications` (NEW)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN (
    'payment_due',
    'payment_overdue',
    'payment_received',
    'ledger_created',
    'ledger_pending_confirmation'
  )),
  payload JSONB NOT NULL,                    -- { rider_name, vehicle_number, amount, due_date, ... }
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,                           -- URL to take action
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications(target_user_id, read, created_at DESC);
```

---

## Enum Extensions

Add to existing enums in `types.ts`:

```typescript
// New rental ledger status
rental_ledger_status: "pending_start" | "active" | "suspended" | "closed" | "cancelled"

// New rental payment status (extends existing)
rental_payment_status: "pending" | "partial" | "paid" | "overdue" | "waived"

// New notification types
notification_type: "payment_due" | "payment_overdue" | "payment_received" | "ledger_created" | "ledger_pending_confirmation"
```

---

## RPC Functions

### `create_rental_ledger(rider_id, vehicle_id, created_by)`

Called when rider is activated. Creates ledger in `pending_start` status.

```sql
CREATE OR REPLACE FUNCTION create_rental_ledger(
  p_rider_id TEXT,
  p_vehicle_id UUID,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_rider_name TEXT;
  v_vehicle_number TEXT;
  v_rental_amount DECIMAL(10,2);
  v_ledger_id UUID;
BEGIN
  -- Get rider info
  SELECT name, rental_amount INTO v_rider_name, v_rental_amount
  FROM riders WHERE rider_id = p_rider_id;

  IF v_rider_name IS NULL THEN
    RAISE EXCEPTION 'Rider not found: %', p_rider_id;
  END IF;

  -- Get vehicle info
  SELECT vehicle_number INTO v_vehicle_number
  FROM vehicles WHERE id = p_vehicle_id;

  -- Create ledger
  INSERT INTO rental_ledgers (
    rider_id, rider_name, vehicle_id, vehicle_number,
    rental_amount, status, created_by
  ) VALUES (
    p_rider_id, v_rider_name, p_vehicle_id, v_vehicle_number,
    COALESCE(v_rental_amount, 0), 'pending_start', p_created_by
  ) RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `confirm_rental_start(ledger_id, start_date, security_deposit, responsible_user_id)`

Confirms rental start and generates first 2 payment entries.

```sql
CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id UUID,
  p_start_date DATE,
  p_security_deposit DECIMAL(10,2) DEFAULT NULL,
  p_responsible_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_rider_id TEXT;
  v_rider_name TEXT;
  v_rental_amount DECIMAL(10,2);
BEGIN
  -- Update ledger
  UPDATE rental_ledgers SET
    rental_start_date = p_start_date,
    security_deposit = p_security_deposit,
    security_deposit_status = CASE WHEN p_security_deposit > 0 THEN 'collected' ELSE 'pending' END,
    responsible_user_id = p_responsible_user_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_ledger_id
  RETURNING rider_id, rider_name, rental_amount INTO v_rider_id, v_rider_name, v_rental_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger not found: %', p_ledger_id;
  END IF;

  -- Generate first 2 weekly payments
  INSERT INTO rental_payments (ledger_id, week_number, due_date, amount_due, status)
  VALUES
    (p_ledger_id, 1, p_start_date + INTERVAL '7 days', v_rental_amount, 'pending'),
    (p_ledger_id, 2, p_start_date + INTERVAL '14 days', v_rental_amount, 'pending');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `mark_rental_payment_paid(payment_id, paid_amount, payment_mode, upi_last4, received_by, notes)`

Marks a payment as paid with full audit trail.

```sql
CREATE OR REPLACE FUNCTION mark_rental_payment_paid(
  p_payment_id UUID,
  p_paid_amount DECIMAL(10,2),
  p_payment_mode TEXT,
  p_upi_last4 CHAR(4) DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_amount_due DECIMAL(10,2);
  v_new_status TEXT;
BEGIN
  SELECT amount_due INTO v_amount_due
  FROM rental_payments WHERE id = p_payment_id;

  IF v_amount_due IS NULL THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Determine status based on payment
  v_new_status := CASE
    WHEN p_paid_amount >= v_amount_due THEN 'paid'
    WHEN p_paid_amount > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE rental_payments SET
    paid_amount = p_paid_amount,
    payment_date = CURRENT_DATE,
    payment_mode = p_payment_mode,
    upi_last4 = p_upi_last4,
    received_by = p_received_by,
    notes = p_notes,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## pg_cron Jobs

### `generate_weekly_payments()` - Daily at 00:00

Creates next week's payment entry 6 days before it's needed.

```sql
-- Schedule the job
SELECT cron.schedule(
  'generate-weekly-payments',
  '0 0 * * *',  -- Daily at midnight
  $$
  INSERT INTO rental_payments (ledger_id, week_number, due_date, amount_due, status)
  SELECT
    rl.id,
    COALESCE(MAX(rp.week_number), 0) + 1,
    rl.rental_start_date + (COALESCE(MAX(rp.week_number), 0) + 1) * INTERVAL '7 days',
    rl.rental_amount,
    'pending'
  FROM rental_ledgers rl
  LEFT JOIN rental_payments rp ON rl.id = rp.ledger_id
  WHERE rl.status = 'active'
    AND rl.rental_start_date IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM rental_payments rp2
      WHERE rp2.ledger_id = rl.id
        AND rp2.due_date <= CURRENT_DATE + INTERVAL '6 days'
        AND rp2.status IN ('pending', 'partial')
    )
  GROUP BY rl.id, rl.rental_start_date, rl.rental_amount;
  $$
);
```

### `mark_overdue_payments()` - Daily at 01:00

```sql
SELECT cron.schedule(
  'mark-overdue-payments',
  '0 1 * * *',  -- Daily at 1 AM
  $$
  UPDATE rental_payments
  SET status = 'overdue', updated_at = NOW()
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;
  $$
);
```

---

## Edge Functions

### `send-payment-reminder/`

Triggered by pg_cron webhook or called directly.

```typescript
// supabase/functions/send-payment-reminder/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get overdue payments with rider info
  const { data: overduePayments } = await supabase
    .from('rental_payments')
    .select(`
      id,
      week_number,
      amount_due,
      balance,
      due_date,
      rental_ledgers!inner (
        rider_id,
        rider_name,
        vehicle_number,
        responsible_user_id
      )
    `)
    .eq('status', 'overdue')
    .is('last_reminder_at', null)
    .or(`last_reminder_at.lt.${new Date(Date.now() - 24*60*60*1000).toISOString()}`)

  // Create notifications for each
  for (const payment of overduePayments || []) {
    const ledger = payment.rental_ledgers

    // Notify responsible user
    if (ledger.responsible_user_id) {
      await supabase.from('notifications').insert({
        target_user_id: ledger.responsible_user_id,
        type: 'payment_overdue',
        payload: {
          rider_name: ledger.rider_name,
          vehicle_number: ledger.vehicle_number,
          amount: payment.balance,
          due_date: payment.due_date,
          week_number: payment.week_number
        },
        action_url: `/rental-ledgers?payment=${payment.id}`
      })
    }

    // Update reminder timestamp
    await supabase
      .from('rental_payments')
      .update({
        last_reminder_at: new Date().toISOString(),
        reminder_count: supabase.rpc('increment', { x: 1 })
      })
      .eq('id', payment.id)
  }

  return new Response(JSON.stringify({ processed: overduePayments?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## Frontend Components

### RentalLedgerConfirmModal

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Confirm Rental Start                                          [X]          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Rider: Rahul Kumar (R001)                                                 │
│  Vehicle: UP16-AB-1234                                                     │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Rental Start Date *                                                 │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │ │ 📅  [Select Date                                          ]      │ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  │ Must be within 2 days of activation                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Security Deposit                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │ │ ₹ [2000                                              ]          │ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  │ Recommended but optional                                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Assign Responsibility (Optional)                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │ │ [Shubham                                          ▼]            │ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  │ This person will receive payment reminders                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                          [Cancel]  [Confirm & Start]       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Rider Activation Flow (Modified)

```
Current:
  handleRiderActivation() → updateRider() + updateVehicle()

New:
  handleRiderActivation() → updateRider() + updateVehicle()
                         → create_rental_ledger() RPC
                         → Open RentalLedgerConfirmModal
                         → On confirm: confirm_rental_start() RPC
```

### 2. Payment Tracking Tab (New Section)

Add "Rental Payments" tab alongside existing "Payment Tracking" tab in `PaymentTracking.tsx`.

---

## Migration Strategy

1. Create new tables (`rental_ledgers`, `rental_payments`, `notifications`)
2. Add RPC functions
3. Set up pg_cron jobs
4. Deploy Edge Function
5. Update frontend components
6. **No data migration** from existing `rider_ledgers` - it remains for rider info

---

## Security Considerations

- **Row Level Security**: Enable RLS on all new tables
- **Service Role**: RPC functions use `SECURITY DEFINER` for elevated access
- **UPI Data**: Only store last 4 digits (no PII)
- **Audit Trail**: `created_by`, `received_by`, `updated_at` on all tables
