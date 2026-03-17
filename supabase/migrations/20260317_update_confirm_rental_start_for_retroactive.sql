-- Migration: Update confirm_rental_start for retroactive entries
-- Description: Allows past dates for rental start and sets historical tracking fields
-- Part of: retroactive-ui-entry change

-- Drop and recreate the function with retroactive support
DROP FUNCTION IF EXISTS confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID);

CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id UUID,
  p_rental_start_date DATE,
  p_security_deposit DECIMAL(10,2) DEFAULT 0,
  p_responsible_user_id UUID DEFAULT NULL,
  p_confirmed_by UUID DEFAULT NULL,
  p_is_historical BOOLEAN DEFAULT FALSE,
  p_data_source TEXT DEFAULT 'PLATFORM',
  p_confidence_score DECIMAL(3,2) DEFAULT 1.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger rental_ledgers%ROWTYPE;
  v_payment_count INTEGER := 0;
  v_is_historical BOOLEAN := FALSE;
  v_data_source TEXT := 'PLATFORM';
  v_confidence_score DECIMAL(3,2) := 1.00;
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

  -- Determine if this is a historical entry
  IF p_is_historical THEN
    -- Explicitly marked as historical
    v_is_historical := TRUE;
    v_data_source := COALESCE(p_data_source, 'MANUAL_ENTRY');
    v_confidence_score := COALESCE(p_confidence_score, 0.70);
  ELSIF p_rental_start_date < CURRENT_DATE - 2 THEN
    -- Past date detected - automatically mark as historical
    v_is_historical := TRUE;
    v_data_source := 'MANUAL_ENTRY';
    v_confidence_score := 0.70;
  ELSE
    -- Current/recent date - normal entry
    v_is_historical := FALSE;
    v_data_source := 'PLATFORM';
    v_confidence_score := 1.00;
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
    -- Historical tracking fields
    is_historical_import = v_is_historical,
    data_source = v_data_source,
    confidence_score = v_confidence_score,
    effective_start_date = p_rental_start_date,
    updated_at = NOW()
  WHERE id = p_ledger_id;

  -- Generate first 2 weekly payment entries
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

  -- Create retroactive event for historical entries
  IF v_is_historical THEN
    INSERT INTO retroactive_events (
      entity_type,
      entity_id,
      event_type,
      effective_date,
      source,
      confidence,
      event_data
    ) VALUES (
      'ledger',
      p_ledger_id::TEXT,
      'RETROACTIVE_START',
      p_rental_start_date,
      v_data_source,
      v_confidence_score,
      jsonb_build_object(
        'security_deposit', p_security_deposit,
        'rental_amount', v_ledger.rental_amount,
        'confirmed_by', p_confirmed_by
      )
    );
  END IF;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'ledger_id', p_ledger_id,
    'rental_start_date', p_rental_start_date,
    'security_deposit', p_security_deposit,
    'payments_created', v_payment_count,
    'is_historical', v_is_historical,
    'data_source', v_data_source,
    'confidence_score', v_confidence_score,
    'message', CASE
      WHEN v_is_historical THEN 'Rental started as historical entry. 2 payment entries created.'
      ELSE 'Rental started successfully. 2 payment entries created.'
    END
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL) TO service_role;

-- Add comment
COMMENT ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL) IS
'Confirms rental start date and security deposit. Supports retroactive entries with historical tracking. Updates ledger status to active and generates first 2 weekly payment entries. Returns JSONB with success status and details.';
