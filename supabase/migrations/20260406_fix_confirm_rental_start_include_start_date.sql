-- ============================================================================
-- Migration: Include start date as first payment in confirm_rental_start
-- Date: 2026-04-06
--
-- Problem: First payment was generated at rental_start_date + 7 days,
--          skipping the start week entirely.
--
-- Fix: Start the payment loop at rental_start_date so week 1 payment
--      is due on the start date itself, then weekly from there.
-- ============================================================================

DROP FUNCTION IF EXISTS confirm_rental_start(UUID, DATE, DECIMAL, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id           UUID,
  p_rental_start_date   DATE,
  p_security_deposit    DECIMAL(10,2)  DEFAULT 0,
  p_rental_amount       DECIMAL(10,2)  DEFAULT 0,
  p_responsible_user_id UUID           DEFAULT NULL,
  p_confirmed_by        UUID           DEFAULT NULL,
  p_is_historical       BOOLEAN        DEFAULT FALSE,
  p_data_source         TEXT           DEFAULT 'PLATFORM',
  p_confidence_score    DECIMAL(3,2)   DEFAULT 1.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger            rental_ledgers%ROWTYPE;
  v_is_historical     BOOLEAN        := FALSE;
  v_data_source       TEXT           := 'PLATFORM';
  v_confidence_score  DECIMAL(3,2)   := 1.00;
  v_effective_amount  DECIMAL(10,2);

  v_next_num          INTEGER;
  v_current_due       DATE;
  v_cutoff            DATE;
  v_loop_end          DATE;
  v_week_num          INTEGER        := 0;
  v_payment_id        TEXT;
  v_status            TEXT;
  v_payment_count     INTEGER        := 0;

  v_result            JSONB;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. Fetch and validate ledger
  -- ------------------------------------------------------------------
  SELECT * INTO v_ledger
  FROM rental_ledgers
  WHERE id = p_ledger_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger not found: %', p_ledger_id;
  END IF;

  IF v_ledger.status != 'pending_start' THEN
    RAISE EXCEPTION 'Ledger must be in pending_start status. Current: %', v_ledger.status;
  END IF;

  IF p_rental_start_date > CURRENT_DATE + 30 THEN
    RAISE EXCEPTION 'Rental start date cannot be more than 30 days in the future';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. Determine historical vs live
  -- ------------------------------------------------------------------
  IF p_is_historical OR p_rental_start_date < CURRENT_DATE - 2 THEN
    v_is_historical    := TRUE;
    v_data_source      := COALESCE(NULLIF(p_data_source, 'PLATFORM'), 'MANUAL_ENTRY');
    v_confidence_score := COALESCE(p_confidence_score, 0.70);
  END IF;

  -- ------------------------------------------------------------------
  -- 3. Resolve effective rental amount
  -- ------------------------------------------------------------------
  v_effective_amount := CASE
    WHEN p_rental_amount > 0 THEN p_rental_amount
    ELSE v_ledger.rental_amount
  END;

  -- ------------------------------------------------------------------
  -- 4. Update ledger → active
  -- ------------------------------------------------------------------
  UPDATE rental_ledgers SET
    rental_start_date       = p_rental_start_date,
    rental_amount           = v_effective_amount,
    security_deposit        = p_security_deposit,
    security_deposit_status = CASE WHEN p_security_deposit > 0 THEN 'collected' ELSE 'pending' END,
    responsible_user_id     = COALESCE(p_responsible_user_id, p_confirmed_by),
    status                  = 'active',
    is_historical_import    = v_is_historical,
    data_source             = v_data_source,
    confidence_score        = v_confidence_score,
    effective_start_date    = p_rental_start_date,
    updated_at              = NOW()
  WHERE id = p_ledger_id;

  -- ------------------------------------------------------------------
  -- 5. Generate payment schedule
  --    • First payment ON rental_start_date (week 1)
  --    • Then weekly from there
  --    • Past due dates → overdue, future → pending
  --    • Lookahead: CURRENT_DATE + 7 days (1 pending max, cron handles rest)
  --    • Lookback cap: CURRENT_DATE - 6 months
  -- ------------------------------------------------------------------
  v_next_num    := get_next_payment_number();
  v_cutoff      := CURRENT_DATE - INTERVAL '6 months';
  v_loop_end    := CURRENT_DATE + INTERVAL '7 days';
  v_current_due := p_rental_start_date; -- week 1 due on start date itself

  WHILE v_current_due <= v_loop_end LOOP
    IF v_current_due >= v_cutoff THEN
      v_week_num   := v_week_num + 1;
      v_payment_id := 'P' || LPAD(v_next_num::TEXT, 3, '0');
      v_next_num   := v_next_num + 1;
      v_status     := CASE WHEN v_current_due < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;

      INSERT INTO rental_payments (
        ledger_id, week_number, due_date, amount_due, status, payment_id
      ) VALUES (
        p_ledger_id, v_week_num, v_current_due, v_effective_amount, v_status, v_payment_id
      );

      v_payment_count := v_payment_count + 1;
    END IF;

    v_current_due := v_current_due + INTERVAL '7 days';
  END LOOP;

  -- ------------------------------------------------------------------
  -- 6. Return result
  -- ------------------------------------------------------------------
  v_result := jsonb_build_object(
    'success',           true,
    'ledger_id',         p_ledger_id,
    'rental_start_date', p_rental_start_date,
    'rental_amount',     v_effective_amount,
    'security_deposit',  p_security_deposit,
    'payments_created',  v_payment_count,
    'is_historical',     v_is_historical,
    'data_source',       v_data_source,
    'confidence_score',  v_confidence_score,
    'message', CASE
      WHEN v_is_historical
        THEN format('Rental started as historical entry. %s payment entries created.', v_payment_count)
      ELSE format('Rental started successfully. %s payment entries created.', v_payment_count)
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL)
  TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL)
  TO service_role;
