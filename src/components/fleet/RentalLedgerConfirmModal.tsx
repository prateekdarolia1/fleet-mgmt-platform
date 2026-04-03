import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, User, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirmRentalStart } from '@/hooks/useRentalLedgers';
import { useProfiles } from '@/hooks/useProfiles';
import { PastDateConfirmationDialog } from '@/components/shared';
import { getHistoricalTrackingFields } from '@/hooks/useRetroactiveEntry';

/**
 * Validation schema for rental confirmation
 * Allows: Any valid date (past dates trigger confirmation dialog)
 */
const rentalConfirmSchema = z.object({
  rental_start_date: z.string()
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, { message: 'Please enter a valid date' }),
  security_deposit: z.number()
    .min(0, 'Security deposit cannot be negative')
    .max(50000, 'Security deposit seems too high (max ₹50,000)'),
  responsible_user_id: z.string().optional(),
  notes: z.string().max(500).optional()
});

type RentalConfirmFormData = z.infer<typeof rentalConfirmSchema>;

interface RentalLedgerConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string | null;
  riderName: string;
  vehicleNumber?: string | null;
  riderId?: string;
  onSuccess?: () => void;
}

/**
 * Modal for confirming rental start
 *
 * This modal is shown after a rental ledger is created (when rider is activated).
 * It collects:
 * 1. Rental start date (within 2 days past or 1 day future)
 * 2. Security deposit amount
 * 3. Responsible user (optional)
 * 4. Notes (optional)
 *
 * On confirmation, it calls confirm_rental_start RPC which:
 * - Updates ledger with start date and deposit
 * - Generates first 2 payment entries
 */
export const RentalLedgerConfirmModal = ({
  open,
  onOpenChange,
  ledgerId,
  riderName,
  vehicleNumber,
  riderId,
  onSuccess
}: RentalLedgerConfirmModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPastDateDialog, setShowPastDateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<RentalConfirmFormData | null>(null);
  const [isHistorical, setIsHistorical] = useState(false);

  const confirmRentalStart = useConfirmRentalStart();
  const { data: profiles } = useProfiles();

  const form = useForm<RentalConfirmFormData>({
    resolver: zodResolver(rentalConfirmSchema),
    mode: 'onChange',
    defaultValues: {
      rental_start_date: format(new Date(), 'yyyy-MM-dd'),
      security_deposit: 0,
      responsible_user_id: '',
      notes: ''
    }
  });

  const handleSubmit = async (data: RentalConfirmFormData, forceHistorical = false) => {
    if (!ledgerId) {
      return;
    }

    // Check if date is in the past
    const selectedDate = new Date(data.rental_start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (!forceHistorical && selectedDate < today) {
      // Past date detected - show confirmation
      setPendingFormData(data);
      setShowPastDateDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const historicalFields = forceHistorical || isHistorical
        ? getHistoricalTrackingFields(true)
        : {};

      await confirmRentalStart.mutateAsync({
        ledger_id: ledgerId,
        rental_start_date: data.rental_start_date,
        security_deposit: data.security_deposit,
        responsible_user_id: data.responsible_user_id || undefined,
        is_historical: forceHistorical || isHistorical,
        ...historicalFields,
      });

      // Reset form and close modal
      form.reset();
      setShowPastDateDialog(false);
      setPendingFormData(null);
      setIsHistorical(false);
      onOpenChange(false);

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error('Error confirming rental start:', error);
      // Error is handled by the mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmHistorical = () => {
    setShowPastDateDialog(false);
    setIsHistorical(true);
    if (pendingFormData) {
      handleSubmit(pendingFormData, true);
    }
  };

  const handleCancelHistorical = () => {
    setShowPastDateDialog(false);
    setPendingFormData(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const watchDeposit = form.watch('security_deposit');
  const watchDate = form.watch('rental_start_date');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Confirm Rental Start</DialogTitle>
          <DialogDescription>
            Complete the rental setup for <span className="font-semibold">{riderName}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Info Alert */}
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Action Required</p>
                <p className="text-sm text-amber-800 mt-1">
                  Confirm the rental start details. This will generate the first 2 weekly payment entries.
                </p>
              </div>
            </div>

            {/* Ledger Info Summary */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-0 bg-slate-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rider</p>
                      <p className="font-semibold text-sm">{riderName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {vehicleNumber && (
                <Card className="border-0 bg-slate-50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle</p>
                        <p className="font-semibold text-sm">{vehicleNumber}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Rental Start Date */}
            <FormField
              control={form.control}
              name="rental_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Rental Start Date
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                      Required
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isSubmitting}
                      className={cn(
                        'text-base font-medium border-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                        field.value && 'border-blue-200 bg-blue-50/30'
                      )}
                    />
                  </FormControl>
                  <FormDescription>
                    Select the rental start date. Past dates will be marked as historical entries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Security Deposit */}
            <FormField
              control={form.control}
              name="security_deposit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    Security Deposit
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        placeholder="0"
                        min={0}
                        max={50000}
                        disabled={isSubmitting}
                        className={cn(
                          'pl-8 text-base font-medium border-2 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                          watchDeposit > 0 && 'border-green-200 bg-green-50/30'
                        )}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Optional security deposit collected from rider
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsible User */}
            <FormField
              control={form.control}
              name="responsible_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsible User (Optional)</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={isSubmitting}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border-2 bg-background text-sm font-medium transition-colors',
                        'hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                        field.value ? 'border-blue-200 bg-blue-50/30' : 'border-input'
                      )}
                    >
                      <option value="">Select a team member...</option>
                      {profiles?.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name} ({profile.email})
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Person responsible for following up on this rental
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      disabled={isSubmitting}
                      rows={2}
                      placeholder="Any additional notes about this rental..."
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border-2 bg-background text-sm transition-colors resize-none',
                        'hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                        'border-input placeholder:text-muted-foreground'
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary Card */}
            {watchDate && (
              <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">Ready to Confirm</p>
                    <div className="text-sm text-green-800 mt-1 space-y-1">
                      <p>Rental start: <span className="font-medium">{format(new Date(watchDate), 'dd MMM yyyy')}</span></p>
                      {watchDeposit > 0 && (
                        <p>Security deposit: <span className="font-medium">₹{watchDeposit.toLocaleString()}</span></p>
                      )}
                      <p className="text-xs text-green-700 mt-2">
                        2 payment entries will be created automatically
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isSubmitting || !ledgerId}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Confirming...' : 'Confirm & Start Rental'}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Past Date Confirmation Dialog */}
        <PastDateConfirmationDialog
          open={showPastDateDialog}
          onOpenChange={(open) => {
            if (!open) handleCancelHistorical();
          }}
          onConfirm={handleConfirmHistorical}
          date={pendingFormData ? new Date(pendingFormData.rental_start_date) : null}
          entityType="ledger"
        />
      </DialogContent>
    </Dialog>
  );
};
