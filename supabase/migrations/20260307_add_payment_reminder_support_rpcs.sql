-- Migration: Add supporting RPCs for payment reminder Edge Function
-- Description: Helper functions for send-payment-reminder Edge Function
-- Part of: auto-create-rental-ledger change

-- Function: Get overdue payments that need reminders
-- Returns payments that are overdue and haven't been reminded in last 24 hours
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
    AND rp.reminder_count < 7  -- Max 7 reminders per payment
  ORDER BY rp.due_date ASC, rp.reminder_count ASC
  LIMIT 50;  -- Process max 50 per run
END;
$$;

-- Function: Increment reminder count and update timestamp
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
GRANT EXECUTE ON FUNCTION get_overdue_payments_for_reminder() TO authenticated;
GRANT EXECUTE ON FUNCTION get_overdue_payments_for_reminder() TO service_role;

GRANT EXECUTE ON FUNCTION increment_reminder_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_reminder_count(UUID) TO service_role;

-- Add comments
COMMENT ON FUNCTION get_overdue_payments_for_reminder() IS
'Returns overdue payments that need reminders (not reminded in last 24h, max 7 reminders). Used by send-payment-reminder Edge Function.';

COMMENT ON FUNCTION increment_reminder_count(UUID) IS
'Increments reminder_count and updates last_reminder_at for a payment. Returns true if payment was found.';
