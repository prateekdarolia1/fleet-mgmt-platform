-- Migration: Add generate_weekly_payments RPC function
-- Description: Creates next week's payment entry for active ledgers (called by pg_cron)
-- Part of: auto-create-rental-ledger change

-- Create the function
CREATE OR REPLACE FUNCTION generate_weekly_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payments_created INTEGER := 0;
  v_ledger RECORD;
  v_next_week_number INTEGER;
  v_next_due_date DATE;
  v_weeks_ahead INTEGER;
BEGIN
  -- Find all active ledgers that need next week payment
  -- Create next payment 6 days before it's due (as per requirements)
  FOR v_ledger IN
    SELECT
      rl.id as ledger_id,
      rl.rider_id,
      rl.rider_name,
      rl.rental_start_date,
      rl.rental_amount
    FROM rental_ledgers rl
    WHERE rl.status = 'active'
      AND rl.rental_start_date IS NOT NULL
      -- Only process if there's a pending/partial payment within next 6 days
      AND EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.status IN ('pending', 'partial')
          AND rp.due_date <= CURRENT_DATE + INTERVAL '6 days'
      )
      -- And there's no payment entry for the week after next
      AND NOT EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.due_date > CURRENT_DATE + INTERVAL '6 days'
      )
  LOOP
    -- Calculate next week number
    SELECT COALESCE(MAX(week_number), 0) + 1
    INTO v_next_week_number
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    -- Calculate due date (7 days from last due date)
    SELECT COALESCE(MAX(due_date), v_ledger.rental_start_date) + INTERVAL '7 days'
    INTO v_next_due_date
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    -- Create the payment entry
    INSERT INTO rental_payments (
      ledger_id,
      week_number,
      due_date,
      amount_due,
      status
    ) VALUES (
      v_ledger.ledger_id,
      v_next_week_number,
      v_next_due_date,
      v_ledger.rental_amount,
      'pending'
    );

    v_payments_created := v_payments_created + 1;

    -- Log for debugging
    RAISE LOG 'Created payment for ledger %, week %, due %',
      v_ledger.ledger_id, v_next_week_number, v_next_due_date;
  END LOOP;

  RETURN v_payments_created;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO service_role;

-- Add comment
COMMENT ON FUNCTION generate_weekly_payments() IS
'Creates next week payment entries for active ledgers. Called daily by pg_cron. Returns count of payments created.';
