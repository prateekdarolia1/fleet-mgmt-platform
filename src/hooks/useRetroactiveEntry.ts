/**
 * useRetroactiveEntry
 *
 * A custom hook to manage retroactive entry logic for forms.
 * Detects when a user selects a past date and provides confirmation flow.
 *
 * @example
 * ```tsx
 * const {
 *   isHistorical,
 *   showConfirmation,
 *   handleDateChange,
 *   confirmHistorical,
 *   cancelHistorical,
 * } = useRetroactiveEntry({
 *   entityType: 'ledger',
 *   onConfirm: async (data, isHistorical) => {
 *     // Submit form with historical flags
 *   },
 * });
 *
 * // In date picker:
 * <Calendar onSelect={handleDateChange} />
 *
 * // Confirmation dialog:
 * <PastDateConfirmationDialog
 *   open={showConfirmation}
 *   onConfirm={confirmHistorical}
 *   date={selectedDate}
 *   entityType="ledger"
 * />
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import type { RetroactiveEntityType } from '@/components/shared/PastDateConfirmationDialog';

interface UseRetroactiveEntryOptions {
  /** The type of entity being created */
  entityType: RetroactiveEntityType;
  /** Called when user confirms (either normal or historical) */
  onConfirm: (data: { isHistorical: boolean }) => Promise<void> | void;
}

interface UseRetroactiveEntryReturn {
  /** Whether the current entry is historical (past date) */
  isHistorical: boolean;
  /** Whether the confirmation dialog should be shown */
  showConfirmation: boolean;
  /** The currently selected date */
  selectedDate: Date | null;
  /** Call this when date changes in the form */
  handleDateChange: (date: Date | undefined, callback?: (date: Date) => void) => void;
  /** Call this when user confirms the historical entry */
  confirmHistorical: () => void;
  /** Call this when user cancels the historical entry */
  cancelHistorical: () => void;
  /** Reset the hook state */
  reset: () => void;
}

/**
 * Determines if a date is in the past (before today).
 */
function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
}

/**
 * Hook to manage retroactive entry state and confirmation flow.
 *
 * Features:
 * - Detects past dates automatically
 * - Manages confirmation dialog state
 * - Provides clean callback interface
 * - Reusable across different entity types
 */
export function useRetroactiveEntry({
  entityType,
  onConfirm,
}: UseRetroactiveEntryOptions): UseRetroactiveEntryReturn {
  const [isHistorical, setIsHistorical] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingCallback, setPendingCallback] = useState<((date: Date) => void) | null>(null);

  const handleDateChange = useCallback(
    (date: Date | undefined, callback?: (date: Date) => void) => {
      if (!date) {
        setSelectedDate(null);
        setIsHistorical(false);
        return;
      }

      setSelectedDate(date);

      if (isPastDate(date)) {
        // Past date selected - show confirmation
        setIsHistorical(true);
        setShowConfirmation(true);
        setPendingCallback(() => callback || null);
      } else {
        // Current or future date - proceed normally
        setIsHistorical(false);
        callback?.(date);
      }
    },
    []
  );

  const confirmHistorical = useCallback(() => {
    setShowConfirmation(false);
    if (selectedDate && pendingCallback) {
      pendingCallback(selectedDate);
    }
    // The form can now submit with isHistorical = true
  }, [selectedDate, pendingCallback]);

  const cancelHistorical = useCallback(() => {
    setShowConfirmation(false);
    setSelectedDate(null);
    setIsHistorical(false);
    setPendingCallback(null);
  }, []);

  const reset = useCallback(() => {
    setIsHistorical(false);
    setShowConfirmation(false);
    setSelectedDate(null);
    setPendingCallback(null);
  }, []);

  return useMemo(
    () => ({
      isHistorical,
      showConfirmation,
      selectedDate,
      handleDateChange,
      confirmHistorical,
      cancelHistorical,
      reset,
    }),
    [
      isHistorical,
      showConfirmation,
      selectedDate,
      handleDateChange,
      confirmHistorical,
      cancelHistorical,
      reset,
    ]
  );
}

/**
 * Returns historical tracking fields to add to form data.
 * Use this when submitting a retroactive entry.
 */
export function getHistoricalTrackingFields(isHistorical: boolean) {
  if (!isHistorical) {
    return {
      is_historical: false,
    };
  }

  return {
    is_historical: true,
    data_source: 'MANUAL_ENTRY' as const,
    confidence_score: 0.70,
  };
}
