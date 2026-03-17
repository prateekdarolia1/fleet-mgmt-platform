# Retroactive UI Entry - Technical Design

## Overview

This document describes the minimal changes needed to enable retroactive data entry through UI forms while integrating with the existing historical tracking system.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RETROACTIVE ENTRY ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  CURRENT STATE (Blocked)                                                 │   │
│  │                                                                         │   │
│  │  User selects past date                                                  │   │
│  │         ↓                                                                │   │
│  │  ❌ Calendar disabled={date => date < new Date()}                        │   │
│  │         ↓                                                                │   │
│  │  Cannot proceed                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  NEW STATE (Retroactive Entry)                                          │   │
│  │                                                                         │   │
│  │  User selects past date                                                  │   │
│  │         ↓                                                                │   │
│  │  ✅ Calendar allows selection                                            │   │
│  │         ↓                                                                │   │
│  │  ┌─────────────────────────────────────┐                                │   │
│  │  │  PastDateConfirmationDialog         │                                │   │
│  │  │  "This date is in the past.         │                                │   │
│  │  │   Create as historical entry?"      │                                │   │
│  │  └─────────────────────────────────────┘                                │   │
│  │         ↓                                                                │   │
│  │  [Cancel]  [Confirm as Historical]                                       │   │
│  │         ↓                                                                │   │
│  │  Form submission with is_historical=true                                │   │
│  │         ↓                                                                │   │
│  │  Backend RPC accepts past date                                          │   │
│  │  Sets: data_source='MANUAL_ENTRY', confidence_score=0.70               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. PastDateConfirmationDialog Component

A reusable confirmation dialog for retroactive entries.

```tsx
// src/components/shared/PastDateConfirmationDialog.tsx

interface PastDateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  date: Date;
  entityType: 'ledger' | 'payment' | 'rider' | 'vehicle';
}

/**
 * Confirmation dialog shown when user selects a past date.
 * Follows React best practices:
 * - Controlled component pattern
 * - Accessible dialog with proper focus management
 * - Clear, actionable messaging
 */
export function PastDateConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  date,
  entityType
}: PastDateConfirmationDialogProps) {
  // Implementation uses shadcn/ui AlertDialog
}
```

### 2. useRetroactiveEntry Hook

A custom hook to handle retroactive entry logic.

```tsx
// src/hooks/useRetroactiveEntry.ts

interface UseRetroactiveEntryOptions {
  entityType: 'ledger' | 'payment' | 'rider' | 'vehicle';
  onConfirm: (data: any, isHistorical: boolean) => Promise<void>;
}

interface UseRetroactiveEntryReturn {
  isHistorical: boolean;
  showConfirmation: boolean;
  selectedDate: Date | null;
  handleDateChange: (date: Date | undefined) => void;
  confirmHistorical: () => void;
  cancelHistorical: () => void;
}

/**
 * Hook to manage retroactive entry state and confirmation flow.
 *
 * Benefits:
 * - Separates concerns from form components
 * - Reusable across different entity types
 * - Encapsulates confirmation logic
 */
export function useRetroactiveEntry({
  entityType,
  onConfirm
}: UseRetroactiveEntryOptions): UseRetroactiveEntryReturn {
  // State management for retroactive flow
}
```

### 3. Updated Form Components

Minimal changes to existing forms using composition pattern.

```tsx
// Before: CreateLedgerForm.tsx
<Calendar
  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
  // ...
/>

// After: CreateLedgerForm.tsx
<Calendar
  disabled={undefined}  // Remove restriction
  // ...
/>
<PastDateConfirmationDialog
  open={showPastDateDialog}
  onConfirm={handleConfirmHistorical}
  date={selectedDate}
  entityType="ledger"
/>
```

## Backend Changes

### 1. Update confirm_rental_start RPC

```sql
-- BEFORE: Strict past date rejection
IF p_rental_start_date < CURRENT_DATE - 2 THEN
  RAISE EXCEPTION 'Rental start date cannot be more than 2 days in the past';
END IF;

-- AFTER: Accept past dates, set historical flags
IF p_rental_start_date < CURRENT_DATE - 2 THEN
  -- Mark as historical entry instead of rejecting
  UPDATE rental_ledgers SET
    is_historical_import = TRUE,
    data_source = 'MANUAL_ENTRY',
    confidence_score = 0.70,
    effective_start_date = p_rental_start_date
  WHERE id = p_ledger_id;

  -- Create retroactive event for timeline
  INSERT INTO retroactive_events (
    entity_type, entity_id, event_type, effective_date, source, confidence
  ) VALUES (
    'ledger', p_ledger_id::TEXT, 'RETROACTIVE_START', p_rental_start_date, 'MANUAL_ENTRY', 0.70
  );
END IF;
```

