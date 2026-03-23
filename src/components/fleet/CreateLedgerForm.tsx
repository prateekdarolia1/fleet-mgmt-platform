import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRiderLedgers, CreateLedgerData } from "@/hooks/useRiderLedgers";
import { PastDateConfirmationDialog } from "@/components/shared";
import { useRetroactiveEntry, getHistoricalTrackingFields } from "@/hooks/useRetroactiveEntry";

const ledgerSchema = z.object({
  rider_id: z.string().min(1, "Please select a rider"),
  security_deposit_amount: z.number().min(1, "Security deposit must be greater than 0"),
  payment_date: z.date({
    required_error: "Please select a payment date"
  }),
  transaction_id: z.string().min(1, "Transaction ID is required").max(100, "Transaction ID must be less than 100 characters"),
  rental_frequency: z.enum(['daily', 'weekly', 'monthly'], {
    required_error: "Please select a rental frequency"
  }),
  rental_amount: z.number().min(1, "Rental amount must be greater than 0"),
  rental_start_date: z.date({
    required_error: "Please select a start date"
  }),
  swaps_allowed_per_month: z.number().min(0, "Must be 0 or greater").max(99, "Maximum 99 swaps allowed").int("Must be a whole number").optional()
});

type LedgerFormData = z.infer<typeof ledgerSchema>;

interface CreateLedgerFormProps {
  onSuccess: () => void;
}

export const CreateLedgerForm = ({ onSuccess }: CreateLedgerFormProps) => {
  const { createLedger, getRidersWithoutLedgers } = useRiderLedgers();
  const [availableRiders, setAvailableRiders] = useState<Array<{ rider_id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<LedgerFormData | null>(null);

  // Retroactive entry state for rental_start_date
  const {
    isHistorical,
    showConfirmation: showPastDateDialog,
    selectedDate,
    handleDateChange,
    confirmHistorical,
    cancelHistorical,
  } = useRetroactiveEntry({
    entityType: 'ledger',
    onConfirm: () => {
      // Called after confirmation - will submit with historical flags
      if (pendingFormData) {
        executeSubmit(pendingFormData, true);
      }
    },
  });

  const form = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      rental_frequency: 'monthly',
      swaps_allowed_per_month: 8  // Default for monthly
    }
  });

  // Update swaps_allowed_per_month default when rental_frequency changes
  const rentalFrequency = form.watch('rental_frequency');
  useEffect(() => {
    const swapLimits = { daily: 2, weekly: 4, monthly: 8 };
    form.setValue('swaps_allowed_per_month', swapLimits[rentalFrequency]);
  }, [rentalFrequency, form]);

  useEffect(() => {
    const fetchAvailableRiders = async () => {
      const riders = await getRidersWithoutLedgers();
      setAvailableRiders(riders);
    };
    fetchAvailableRiders();
  }, [getRidersWithoutLedgers]);

  const onSubmit = async (data: LedgerFormData) => {
    if (loading) return;

    // If historical entry is already confirmed, proceed with submission
    if (isHistorical) {
      await executeSubmit(data, true);
      return;
    }

    // Check if rental_start_date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(data.rental_start_date);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      // Past date detected - store form data and show confirmation
      setPendingFormData(data);
      handleDateChange(data.rental_start_date);
      return;
    }

    // Normal submission for current/future dates
    await executeSubmit(data, false);
  };

  const executeSubmit = async (data: LedgerFormData, isHistoricalEntry: boolean) => {
    setLoading(true);
    try {
      const selectedRider = availableRiders.find(r => r.rider_id === data.rider_id);
      if (!selectedRider) {
        throw new Error('Selected rider not found');
      }

      const historicalFields = getHistoricalTrackingFields(isHistoricalEntry);

      const ledgerData: CreateLedgerData = {
        rider_id: data.rider_id,
        rider_name: selectedRider.name,
        security_deposit_amount: data.security_deposit_amount,
        payment_date: data.payment_date.toISOString().split('T')[0],
        transaction_id: data.transaction_id,
        rental_frequency: data.rental_frequency,
        rental_amount: data.rental_amount,
        rental_start_date: data.rental_start_date.toISOString().split('T')[0],
        swaps_allowed_per_month: data.swaps_allowed_per_month ?? 4,
        // Include historical tracking fields
        ...historicalFields,
      };

      await createLedger(ledgerData);
      form.reset();
      setPendingFormData(null);
      onSuccess();
    } catch (error) {
      console.error('Error creating ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Rider Selection */}
        <FormField
          control={form.control}
          name="rider_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Rider</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a rider without a ledger" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRiders.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No riders available (all have ledgers)
                    </div>
                  ) : (
                    availableRiders.map((rider) => (
                      <SelectItem key={rider.rider_id} value={rider.rider_id}>
                        {rider.name} ({rider.rider_id})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Security Deposit */}
        <FormField
          control={form.control}
          name="security_deposit_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Security Deposit Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter security deposit amount"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Date */}
        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Payment Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a payment date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Transaction ID */}
        <FormField
          control={form.control}
          name="transaction_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction ID</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Enter transaction ID"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rental Frequency */}
        <FormField
          control={form.control}
          name="rental_frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rental Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rental frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Swaps Allowed Per Month */}
        <FormField
          control={form.control}
          name="swaps_allowed_per_month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Swaps Allowed Per Month</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="4"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  value={field.value ?? 4}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                Service agreement limit (0-99). Defaults based on rental frequency: Daily=2, Weekly=4, Monthly=8
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rental Amount */}
        <FormField
          control={form.control}
          name="rental_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rental Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter rental amount"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rental Start Date - Allows past dates for retroactive ledger creation */}
        <FormField
          control={form.control}
          name="rental_start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Rental Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    // Allow past dates for retroactive ledger entries
                    disabled={undefined}
                    fromDate={undefined}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Past dates allowed for retroactive entries
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading || availableRiders.length === 0}>
            {loading ? "Creating..." : "Create Ledger"}
          </Button>
        </div>

        {/* Past Date Confirmation Dialog */}
        <PastDateConfirmationDialog
          open={showPastDateDialog}
          onOpenChange={(open) => {
            if (!open) {
              cancelHistorical();
              setPendingFormData(null);
            }
          }}
          onConfirm={confirmHistorical}
          date={selectedDate}
          entityType="ledger"
        />
      </form>
    </Form>
  );
};