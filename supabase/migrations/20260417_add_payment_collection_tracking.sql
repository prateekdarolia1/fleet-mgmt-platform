-- ============================================================================
-- Migration: Add payment collection tracking (screenshot, collected_by, collected_at)
-- Date: 2026-04-17
--
-- What this does:
--   1. Adds screenshot_url, collected_by, collected_at to payments + rental_payments
--   2. Updates sync_payment_to_rental() trigger to propagate these columns
--   3. Creates 'payment-proofs' public storage bucket + RLS policies
-- ============================================================================


-- ============================================================================
-- STEP 1: Add columns to payments (source of truth for UI)
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS collected_by   TEXT NULL,
  ADD COLUMN IF NOT EXISTS collected_at   TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN public.payments.screenshot_url IS
  'Public URL to the payment proof image/PDF uploaded when marking paid';
COMMENT ON COLUMN public.payments.collected_by IS
  'Who collected this payment: admin | TL1 | TL2';
COMMENT ON COLUMN public.payments.collected_at IS
  'Timestamp when the payment was marked as collected';

-- Allow only valid collected_by values
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%collected_by%'
  LOOP
    EXECUTE 'ALTER TABLE public.payments DROP CONSTRAINT ' || quote_ident(con_name);
  END LOOP;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_collected_by_check
  CHECK (collected_by IS NULL OR collected_by IN ('admin', 'TL1', 'TL2'));


-- ============================================================================
-- STEP 2: Add same columns to rental_payments (RPC layer; synced from payments)
-- ============================================================================

ALTER TABLE public.rental_payments
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS collected_by   TEXT NULL,
  ADD COLUMN IF NOT EXISTS collected_at   TIMESTAMP WITH TIME ZONE NULL;

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.rental_payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%collected_by%'
  LOOP
    EXECUTE 'ALTER TABLE public.rental_payments DROP CONSTRAINT ' || quote_ident(con_name);
  END LOOP;
END $$;

ALTER TABLE public.rental_payments
  ADD CONSTRAINT rental_payments_collected_by_check
  CHECK (collected_by IS NULL OR collected_by IN ('admin', 'TL1', 'TL2'));


-- ============================================================================
-- STEP 3: Update sync_payment_to_rental() to propagate the new columns
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_payment_to_rental()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rental_payments (
    id, payment_id, ledger_id, week_number, due_date,
    amount_due, paid_amount, status,
    payment_date, payment_mode, upi_last4, received_by, external_ref,
    last_reminder_at, reminder_count,
    cancelled_at, cancelled_by,
    notes, created_at, updated_at,
    screenshot_url, collected_by, collected_at
  ) VALUES (
    NEW.id, NEW.payment_id, NEW.ledger_id, NEW.week_number, NEW.due_date,
    NEW.amount_due, NEW.paid_amount, NEW.status::TEXT,
    NEW.payment_date, NEW.payment_mode, NEW.upi_last4, NEW.received_by, NEW.external_ref,
    NEW.last_reminder_at, NEW.reminder_count,
    NEW.cancelled_at, NEW.cancelled_by,
    NEW.notes, NEW.created_at, NEW.updated_at,
    NEW.screenshot_url, NEW.collected_by, NEW.collected_at
  )
  ON CONFLICT (id) DO UPDATE SET
    payment_id = EXCLUDED.payment_id,
    ledger_id = EXCLUDED.ledger_id,
    week_number = EXCLUDED.week_number,
    due_date = EXCLUDED.due_date,
    amount_due = EXCLUDED.amount_due,
    paid_amount = EXCLUDED.paid_amount,
    status = EXCLUDED.status,
    payment_date = EXCLUDED.payment_date,
    payment_mode = EXCLUDED.payment_mode,
    upi_last4 = EXCLUDED.upi_last4,
    received_by = EXCLUDED.received_by,
    external_ref = EXCLUDED.external_ref,
    last_reminder_at = EXCLUDED.last_reminder_at,
    reminder_count = EXCLUDED.reminder_count,
    cancelled_at = EXCLUDED.cancelled_at,
    cancelled_by = EXCLUDED.cancelled_by,
    notes = EXCLUDED.notes,
    updated_at = EXCLUDED.updated_at,
    screenshot_url = EXCLUDED.screenshot_url,
    collected_by = EXCLUDED.collected_by,
    collected_at = EXCLUDED.collected_at;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO sync_errors (source_table, source_id, target_table, operation, error_message, error_details)
    VALUES ('payments', NEW.id, 'rental_payments', TG_OP, SQLERRM, jsonb_build_object(
      'new_data', row_to_json(NEW),
      'operation', TG_OP
    ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- STEP 4: Create payment-proofs storage bucket (public)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;


-- ============================================================================
-- STEP 5: Storage RLS policies for the bucket (anon upload + public read)
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY "payment_proofs_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'payment-proofs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payment_proofs_anon_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'payment-proofs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- DONE
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Migration complete: payment collection tracking columns added, sync trigger updated, payment-proofs bucket created';
END $$;
