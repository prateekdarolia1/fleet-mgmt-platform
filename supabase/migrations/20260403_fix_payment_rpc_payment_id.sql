-- ============================================================================
-- Migration: Fix confirm_rental_start and generate_weekly_payments RPCs
-- Date: 2026-04-03
-- Problem 1: Both RPCs insert into rental_payments without setting payment_id,
--            but payment_id was made NOT NULL on 2026-03-26 (align_rental_payments_schema).
-- Problem 2: confirm_rental_start hardcodes exactly 2 payments — incorrect for
--            retroactive ledgers with past start dates (should generate full history).
-- Fix: Rewrite both RPCs to (a) generate payment_ids from the shared P### sequence
--      and (b) generate the full retroactive payment schedule with overdue/pending status.
-- ============================================================================

-- ============================================================================
-- PART 1: Shared helper — get next available payment number across both tables
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_payment_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_payments INTEGER;
  v_max_rental   INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(payment_id FROM 2) AS INTEGER)), 0
  ) INTO v_max_payments
  FROM payments
  WHERE payment_id ~ '^P[0-9]+$';

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(payment_id FROM 2) AS INTEGER)), 0
  ) INTO v_max_rental
  FROM rental_payments
  WHERE payment_id ~ '^P[0-9]+$';

  RETURN GREATEST(v_max_payments, v_max_rental) + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_payment_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_payment_number() TO service_role;

-- ============================================================================
-- PART 2: Rewrite confirm_rental_start
--   - Generates full retroactive payment schedule (not just 2)
--   - Sets payment_id on every inserted row
--   - Past due_dates → overdue, current/future → pending
--   - Capped at 6 months lookback
--   - Generates 6 weeks of future pending payments as buffer
-- ============================================================================

DROP FUNCTION IF EXISTS confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID);
DROP FUNCTION IF EXISTS confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id           UUID,
  p_rental_start_date   DATE,
  p_security_deposit    DECIMAL(10,2)  DEFAULT 0,
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

  -- Payment generation
  v_next_num          INTEGER;
  v_current_due       DATE;
  v_cutoff            DATE;           -- 6-month lookback limit
  v_loop_end          DATE;           -- 6-week lookahead buffer
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
  -- 3. Update ledger → active
  -- ------------------------------------------------------------------
  UPDATE rental_ledgers SET
    rental_start_date       = p_rental_start_date,
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
  -- 4. Generate payment schedule
  --    • Start: first due date = rental_start_date + 7 days
  --    • Lookback cap: CURRENT_DATE - 6 months
  --    • Lookahead buffer: CURRENT_DATE + 42 days (6 weeks)
  --    • past due → overdue, current/future → pending
  -- ------------------------------------------------------------------
  v_next_num   := get_next_payment_number();
  v_cutoff     := CURRENT_DATE - INTERVAL '6 months';
  v_loop_end   := CURRENT_DATE + INTERVAL '42 days';
  v_current_due := p_rental_start_date + INTERVAL '7 days';

  WHILE v_current_due <= v_loop_end LOOP
    -- Skip payments older than the 6-month lookback cap
    IF v_current_due >= v_cutoff THEN
      v_week_num   := v_week_num + 1;
      v_payment_id := 'P' || LPAD(v_next_num::TEXT, 3, '0');
      v_next_num   := v_next_num + 1;
      v_status     := CASE WHEN v_current_due < CURRENT_DATE THEN 'overdue' ELSE 'pending' END;

      INSERT INTO rental_payments (
        ledger_id, week_number, due_date, amount_due, status, payment_id
      ) VALUES (
        p_ledger_id, v_week_num, v_current_due, v_ledger.rental_amount, v_status, v_payment_id
      );

      v_payment_count := v_payment_count + 1;
    END IF;

    v_current_due := v_current_due + INTERVAL '7 days';
  END LOOP;

  -- ------------------------------------------------------------------
  -- 5. Log retroactive event if historical
  -- ------------------------------------------------------------------
  IF v_is_historical THEN
    INSERT INTO retroactive_events (
      entity_type, entity_id, event_type, effective_date,
      source, confidence, event_data
    ) VALUES (
      'ledger', p_ledger_id::TEXT, 'RETROACTIVE_START', p_rental_start_date,
      v_data_source, v_confidence_score,
      jsonb_build_object(
        'security_deposit', p_security_deposit,
        'rental_amount',    v_ledger.rental_amount,
        'confirmed_by',     p_confirmed_by,
        'payments_created', v_payment_count
      )
    );
  END IF;

  -- ------------------------------------------------------------------
  -- 6. Return result
  -- ------------------------------------------------------------------
  v_result := jsonb_build_object(
    'success',          true,
    'ledger_id',        p_ledger_id,
    'rental_start_date', p_rental_start_date,
    'security_deposit', p_security_deposit,
    'payments_created', v_payment_count,
    'is_historical',    v_is_historical,
    'data_source',      v_data_source,
    'confidence_score', v_confidence_score,
    'message',          CASE
      WHEN v_is_historical
        THEN format('Rental started as historical entry. %s payment entries created (%s overdue, %s pending).',
              v_payment_count,
              (SELECT COUNT(*) FROM rental_payments WHERE ledger_id = p_ledger_id AND status = 'overdue'),
              (SELECT COUNT(*) FROM rental_payments WHERE ledger_id = p_ledger_id AND status = 'pending'))
      ELSE format('Rental started successfully. %s payment entries created.', v_payment_count)
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL)
  TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL)
  TO service_role;

