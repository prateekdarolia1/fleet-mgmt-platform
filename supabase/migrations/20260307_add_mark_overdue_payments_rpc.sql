-- Migration: Add mark_overdue_payments RPC function
-- Description: Marks pending/partial payments as overdue when past due_date
-- Part of: auto-create-rental-ledger change

-- Create the function
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payments_marked INTEGER := 0;
  v_payment RECORD;
BEGIN
  -- Find all pending/partial payments that are past due date
  FOR v_payment IN
    SELECT
      rp.id,
      rp.ledger_id,
      rp.week_number,
      rp.due_date,
      rp.amount_due,
      rl.rider_name,
      rl.vehicle_number
    FROM rental_payments rp
    JOIN rental_ledgers rl ON rp.ledger_id = rl.id
    WHERE rp.status IN ('pending', 'partial')
      AND rp.due_date < CURRENT_DATE
  LOOP
    -- Update status to overdue
    UPDATE rental_payments
    SET status = 'overdue',
        updated_at = NOW()
    WHERE id = v_payment.id;

    v_payments_marked := v_payments_marked + 1;

    -- Log for debugging
    RAISE LOG 'Marked payment overdue: ledger %, week %, due %',
      v_payment.ledger_id, v_payment.week_number, v_payment.due_date;
  END LOOP;

  RETURN v_payments_marked;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_overdue_payments() TO service_role;

-- Add comment
COMMENT ON FUNCTION mark_overdue_payments() IS
'Marks pending/partial payments as overdue when past due_date. Called daily by pg_cron. Returns count of payments marked overdue.';
