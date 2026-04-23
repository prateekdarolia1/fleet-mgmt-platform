-- Add upi_last4 to payments table (source of truth)
-- rental_payments already has this column; the sync trigger already syncs it.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS upi_last4 TEXT NULL;

COMMENT ON COLUMN public.payments.upi_last4 IS
  'Last 4 digits of UPI VPA/ID used for payment (only populated when payment_mode = upi)';
