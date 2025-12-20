# Batteries Table Setup

## Quick Start

```bash
# Step 1: Setup table
npm run setup:batteries

# Step 2: Deploy to Supabase (Manual)
# Copy SQL from migrations/create_batteries_table.sql
# Paste into: https://app.supabase.com/project/kkxxnpfwvlbsqvmbirqa/sql

# Step 3: Verify
npm run verify:batteries

# Step 4: Deploy validation (Manual)
# Copy SQL from migrations/add_batteries_validation.sql
# Paste into same SQL Editor

# Step 5: Test validation
npm run test:batteries-validation
```

## Files

| File | Purpose |
|------|---------|
| `migrations/create_batteries_table.sql` | Creates table, enums, indexes, RLS |
| `migrations/add_batteries_validation.sql` | Adds CHECK constraints and triggers |
| `setup-batteries-table.mjs` | Interactive setup helper |
| `verify-batteries-table.mjs` | Verification tests |
| `test-batteries-validation.mjs` | Validation test suite |
| `@docs/batteries/*` | Complete documentation |

## Commands

```bash
npm run setup:batteries          # Display setup instructions
npm run verify:batteries         # Test basic table functionality
npm run test:batteries-validation # Test all validation rules
```

## Next Steps

1. Read `02-SCHEMA.md` for table structure
2. Read `03-VALIDATION.md` for validation rules
3. Run setup and deployment steps above
4. Review `04-INTEGRATION.md` for TypeScript usage
