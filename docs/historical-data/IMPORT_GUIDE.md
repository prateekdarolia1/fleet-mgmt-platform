# Historical Data Import Guide

## Overview

The Historical Data Management System enables retroactive loading of data that predates the platform's go-live date (April 1, 2026). This system allows importing historical vehicle deployments, rider assignments, battery mappings, and payment records from CSV files.

## Key Concepts

### Data Sources

| Source | Confidence Score | Description |
|--------|-----------------|-------------|
| PLATFORM | 1.00 | Real-time platform capture |
| EXACT_REVENUE_CSV | 0.95 | Exact revenue records |
| CL87_CSV | 0.90 | CL87 Battery Smart export |
| PAYMENT_RECORDS_CSV | 0.90 | Payment records CSV |
| BATTERY_SMART_CSV | 0.85 | Battery Smart export |
| MANUAL_ENTRY | 0.70 | Human-entered data |
| ESTIMATED_DATE | 0.50 | Calculated/derived dates |
| DEFAULT_FILL | 0.30 | Assumed values |

### Confidence Scoring

Each imported record receives a confidence score (0.00-1.00) based on:
- Data source reliability
- Completeness of information
- Date estimation accuracy

**Quality Levels:**
- **High (≥0.90)**: Verified data from reliable sources
- **Moderate (0.70-0.89)**: Partially estimated, may need review
- **Low (<0.70)**: Heavily estimated, manual verification recommended

## Import Workflow

### 5-Phase Process

```
1. PREPARE    → Parse and validate CSV
2. RECONCILE  → Match against existing DB records
3. TRANSFORM  → Apply estimations, create ghost entities
4. EXECUTE    → Insert/update with transaction
5. VERIFY     → Validate import results
```

### Phase Details

#### Phase 1: Prepare
- Parses CSV content
- Validates column headers
- Normalizes data formats
- Detects entity types

#### Phase 2: Reconcile
- Matches CSV records to database
- Categorizes as: EXACT_MATCH, CONFLICT, NEW_RECORD, MISSING_IN_CSV
- Generates preview report
- Identifies ghost entities needed

#### Phase 3: Transform
- Applies date estimation rules
- Creates ghost entities for missing references
- Calculates effective dates
- Generates retroactive events

#### Phase 4: Execute
- Creates import batch record
- Inserts/updates records
- Links to batch for traceability
- Handles transactions

#### Phase 5: Verify
- Counts created records
- Validates data integrity
- Generates summary statistics

## Using the Import Panel

### Step 1: Upload CSV
1. Navigate to **Settings > Import > Historical Data**
2. Click "Upload CSV File"
3. Select your CSV file (CL87, payment records, etc.)
4. Enter a batch name for tracking

### Step 2: Preview Import
- Review the reconciliation summary
- Check for conflicts and warnings
- Identify low-confidence records
- Review ghost entities to be created

### Step 3: Resolve Conflicts
- CSV data takes precedence by default
- Manual resolution available for specific fields
- Dry run option to preview without changes

### Step 4: Execute Import
- Click "Proceed with Import"
- Monitor progress through phases
- Review final summary

### Step 5: Verify Results
- Check import batch summary
- Review created records
- Verify data quality indicators

## CL87 CSV Import

### Expected Format

```csv
S.No,Make & Model,Speed Type,Chassis Number,Vehicle ID,Driver ID,Battery ID,Deployment Date,Zone ID,Zone Name,USC ID
1,Hero Electric Optima,High Speed,MH01AB1234,VH001,DR001,BT001,2024-01-15,Z001,Zone A,USC001
```

### Column Mapping

| CSV Column | Database Field | Entity |
|------------|---------------|--------|
| Vehicle ID | vehicle_number | vehicles |
| Driver ID | rider_id | riders |
| Battery ID | battery_id | batteries |
| Deployment Date | effective_start_date | all |

### Confidence Calculation

```typescript
// Base confidence for CL87
let score = 0.90;

// Reduce for missing dates
if (!deployment_date) score *= 0.8;

// Reduce for invalid date format
if (invalid_date) score *= 0.7;

// Reduce for missing IDs
if (!vehicle_id || !driver_id || !battery_id) score *= 0.5;
```

## Ghost Entities

### What are Ghost Entities?

Ghost entities are placeholder records created when:
- CSV references an entity not in the database
- Vehicle/battery/rider ID is referenced but doesn't exist
- Need to maintain referential integrity

### Ghost Entity Behavior

- Marked with `is_historical_import = true`
- Confidence score = 0.30
- `data_source = 'DEFAULT_FILL'`
- Name prefixed with "Imported [Type]"

### Resolving Ghosts

1. Identify ghost entities in import summary
2. Update with correct information
3. Merge with real entities if duplicates exist
4. Delete if no longer needed

## Rollback

### When to Rollback

- Import created incorrect data
- Major data quality issues discovered
- Wrong date range imported

### How to Rollback

1. Navigate to **Settings > Import > History**
2. Find the import batch
3. Click "Rollback"
4. Confirm the action

**Note:** Rollback deletes all records created by the batch and sets batch status to `rolled_back`.

## Best Practices

### Before Import
1. Backup database (if production)
2. Use dry run first
3. Review preview carefully
4. Check data quality warnings

### During Import
1. Monitor progress indicators
2. Note any errors
3. Don't interrupt the process

### After Import
1. Verify record counts
2. Check confidence scores
3. Review ghost entities
4. Update low-confidence records

### Data Quality Tips
- Use exact dates when available
- Provide complete entity information
- Cross-reference multiple sources
- Document estimation assumptions

## Troubleshooting

### Common Errors

**"Entity not found"**
- Ghost entity will be created
- Update with correct information after import

**"Invalid date format"**
- Use ISO format: YYYY-MM-DD
- Date estimation will be applied

**"Confidence too low"**
- Review source data quality
- Add missing information
- Consider manual entry

### Support

For issues or questions:
1. Check the import batch notes
2. Review retroactive events
3. Contact system administrator
