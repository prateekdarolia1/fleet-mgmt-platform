-- Combined Rental Ledger Migration Script
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kkxxnpfwvlbsqvmbirqa/sql/new

-- ============================================
-- Part 1: Create rental_ledgers table
-- ============================================

CREATE TABLE IF NOT EXISTS rental_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id TEXT NOT NULL,
  rider_name TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_number TEXT,

  -- Rental Configuration
  rental_start_date DATE,
  rental_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  security_deposit DECIMAL(10,2),
  security_deposit_status TEXT DEFAULT 'pending'
    CHECK (security_deposit_status IN ('pending', 'collected', 'refunded')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_start'
    CHECK (status IN ('pending_start', 'active', 'suspended', 'closed', 'cancelled')),

  -- Assignment
  responsible_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_rider_id ON rental_ledgers(rider_id);
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_vehicle_id ON rental_ledgers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_status ON rental_ledgers(status);
CREATE INDEX IF NOT EXISTS idx_rental_ledgers_responsible_user ON rental_ledgers(responsible_user_id);

-- Partial unique index: Only one active ledger per rider
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_ledgers_one_active_per_rider
  ON rental_ledgers(rider_id)
  WHERE status IN ('pending_start', 'active', 'suspended');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rental_ledgers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rental_ledgers_updated_at ON rental_ledgers;
CREATE TRIGGER trigger_rental_ledgers_updated_at
  BEFORE UPDATE ON rental_ledgers
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_ledgers_updated_at();

-- Enable RLS
ALTER TABLE rental_ledgers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view rental ledgers" ON rental_ledgers;
CREATE POLICY "Authenticated users can view rental ledgers"
  ON rental_ledgers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert rental ledgers" ON rental_ledgers;
CREATE POLICY "Authenticated users can insert rental ledgers"
  ON rental_ledgers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update rental ledgers" ON rental_ledgers;
CREATE POLICY "Authenticated users can update rental ledgers"
  ON rental_ledgers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete rental ledgers" ON rental_ledgers;
CREATE POLICY "Authenticated users can delete rental ledgers"
  ON rental_ledgers FOR DELETE
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE rental_ledgers IS 'Tracks rental agreements between fleet operator and riders for vehicles';
COMMENT ON COLUMN rental_ledgers.rider_id IS 'FK reference to riders.rider_id (text)';
COMMENT ON COLUMN rental_ledgers.vehicle_id IS 'FK reference to vehicles.id (uuid), nullable if vehicle unassigned';
COMMENT ON COLUMN rental_ledgers.status IS 'Current status: pending_start, active, suspended, closed, cancelled';
COMMENT ON COLUMN rental_ledgers.security_deposit_status IS 'Status of security deposit: pending, collected, refunded';
COMMENT ON COLUMN rental_ledgers.responsible_user_id IS 'User responsible for following up on payments';


-- ============================================
-- Part 2: Create rental_payments table
-- ============================================

CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID NOT NULL REFERENCES rental_ledgers(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,

  -- Due info
  due_date DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Payment info
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance DECIMAL(10,2) GENERATED ALWAYS AS (amount_due - paid_amount) STORED,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'waived')),
  payment_date DATE,

  -- Payment mode tracking
  payment_mode TEXT
    CHECK (payment_mode IN ('cash', 'upi', 'bank-transfer', 'card', 'other')),
  upi_last4 TEXT,  -- Last 4 chars of UPI ID for tracking

  -- Collection info
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  external_ref TEXT,  -- External transaction reference

  -- Reminder tracking
  last_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: One payment entry per week per ledger
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_payments_ledger_week
  ON rental_payments(ledger_id, week_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rental_payments_ledger_id ON rental_payments(ledger_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_status ON rental_payments(status);
CREATE INDEX IF NOT EXISTS idx_rental_payments_due_date ON rental_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_rental_payments_received_by ON rental_payments(received_by);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_rental_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rental_payments_updated_at ON rental_payments;
CREATE TRIGGER trigger_rental_payments_updated_at
  BEFORE UPDATE ON rental_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_rental_payments_updated_at();

-- Enable RLS
ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view rental payments" ON rental_payments;
CREATE POLICY "Authenticated users can view rental payments"
  ON rental_payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert rental payments" ON rental_payments;
CREATE POLICY "Authenticated users can insert rental payments"
  ON rental_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update rental payments" ON rental_payments;
CREATE POLICY "Authenticated users can update rental payments"
  ON rental_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete rental payments" ON rental_payments;
CREATE POLICY "Authenticated users can delete rental payments"
  ON rental_payments FOR DELETE
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE rental_payments IS 'Weekly payment entries for rental ledgers';
COMMENT ON COLUMN rental_payments.week_number IS 'Week number since rental start';
COMMENT ON COLUMN rental_payments.balance IS 'Generated column: amount_due - paid_amount';
COMMENT ON COLUMN rental_payments.status IS 'Payment status: pending, partial, paid, overdue, waived';
COMMENT ON COLUMN rental_payments.upi_last4 IS 'Last 4 characters of UPI ID for payment tracking';


-- ============================================
-- Part 3: Create notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL
    CHECK (type IN ('payment_overdue', 'payment_reminder', 'rental_started', 'rental_closed', 'system')),
  title TEXT,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',

  -- State
  read BOOLEAN DEFAULT FALSE,

  -- Actions
  action_url TEXT,
  action_label TEXT,
  priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(target_user_id, read, created_at DESC)
  WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (target_user_id = auth.uid());

-- Allow service role to insert for system notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE notifications IS 'Notifications for users about rental payments and system events';


-- ============================================
-- Part 4: RPC Functions
-- ============================================

-- Function: create_rental_ledger
CREATE OR REPLACE FUNCTION create_rental_ledger(
  p_rider_id TEXT,
  p_vehicle_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id UUID;
  v_rider_name TEXT;
  v_vehicle_number TEXT;
BEGIN
  -- Get rider name
  SELECT name INTO v_rider_name
  FROM riders
  WHERE rider_id = p_rider_id
  LIMIT 1;

  IF v_rider_name IS NULL THEN
    RAISE EXCEPTION 'Rider not found: %', p_rider_id;
  END IF;

  -- Get vehicle number if vehicle_id provided
  IF p_vehicle_id IS NOT NULL THEN
    SELECT vehicle_number INTO v_vehicle_number
    FROM vehicles
    WHERE id = p_vehicle_id
    LIMIT 1;
  END IF;

  -- Create the ledger
  INSERT INTO rental_ledgers (
    rider_id,
    rider_name,
    vehicle_id,
    vehicle_number,
    status,
    created_by
  ) VALUES (
    p_rider_id,
    v_rider_name,
    p_vehicle_id,
    v_vehicle_number,
    'pending_start',
    p_created_by
  )
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$;

-- Function: confirm_rental_start
CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id UUID,
  p_rental_start_date DATE,
  p_security_deposit DECIMAL DEFAULT 0,
  p_responsible_user_id UUID DEFAULT NULL,
  p_confirmed_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rider_id TEXT;
  v_rental_amount DECIMAL;
  v_payments_created INTEGER := 0;
  v_current_week INTEGER;
  v_due_date DATE;
BEGIN
  -- Validate ledger exists and is in pending_start status
  SELECT rider_id, rental_amount
  INTO v_rider_id, v_rental_amount
  FROM rental_ledgers
  WHERE id = p_ledger_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger not found: %', p_ledger_id;
  END IF;

  -- Update ledger with start info
  UPDATE rental_ledgers
  SET
    rental_start_date = p_rental_start_date,
    security_deposit = p_security_deposit,
    security_deposit_status = CASE WHEN p_security_deposit > 0 THEN 'collected' ELSE 'pending' END,
    responsible_user_id = p_responsible_user_id,
    notes = COALESCE(p_notes, notes),
    status = 'active',
    updated_at = NOW()
  WHERE id = p_ledger_id;

  -- Generate first 2 payment entries
  FOR v_current_week IN 1..2 LOOP
    v_due_date := p_rental_start_date + (v_current_week * 7);

    INSERT INTO rental_payments (
      ledger_id,
      week_number,
      due_date,
      amount_due,
      status
    ) VALUES (
      p_ledger_id,
      v_current_week,
      v_due_date,
      v_rental_amount,
      'pending'
    );

    v_payments_created := v_payments_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_id', p_ledger_id,
    'payments_created', v_payments_created,
    'message', 'Rental started successfully'
  );
END;
$$;

-- Function: mark_rental_payment_paid
CREATE OR REPLACE FUNCTION mark_rental_payment_paid(
  p_payment_id UUID,
  p_paid_amount DECIMAL,
  p_payment_mode TEXT DEFAULT NULL,
  p_upi_last4 TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment rental_payments%ROWTYPE;
  v_new_status TEXT;
  v_new_balance DECIMAL;
BEGIN
  -- Get current payment
  SELECT * INTO v_payment
  FROM rental_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  -- Validate UPI last4 format if provided
  IF p_payment_mode = 'upi' AND p_upi_last4 IS NOT NULL THEN
    IF LENGTH(p_upi_last4) != 4 OR p_upi_last4 !~ '^[A-Za-z0-9]{4}$' THEN
      RAISE EXCEPTION 'UPI last4 must be exactly 4 alphanumeric characters';
    END IF;
  END IF;

  -- Calculate new status
  v_new_balance := v_payment.amount_due - (v_payment.paid_amount + p_paid_amount);

  IF v_new_balance <= 0 THEN
    v_new_status := 'paid';
  ELSIF p_paid_amount > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := v_payment.status;
  END IF;

  -- Update payment
  UPDATE rental_payments
  SET
    paid_amount = paid_amount + p_paid_amount,
    status = v_new_status,
    payment_date = CASE WHEN v_new_status = 'paid' THEN CURRENT_DATE ELSE payment_date END,
    payment_mode = COALESCE(p_payment_mode, payment_mode),
    upi_last4 = COALESCE(p_upi_last4, upi_last4),
    received_by = COALESCE(p_received_by, received_by),
    external_ref = COALESCE(p_external_ref, external_ref),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'amount_due', v_payment.amount_due,
    'paid_amount', v_payment.paid_amount + p_paid_amount,
    'balance', GREATEST(0, v_new_balance),
    'status', v_new_status,
    'message', CASE WHEN v_new_status = 'paid' THEN 'Payment marked as fully paid' ELSE 'Partial payment recorded' END
  );
END;
$$;

-- Function: generate_weekly_payments (for pg_cron)
CREATE OR REPLACE FUNCTION generate_weekly_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_count INTEGER := 0;
  v_ledger RECORD;
  v_next_week INTEGER;
  v_due_date DATE;
BEGIN
  -- For each active ledger
  FOR v_ledger IN
    SELECT id, rider_id, rental_amount, rental_start_date
    FROM rental_ledgers
    WHERE status = 'active'
  LOOP
    -- Calculate next week number
    SELECT COALESCE(MAX(week_number), 0) + 1
    INTO v_next_week
    FROM rental_payments
    WHERE ledger_id = v_ledger.id;

    -- Check if payment for next week already exists
    IF NOT EXISTS (
      SELECT 1 FROM rental_payments
      WHERE ledger_id = v_ledger.id AND week_number = v_next_week
    ) THEN
      -- Calculate due date (weekly from start)
      v_due_date := v_ledger.rental_start_date + (v_next_week * 7);

      INSERT INTO rental_payments (
        ledger_id,
        week_number,
        due_date,
        amount_due,
        status
      ) VALUES (
        v_ledger.id,
        v_next_week,
        v_due_date,
        v_ledger.rental_amount,
        'pending'
      );

      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;

  RETURN v_created_count;
END;
$$;

-- Function: mark_overdue_payments (for pg_cron)
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE rental_payments
  SET
    status = 'overdue',
    updated_at = NOW()
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Function: get_overdue_payments_for_reminder
CREATE OR REPLACE FUNCTION get_overdue_payments_for_reminder()
RETURNS TABLE (
  payment_id UUID,
  ledger_id UUID,
  rider_id TEXT,
  rider_name TEXT,
  vehicle_number TEXT,
  week_number INTEGER,
  amount_due DECIMAL(10,2),
  balance DECIMAL(10,2),
  due_date DATE,
  days_overdue INTEGER,
  responsible_user_id UUID,
  reminder_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id as payment_id,
    rp.ledger_id,
    rl.rider_id,
    rl.rider_name,
    rl.vehicle_number,
    rp.week_number,
    rp.amount_due,
    rp.balance,
    rp.due_date,
    (CURRENT_DATE - rp.due_date)::INTEGER as days_overdue,
    rl.responsible_user_id,
    rp.reminder_count
  FROM rental_payments rp
  JOIN rental_ledgers rl ON rp.ledger_id = rl.id
  WHERE rp.status IN ('pending', 'partial', 'overdue')
    AND rp.due_date < CURRENT_DATE
    AND (
      rp.last_reminder_at IS NULL
      OR rp.last_reminder_at < NOW() - INTERVAL '24 hours'
    )
    AND rp.reminder_count < 7
  ORDER BY rp.due_date ASC, rp.reminder_count ASC
  LIMIT 50;
END;
$$;

-- Function: increment_reminder_count
CREATE OR REPLACE FUNCTION increment_reminder_count(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rental_payments
  SET
    reminder_count = reminder_count + 1,
    last_reminder_at = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_rental_ledger(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_rental_ledger(TEXT, UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION mark_rental_payment_paid(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_rental_payment_paid(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO service_role;

GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO service_role;

GRANT EXECUTE ON FUNCTION get_overdue_payments_for_reminder() TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_payments_for_reminder() TO service_role;

GRANT EXECUTE ON FUNCTION increment_reminder_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_reminder_count(UUID) TO service_role;


-- ============================================
-- Part 5: pg_cron Jobs (Optional - requires pg_cron extension)
-- ============================================

-- Note: pg_cron requires the extension to be enabled
-- Run this separately if pg_cron is available:
-- SELECT cron.schedule(
--   'generate-weekly-payments',
--   '0 0 * * *',  -- Daily at midnight UTC
--   $$SELECT generate_weekly_payments()$$
-- );

-- SELECT cron.schedule(
--   'mark-overdue-payments',
--   '0 1 * * *',  -- Daily at 1 AM UTC
--   $$SELECT mark_overdue_payments()$$
-- );


-- ============================================
-- Done! Run this in Supabase SQL Editor
-- ============================================
