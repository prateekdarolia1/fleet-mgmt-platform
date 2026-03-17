/**
 * PastDateConfirmationDialog
 *
 * A reusable confirmation dialog shown when a user selects a past date
 * in a form. Warns about historical entry implications and requires
 * explicit confirmation before proceeding.
 *
 * @example
 * ```tsx
 * <PastDateConfirmationDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onConfirm={handleConfirm}
 *   date={selectedDate}
 *   entityType="ledger"
 * />
 * ```
 */

import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export type RetroactiveEntityType = 'ledger' | 'payment' | 'rider' | 'vehicle';

interface PastDateConfirmationDialogProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Called when user confirms the historical entry */
  onConfirm: () => void;
  /** The past date that was selected */
  date: Date | null;
  /** The type of entity being created with a past date */
  entityType: RetroactiveEntityType;
}

const ENTITY_LABELS: Record<RetroactiveEntityType, string> = {
  ledger: 'rental ledger',
  payment: 'payment entry',
  rider: 'rider record',
  vehicle: 'vehicle record',
};

/**
 * Confirmation dialog for retroactive data entry.
 *
 * Features:
 * - Accessible with proper ARIA labels
 * - Clear warning about historical entry implications
 * - Shows confidence score (70%) for manual entries
 * - Keyboard navigation support
 */
export function PastDateConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  date,
  entityType,
}: PastDateConfirmationDialogProps) {
  const formattedDate = date ? format(date, 'MMMM d, yyyy') : 'the selected date';
  const entityLabel = ENTITY_LABELS[entityType];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            <AlertDialogTitle>Historical Entry Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The date <strong>{formattedDate}</strong> is in the past.
              </p>
              <p>
                This {entityLabel} will be created as a <strong>historical entry</strong> with:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Confidence score of <strong>70%</strong> (manual entry)</li>
                <li>Marked as historical data in reports</li>
                <li>Effective from the selected date</li>
              </ul>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Please verify this date is correct before proceeding.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
          >
            Confirm as Historical Entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
