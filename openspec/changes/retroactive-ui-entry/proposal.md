# Retroactive UI Entry - Proposal

## Problem Statement

Users cannot create ledgers, payments, and other records with past dates through the UI. The system blocks retroactive data entry at two layers:

1. **Frontend**: Calendar components disable past dates
2. **Backend**: RPC functions reject dates more than 2 days in the past

This prevents users from entering historical data that should have been captured before the platform's go-live date (April 1, 2026).

## Proposed Solution

Enable retroactive data entry by:
1. Removing past date restrictions from UI forms
2. Updating backend RPCs to accept historical dates
3. Integrating with the existing historical tracking system (confidence scores, data sources)
4. Adding confirmation dialogs when users enter past dates

## Scope

### In Scope
- Rental ledger creation with past dates
- Payment entry with past dates
- Rider onboarding with past dates
- Integration with historical tracking fields

### Out of Scope
- Bulk CSV import (already handled by historical-data-management)
- Editing existing records to change dates
- Future date scheduling changes

## Success Criteria

- [ ] Users can create ledgers with any past date
- [ ] Users can add payment entries for past periods
- [ ] Retroactive entries get proper historical tracking (data_source, confidence_score)
- [ ] Confirmation dialog appears for past dates
- [ ] No regression in normal (current date) operations

## Dependencies

- `historical-data-management` - Provides historical tracking infrastructure
- Existing form components (CreateLedgerForm, AddRiderForm, etc.)
- Backend RPCs (confirm_rental_start, etc.)

## Risks

| Risk | Mitigation |
|------|------------|
| Users accidentally enter wrong past dates | Confirmation dialog with clear warning |
| Data integrity issues | Confidence scoring marks manual entries as 0.70 |
| Performance with old dates | No change - same query patterns |

## Timeline

- **Phase 1**: Frontend changes (remove date blocks, add confirmations)
- **Phase 2**: Backend changes (update RPCs)
- **Phase 3**: Integration with historical tracking
- **Phase 4**: Testing and documentation