COMMENT ON FUNCTION confirm_rental_start(UUID, DATE, DECIMAL, UUID, UUID, BOOLEAN, TEXT, DECIMAL) IS
'Confirms rental start. Generates full retroactive payment schedule with payment_id on every row.
Past due dates → overdue, future → pending. Capped at 6 months lookback + 6 weeks lookahead.';

-- ============================================================================
-- PART 3: Rewrite generate_weekly_payments (cron job)
--   Same single-row-per-ledger logic as before, but now sets payment_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_weekly_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger          RECORD;
  v_next_week_num   INTEGER;
  v_next_due_date   DATE;
  v_payment_id      TEXT;
  v_next_num        INTEGER;
  v_payments_created INTEGER := 0;
BEGIN
  FOR v_ledger IN
    SELECT
      rl.id            AS ledger_id,
      rl.rental_amount
    FROM rental_ledgers rl
    WHERE rl.status = 'active'
      AND rl.rental_start_date IS NOT NULL
      -- A pending/partial payment is due within the next 6 days
      AND EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.status IN ('pending', 'partial')
          AND rp.due_date <= CURRENT_DATE + INTERVAL '6 days'
      )
      -- No payment already exists beyond the next 6-day window
      AND NOT EXISTS (
        SELECT 1 FROM rental_payments rp
        WHERE rp.ledger_id = rl.id
          AND rp.due_date > CURRENT_DATE + INTERVAL '6 days'
      )
  LOOP
    SELECT COALESCE(MAX(week_number), 0) + 1
    INTO v_next_week_num
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    SELECT COALESCE(MAX(due_date), CURRENT_DATE) + INTERVAL '7 days'
    INTO v_next_due_date
    FROM rental_payments
    WHERE ledger_id = v_ledger.ledger_id;

    -- Generate a payment_id from the shared sequence
    v_next_num   := get_next_payment_number();
    v_payment_id := 'P' || LPAD(v_next_num::TEXT, 3, '0');

    INSERT INTO rental_payments (
      ledger_id, week_number, due_date, amount_due, status, payment_id
    ) VALUES (
      v_ledger.ledger_id, v_next_week_num, v_next_due_date,
      v_ledger.rental_amount, 'pending', v_payment_id
    );

    v_payments_created := v_payments_created + 1;

    RAISE LOG 'Created payment % for ledger %, week %, due %',
      v_payment_id, v_ledger.ledger_id, v_next_week_num, v_next_due_date;
  END LOOP;

  RETURN v_payments_created;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_weekly_payments() TO service_role;

COMMENT ON FUNCTION generate_weekly_payments() IS
'Cron job: creates next week payment entry for active ledgers. Now sets payment_id on every insert.';
