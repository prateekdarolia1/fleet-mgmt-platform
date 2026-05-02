import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkxxnpfwvlbsqvmbirqa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q'
)

async function read() {
  const [riders, vehicles, riderLedgers, rentalLedgers, payments, rentalPayments] = await Promise.all([
    supabase.from('riders').select('rider_id, name, status, duty_status'),
    supabase.from('vehicles').select('id, vehicle_number, status, rider_id, rider_name'),
    supabase.from('rider_ledgers').select('id, rider_id, rider_name, status, rental_amount, rental_start_date'),
    supabase.from('rental_ledgers').select('id, rider_id, rider_name, status, rental_amount'),
    supabase.from('payments').select('payment_id, rider_id, rider_name, amount, status, payment_type, ledger_id'),
    supabase.from('rental_payments').select('payment_id, ledger_id, week_number, amount_due, status'),
  ])

  console.log('\n=== RIDERS ===')
  console.table(riders.data)

  console.log('\n=== VEHICLES ===')
  console.table(vehicles.data)

  console.log('\n=== RIDER_LEDGERS ===')
  console.table(riderLedgers.data)

  console.log('\n=== RENTAL_LEDGERS ===')
  console.table(rentalLedgers.data)

  console.log('\n=== PAYMENTS ===')
  console.table(payments.data)

  console.log('\n=== RENTAL_PAYMENTS ===')
  console.table(rentalPayments.data)
}

read()
