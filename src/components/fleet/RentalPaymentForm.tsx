import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import { Loader2, IndianRupee, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRentalPaymentById, useMarkRentalPaymentPaid, type RentalPaymentMode } from '@/hooks/useRentalPayments';
import { toast } from 'sonner';

/**
 * Validation schema for payment form
 */
const paymentFormSchema = z.object({
  paid_amount: z.number()
    .positive('Amount must be greater than 0')
    .max(100000, 'Amount seems too high (max ₹1,00,000)'),
  payment_mode: z.enum(['cash', 'upi', 'bank-transfer', 'card', 'other'] as const),
  upi_last4: z.string()
    .length(4, 'UPI last 4 must be exactly 4 characters')
    .regex(/^[A-Za-z0-9]{4}$/, 'UPI last 4 must be alphanumeric')
    .optional()
    .or(z.literal('')),
  received_by: z.string().optional(),
  external_ref: z.string().max(100).optional(),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    // UPI last 4 is required when payment mode is UPI
    if (data.payment_mode === 'upi') {
      return !!data.upi_last4 && data.upi_last4.length === 4;
    }
    return true;
  },
  {
    message: 'UPI last 4 is required for UPI payments',
    path: ['upi_last4']
  }
);

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface RentalPaymentFormProps {
  paymentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form for recording a rental payment
 *
 * Supports:
 * - Partial payments
 * - Multiple payment modes (Cash, UPI, Bank Transfer, Card, Other)
 * - UPI last 4 digits tracking (required for UPI payments)
 * - External reference tracking
 */
export const RentalPaymentForm = ({
  paymentId,
  onSuccess,
  onCancel
}: RentalPaymentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: payment, isLoading } = useRentalPaymentById(paymentId);
  const markPaymentPaid = useMarkRentalPaymentPaid();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    mode: 'onChange',
    defaultValues: {
      paid_amount: 0,
      payment_mode: 'cash',
      upi_last4: '',
      received_by: '',
      external_ref: '',
      notes: ''
    }
  });

  // Reset form with payment data when it loads
  useEffect(() => {
    if (payment) {
      const balanceAmount = payment.balance ?? payment.amount_due ?? 0;
      form.reset({
        paid_amount: balanceAmount,
        payment_mode: 'cash',
        upi_last4: '',
        received_by: '',
        external_ref: '',
        notes: ''
      });
    }
  }, [payment, form]);

  // Watch payment mode to conditionally show UPI field
  const watchPaymentMode = form.watch('payment_mode');
  const watchPaidAmount = form.watch('paid_amount');

  // Calculate if this is a partial payment
  const maxAmount = payment?.balance || payment?.amount_due || 0;
  const isPartialPayment = watchPaidAmount < maxAmount;

  const handleSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      await markPaymentPaid.mutateAsync({
        payment_id: paymentId,
        paid_amount: data.paid_amount,
        payment_mode: data.payment_mode,
        upi_last4: data.payment_mode === 'upi' ? data.upi_last4 : undefined,
        received_by: data.received_by || undefined,
        external_ref: data.external_ref || undefined,
        notes: data.notes || undefined
      });

      toast.success('Payment recorded successfully');
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error recording payment:', error);
      // Error handled by mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Payment not found
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* Payment Summary */}
        <div className="rounded-lg bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Week</span>
            <span className="font-medium">Week {payment.week_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Due</span>
            <span className="font-medium">₹{(payment.amount_due || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Already Paid</span>
            <span className="font-medium text-green-600">₹{(payment.paid_amount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">Remaining Balance</span>
            <span className="font-bold text-lg">₹{maxAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Paid Amount */}
        <FormField
          control={form.control}
          name="paid_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Amount Being Paid
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
                    max={maxAmount}
                    disabled={isSubmitting}
                    className={cn(
                      'pl-8 text-base font-medium border-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                      isPartialPayment && watchPaidAmount > 0 && 'border-amber-200 bg-amber-50/30'
                    )}
                  />
                </div>
              </FormControl>
              {isPartialPayment && watchPaidAmount > 0 && (
                <FormDescription className="text-amber-600">
                  This is a partial payment. Balance will be ₹{(maxAmount - watchPaidAmount).toLocaleString()}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Mode */}
        <FormField
          control={form.control}
          name="payment_mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Mode
              </FormLabel>
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
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UPI Last 4 (conditional) */}
        {watchPaymentMode === 'upi' && (
          <FormField
            control={form.control}
            name="upi_last4"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UPI Last 4 Characters</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., 4K9M"
                    maxLength={4}
                    disabled={isSubmitting}
                    className={cn(
                      'uppercase font-mono text-base font-medium border-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                      field.value?.length === 4 && 'border-green-200 bg-green-50/30'
                    )}
                  />
                </FormControl>
                <FormDescription>
                  Last 4 characters of the UPI ID (e.g., last 4 of name@okaxis)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* External Reference */}
        <FormField
          control={form.control}
          name="external_ref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External Reference (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Transaction ID, receipt number, etc."
                  disabled={isSubmitting}
                  className="border-2"
                />
              </FormControl>
              <FormDescription>
                For tracking external payment references
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
                  rows={2}
                  placeholder="Any additional notes..."
                  disabled={isSubmitting}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!form.formState.isValid || isSubmitting}
            className="flex-1 gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
