-- Migration: Add confirm_rental_start RPC function
-- Description: Confirms rental start date, deposit, and generates first 2 payment entries
-- Part of: auto-create-rental-ledger change

-- Create the function
CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id UUID,
  p_rental_start_date DATE,
  p_security_deposit DECIMAL(10,2) DEFAULT 0,
  p_responsible_user_id UUID DEFAULT NULL,
  p_confirmed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger rental_ledgers%ROWTYPE;
  v_payment_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Fetch the ledger
  SELECT * INTO v_ledger
  FROM rental_ledgers
  WHERE id = p_ledger_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger not found: %', p_ledger_id;
  END IF;

  -- Validate ledger is in pending_start status
  IF v_ledger.status != 'pending_start' THEN
    RAISE EXCEPTION 'Ledger must be in pending_start status. Current status: %', v_ledger.status;
  END IF;

  -- Validate rental start date is not in the past (with 2-day grace)
  IF p_rental_start_date < CURRENT_DATE - 2 THEN
    RAISE EXCEPTION 'Rental start date cannot be more than 2 days in the past';
  END IF;

  -- Validate rental start date is not too far in future
  IF p_rental_start_date > CURRENT_DATE + 30 THEN
    RAISE EXCEPTION 'Rental start date cannot be more than 30 days in the future';
  END IF;

  -- Update the ledger with confirmation details
  UPDATE rental_ledgers SET
    rental_start_date = p_rental_start_date,
    security_deposit = p_security_deposit,
    security_deposit_status = CASE
      WHEN p_security_deposit > 0 THEN 'collected'
      ELSE 'pending'
    END,
    responsible_user_id = COALESCE(p_responsible_user_id, p_confirmed_by),
    status = 'active',
    updated_at = NOW()
  WHERE id = p_ledger_id;

  -- Generate first 2 weekly payment entries
  -- Week 1: due 7 days from rental start
  INSERT INTO rental_payments (
    ledger_id,
    week_number,
    due_date,
    amount_due,
    status
  ) VALUES (
    p_ledger_id,
    1,
    p_rental_start_date + INTERVAL '7 days',
    v_ledger.rental_amount,
    'pending'
  );

  -- Week 2: due 14 days from rental start
  INSERT INTO rental_payments (
    ledger_id,
    week_number,
    due_date,
    amount_due,
    status
  ) VALUES (
    p_ledger_id,
    2,
    p_rental_start_date + INTERVAL '14 days',
    v_ledger.rental_amount,
    'pending'
  );

  v_payment_count := 2;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'ledger_id', p_ledger_id,
    'rental_start_date', p_rental_start_date,
    'security_deposit', p_security_deposit,
    'payments_created', v_payment_count,
    'message', 'Rental started successfully. 2 payment entries created.'
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID) IS
'Confirms rental start date and security deposit. Updates ledger status to active and generates first 2 weekly payment entries. Returns JSONB with success status and details.';
