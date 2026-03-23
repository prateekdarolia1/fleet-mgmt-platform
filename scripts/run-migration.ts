import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Environment variables from .env
const supabaseUrl = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY?.replace(/^["']|["']$/g, '');

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY in environment');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  const migrationPath = resolve(import.meta.dirname, '../supabase/migrations/20260323_add_ledger_lifecycle_fields.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('Running migration: add_ledger_lifecycle_fields.sql');
  console.log('---');

  // Split SQL into individual statements
  const statements: string[] = [];
  let currentStatement = '';
  let inDoBlock = false;
  let dollarCount = 0;

  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip pure comment lines
    if (line.trim().startsWith('--') && !line.includes('DO $$')) continue;

    // Track DO blocks
    if (line.includes('DO $$')) {
      inDoBlock = true;
      dollarCount = 0;
    }

    currentStatement += line + '\n';

    if (inDoBlock) {
      // Count $$ occurrences
      const matches = line.match(/\$\$/g);
      if (matches) {
        dollarCount += matches.length;
      }
      // DO block ends with END $$;
      if (dollarCount >= 2 && line.includes('END $$;')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inDoBlock = false;
        dollarCount = 0;
      }
    } else if (line.trim().endsWith(';') && currentStatement.trim()) {
      // Regular statement
      const trimmed = currentStatement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      currentStatement = '';
    }
  }

  console.log(`Found ${statements.length} statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n')[0].substring(0, 80);
    console.log(`[${i + 1}/${statements.length}] ${firstLine}...`);

    // Supabase client doesn't support raw SQL execution
    // We need to use the management API or SQL editor
    console.log('  Note: Supabase JS client cannot execute DDL directly.');
    console.log('  Please run this migration in Supabase SQL Editor.\n');
  }

  console.log('---');
  console.log('To apply this migration:');
  console.log('1. Open Supabase Dashboard > SQL Editor');
  console.log('2. Copy the contents of:');
  console.log(`   ${migrationPath}`);
  console.log('3. Paste and click "Run"');
}

runMigration().catch(console.error);