### 2. New RPC Parameter for Explicit Historical Flag

```sql
-- Add optional parameter to make intent explicit
CREATE OR REPLACE FUNCTION confirm_rental_start(
  p_ledger_id UUID,
  p_rental_start_date DATE,
  p_security_deposit DECIMAL(10,2) DEFAULT 0,
  p_responsible_user_id UUID DEFAULT NULL,
  p_confirmed_by UUID DEFAULT NULL,
  p_is_historical BOOLEAN DEFAULT FALSE  -- NEW: Explicit flag
)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RETROACTIVE ENTRY DATA FLOW                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. USER SELECTS DATE                                                           │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │  Calendar component                                                   │   │
│     │  User picks: 2024-06-15 (past date)                                  │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│  2. DETECTION                                                                    │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │  useRetroactiveEntry hook detects past date                          │   │
│     │  isHistorical = date < new Date().setHours(0,0,0,0)                  │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│  3. CONFIRMATION                                                                 │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │  PastDateConfirmationDialog                                          │   │
│     │  "This date (Jun 15, 2024) is in the past."                         │   │
│     │  "This entry will be marked as historical with 70% confidence."     │   │
│     │  [Cancel] [Confirm as Historical Entry]                              │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│  4. SUBMISSION                                                                   │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │  Form submission includes:                                            │   │
│     │  {                                                                    │   │
│     │    rental_start_date: "2024-06-15",                                  │   │
│     │    is_historical: true,                                              │   │
│     │    data_source: "MANUAL_ENTRY",  // set by hook                      │   │
│     │    confidence_score: 0.70        // set by hook                      │   │
│     │  }                                                                    │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                          │
│  5. BACKEND PROCESSING                                                           │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │  RPC confirm_rental_start:                                           │   │
│     │  • Accepts past date (no exception)                                  │   │
│     │  • Sets is_historical_import = TRUE                                  │   │
│     │  • Sets data_source = 'MANUAL_ENTRY'                                 │   │
│     │  • Sets confidence_score = 0.70                                      │   │
│     │  • Sets effective_start_date = p_rental_start_date                   │   │
│     │  • Creates retroactive_event record                                  │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Files to Modify

### Frontend

| File | Change | Lines Changed |
|------|--------|---------------|
| `src/components/fleet/CreateLedgerForm.tsx` | Remove date restriction, add confirmation | ~20 |
| `src/components/shared/PastDateConfirmationDialog.tsx` | **NEW** - Reusable dialog | ~80 |
| `src/hooks/useRetroactiveEntry.ts` | **NEW** - Hook for retroactive logic | ~60 |
| `src/components/shared/index.ts` | Export new component | ~2 |

### Backend

| File | Change | Lines Changed |
|------|--------|---------------|
| `supabase/migrations/20260317_update_confirm_rental_start_for_retroactive.sql` | **NEW** - Update RPC | ~40 |

## React Best Practices Applied

1. **Composition over Inheritance**
   - PastDateConfirmationDialog is a separate composable component
   - Forms use the dialog via composition, not inheritance

2. **Custom Hooks for Logic**
   - `useRetroactiveEntry` encapsulates detection and confirmation logic
   - Forms remain focused on presentation

3. **Controlled Components**
   - Dialog open state is controlled by parent
   - Predictable state flow

4. **Accessibility**
   - AlertDialog provides proper focus management
   - Clear, actionable button labels
   - Keyboard navigation support

5. **Performance**
   - No unnecessary re-renders
   - Memoized date comparison in hook
   - Lazy validation (only when submitting)

## Migration Path

1. **Step 1**: Create shared components (PastDateConfirmationDialog, hook)
2. **Step 2**: Update CreateLedgerForm to use new pattern
3. **Step 3**: Update backend RPC
4. **Step 4**: Test and verify historical tracking integration
5. **Step 5**: Apply pattern to other forms (payments, riders)

## Testing Strategy

```typescript
// Unit tests for hook
describe('useRetroactiveEntry', () => {
  it('detects past dates correctly', () => {});
  it('does not trigger for current/future dates', () => {});
  it('resets state after confirmation', () => {});
});

// Integration tests for form
describe('CreateLedgerForm with retroactive entry', () => {
  it('shows confirmation for past dates', () => {});
  it('submits with historical flags after confirmation', () => {});
  it('cancels without submitting', () => {});
});
```
