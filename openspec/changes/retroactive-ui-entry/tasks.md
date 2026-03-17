# Retroactive UI Entry - Implementation Tasks

## 1. Shared Components

- [ ] 1.1 Create `src/components/shared/PastDateConfirmationDialog.tsx`
  - AlertDialog component using shadcn/ui
  - Props: open, onOpenChange, onConfirm, date, entityType
  - Clear messaging about historical entry implications
  - Accessible with proper ARIA labels

- [ ] 1.2 Create `src/hooks/useRetroactiveEntry.ts`
  - State management for isHistorical, showConfirmation, selectedDate
  - handleDateChange function with past date detection
  - confirmHistorical and cancelHistorical functions
  - Reusable across entity types

- [ ] 1.3 Update `src/components/shared/index.ts`
  - Export PastDateConfirmationDialog
  - Export useRetroactiveEntry hook

## 2. Frontend Form Updates

- [ ] 2.1 Update `src/components/fleet/CreateLedgerForm.tsx`
  - Remove `disabled={(date) => date < new Date(...)}` from Calendar
  - Integrate useRetroactiveEntry hook
  - Add PastDateConfirmationDialog
  - Pass is_historical flag in submission

- [ ] 2.2 Update `src/components/fleet/RentalLedgerConfirmModal.tsx`
  - Remove past date restriction if present
  - Add confirmation dialog for retroactive starts

- [ ] 2.3 Update `src/components/fleet/AddRiderForm.tsx`
  - Review joined_since field (already allows past dates)
  - Add historical tracking for past onboard dates
  - Integrate with useRetroactiveEntry

## 3. Backend RPC Updates

- [ ] 3.1 Create migration `20260317_update_confirm_rental_start_for_retroactive.sql`
  - Add `p_is_historical BOOLEAN DEFAULT FALSE` parameter
  - Replace exception with historical flag setting
  - Set data_source = 'MANUAL_ENTRY' for past dates
  - Set confidence_score = 0.70 for past dates
  - Set effective_start_date to the past date
  - Create retroactive_event record

- [ ] 3.2 Update `src/hooks/useRentalLedgers.ts`
  - Pass is_historical flag to confirm_rental_start RPC
  - Handle historical entry response

## 4. Type Updates

- [ ] 4.1 Update `src/types/historical.ts` (if needed)
  - Ensure MANUAL_ENTRY is in DataSource type
  - Add any new interfaces for retroactive entry

- [ ] 4.2 Update Supabase types
  - Regenerate after migration
  - Verify new RPC parameter types

## 5. Testing

- [ ] 5.1 Unit tests for `useRetroactiveEntry` hook
  - Test past date detection
  - Test confirmation flow
  - Test cancel flow

- [ ] 5.2 Unit tests for `PastDateConfirmationDialog`
  - Test rendering with different entity types
  - Test accessibility

- [ ] 5.3 Integration tests for `CreateLedgerForm`
  - Test retroactive entry flow
  - Test normal entry flow (no changes)

- [ ] 5.4 E2E test for retroactive ledger creation
  - User selects past date
  - Confirmation appears
  - Entry created with historical flags

## 6. Documentation

- [ ] 6.1 Update `docs/historical-data/IMPORT_GUIDE.md`
  - Add section on UI-based retroactive entry
  - Document confidence score (0.70) for manual entries

- [ ] 6.2 Update `docs/historical-data/POINT_IN_TIME_QUERIES.md`
  - Add example of querying manually entered historical data

## Summary

| Category | Tasks | Est. Complexity |
|----------|-------|-----------------|
| Shared Components | 3 | Medium |
| Frontend Forms | 3 | Low |
| Backend RPC | 2 | Low |
| Types | 2 | Low |
| Testing | 4 | Medium |
| Documentation | 2 | Low |
| **Total** | **16** | **~2-3 days** |

## Dependencies

```
1.1 ──► 1.3
1.2 ──► 2.1, 2.2, 2.3
3.1 ──► 3.2 ──► 4.2
1.1, 1.2 ──► 5.1, 5.2
2.1 ──► 5.3, 5.4
```

## Critical Path

1. Create shared components (1.1, 1.2)
2. Update CreateLedgerForm (2.1)
3. Update backend RPC (3.1)
4. Test end-to-end (5.3, 5.4)
5. Apply to other forms (2.2, 2.3)
