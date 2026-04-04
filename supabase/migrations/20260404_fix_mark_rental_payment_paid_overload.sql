-- ============================================================================
-- Migration: Fix mark_rental_payment_paid overload ambiguity
-- Date: 2026-04-04
--
-- Problem: Two overloaded versions exist — one with CHAR(4) and one with TEXT
-- for p_upi_last4. PostgreSQL cannot choose between them, throwing:
-- "Could not choose the best candidate function..."
--
-- Fix: Drop both overloads, recreate once with TEXT only.
-- ============================================================================

-- Drop both overloads explicitly
DROP FUNCTION IF EXISTS mark_rental_payment_paid(UUID, DECIMAL, TEXT, CHAR, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS mark_rental_payment_paid(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION mark_rental_payment_paid(
  p_payment_id    UUID,
  p_paid_amount   DECIMAL(10,2),
  p_payment_mode  TEXT    DEFAULT NULL,
  p_upi_last4     TEXT    DEFAULT NULL,
  p_received_by   UUID    DEFAULT NULL,
  p_external_ref  TEXT    DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment       rental_payments%ROWTYPE;
  v_new_status    TEXT;
  v_balance_after DECIMAL(10,2);
  v_result        JSONB;
BEGIN
  SELECT * INTO v_payment
  FROM rental_payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found: %', p_payment_id;
  END IF;

  IF p_payment_mode IS NOT NULL AND p_payment_mode NOT IN ('cash', 'upi', 'bank-transfer', 'card', 'other') THEN
    RAISE EXCEPTION 'Invalid payment mode: %. Must be one of: cash, upi, bank-transfer, card, other', p_payment_mode;
  END IF;

  IF p_payment_mode = 'upi' AND p_upi_last4 IS NOT NULL THEN
    IF LENGTH(p_upi_last4) != 4 THEN
      RAISE EXCEPTION 'UPI last4 must be exactly 4 characters';
    END IF;
    IF p_upi_last4 !~ '^[A-Za-z0-9]{4}$' THEN
      RAISE EXCEPTION 'UPI last4 must be alphanumeric';
    END IF;
    p_upi_last4 := UPPER(p_upi_last4);
  END IF;

  IF p_paid_amount <= 0 THEN
    RAISE EXCEPTION 'Paid amount must be greater than 0';
  END IF;

  IF p_paid_amount > v_payment.amount_due THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed amount due (%)', p_paid_amount, v_payment.amount_due;
  END IF;

  v_balance_after := v_payment.amount_due - p_paid_amount;

  IF v_balance_after = 0 THEN
    v_new_status := 'paid';
  ELSIF v_balance_after > 0 AND v_balance_after < v_payment.amount_due THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE rental_payments SET
    paid_amount  = p_paid_amount,
    status       = v_new_status,
    payment_date = CURRENT_DATE,
    payment_mode = p_payment_mode,
    upi_last4    = p_upi_last4,
    received_by  = p_received_by,
    external_ref = p_external_ref,
    notes        = COALESCE(p_notes, v_payment.notes),
    updated_at   = NOW()
  WHERE id = p_payment_id;

  v_result := jsonb_build_object(
    'success',      true,
    'payment_id',   p_payment_id,
    'amount_due',   v_payment.amount_due,
    'paid_amount',  p_paid_amount,
    'balance',      v_balance_after,
    'status',       v_new_status,
    'payment_mode', p_payment_mode,
    'message', CASE
      WHEN v_new_status = 'paid'    THEN 'Payment fully received'
      WHEN v_new_status = 'partial' THEN 'Partial payment recorded. Balance: ' || v_balance_after
      ELSE 'Payment updated'
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_rental_payment_paid(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_rental_payment_paid(UUID, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;
