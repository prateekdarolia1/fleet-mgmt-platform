import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kkxxnpfwvlbsqvmbirqa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreHhucGZ3dmxic3F2bWJpcnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczOTQ2MDYsImV4cCI6MjA3Mjk3MDYwNn0.Z5JrrxfynbUkuoImR5mFaI1tIERkRRzMqj3Ncp0e02Q'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABLES = [
  'vehicles',
  'riders',
  'batteries',
  'payments',
  'rider_ledgers',
  'rental_ledgers',
  'rental_payments',
  'notifications',
  'battery_events',
  'vehicle_events',
  'rider_events',
  'data_import_batches',
  'retroactive_events',
  'places',
  'profiles',
  'user_roles',
]

const results = {}

for (const table of TABLES) {
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .limit(5)

  results[table] = {
    count: count ?? (error ? 'ERROR' : data?.length ?? 0),
    sample: data ?? [],
    error: error?.message ?? null,
  }

  const status = error
    ? `❌ ${error.message}`
    : `✅ ${count ?? data?.length} rows (showing up to 5)`

  console.log(`[${table}] ${status}`)
}

// Write full output to file
import { writeFileSync } from 'fs'
writeFileSync(
  'scripts/db-snapshot.json',
  JSON.stringify(results, null, 2)
)

console.log('\nFull snapshot saved to scripts/db-snapshot.json')
