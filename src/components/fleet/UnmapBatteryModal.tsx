import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Battery, Truck, CheckCircle } from 'lucide-react';
import { useBatteriesList } from '@/hooks/useBatteriesList';
import { useUnmapBatteryWithErrorHandling } from '@/hooks/useUnmapBattery';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Validation schema
const unmappingSchema = z.object({
  batteryId: z.string().min(1, 'Please select a battery'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(200, 'Reason must be 200 characters or less')
});

type UnmappingFormData = z.infer<typeof unmappingSchema>;

interface UnmapBatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const UnmapBatteryModal = ({
  open,
  onOpenChange,
  onSuccess
}: UnmapBatteryModalProps) => {
  const [selectedBattery, setSelectedBattery] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [reasonCharCount, setReasonCharCount] = useState(0);
  const [reasonValidation, setReasonValidation] = useState({
    hasContent: false,
    meetsMinLength: false,
    withinMaxLength: true
  });

  const { user } = useAuth();
  const form = useForm<UnmappingFormData>({
    resolver: zodResolver(unmappingSchema),
    mode: 'onChange'
  });

  // Fetch mapped batteries
  const { data: batteriesData, isLoading: batteriesLoading } = useBatteriesList({
    status: 'MAPPED'
  });

  // Unmap battery mutation
  const {
    mutate: unmapBattery,
    isPending: isUnmappingLoading,
    errorMessage
  } = useUnmapBatteryWithErrorHandling({
    userId: user?.id || '',
    onSuccess: () => {
      toast.success('Battery successfully unmapped!');
      form.reset();
      setSelectedBattery(null);
      setSelectedVehicle(null);
      setReasonCharCount(0);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (message) => {
      toast.error(message);
    }
  });

  // Update selected battery when form value changes
  useEffect(() => {
    const batteryId = form.watch('batteryId');
    if (batteryId && batteriesData?.batteries) {
      const battery = batteriesData.batteries.find((b) => b.id === batteryId);
      setSelectedBattery(battery);
      // Extract vehicle info from battery if available
      if (battery) {
        // The battery object should have vehicle info from the API
        setSelectedVehicle({
          id: battery.vehicle_id,
          vehicle_number: battery.vehicle_number || 'N/A',
          rider_name: battery.rider_name || 'N/A'
        });
      }
    } else {
      setSelectedVehicle(null);
    }
  }, [form.watch('batteryId'), batteriesData]);

  // Track reason validation
  useEffect(() => {
    const reason = form.watch('reason') || '';
    const trimmed = reason.trim();
    setReasonCharCount(reason.length);
    setReasonValidation({
      hasContent: trimmed.length > 0,
      meetsMinLength: trimmed.length >= 10,
      withinMaxLength: reason.length <= 200
    });
  }, [form.watch('reason')]);

  const isReasonValid =
    reasonValidation.hasContent &&
    reasonValidation.meetsMinLength &&
    reasonValidation.withinMaxLength;

  const handleConfirm = async () => {
    const batteryId = form.getValues('batteryId');
    const reason = form.getValues('reason');

    if (!batteryId || !reason || !isReasonValid) {
      toast.error('Please select a battery and provide a valid reason');
      return;
    }

    unmapBattery({ batteryId, reason, userId: user?.id || '' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedBattery(null);
      setSelectedVehicle(null);
      setReasonCharCount(0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Unmap Battery</DialogTitle>
          <DialogDescription>
            You are about to unmap a battery from its assigned vehicle. This action requires a reason.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-6">
            {/* Step 1: Select Battery */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-medium text-sm">
                  1
                </div>
                <h3 className="text-sm font-semibold text-foreground">Select Battery</h3>
              </div>

              <FormField
                control={form.control}
                name="batteryId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        {...field}
                        disabled={batteriesLoading}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg border-2 bg-background text-sm font-medium transition-colors',
                          'hover:border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
                          field.value ? 'border-red-200 bg-red-50/30' : 'border-input',
                          batteriesLoading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <option value="">
                          {batteriesLoading ? 'Loading batteries...' : 'Select a mapped battery to unmap...'}
                        </option>
                        {batteriesData?.batteries &&
                          batteriesData.batteries.map((battery) => (
                            <option key={battery.id} value={battery.id}>
                              {battery.battery_id} • {battery.battery_identifier}
                            </option>
                          ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Battery + Vehicle Summary */}
            {selectedBattery && (
              <div className="grid gap-3 md:grid-cols-2 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                {/* Battery Card */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Battery className="h-5 w-5 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-900">Battery</h4>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">ID</p>
                      <p className="font-mono font-bold text-red-900">{selectedBattery.battery_id}</p>
                    </div>
                    <div>
                      <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Identifier</p>
                      <p className="font-semibold text-red-900">{selectedBattery.battery_identifier}</p>
                    </div>
                    {selectedBattery.service_provider && (
                      <div>
                        <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Provider</p>
                        <p className="text-red-900">{selectedBattery.service_provider}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Card */}
                {selectedVehicle && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-red-600" />
                      <h4 className="text-sm font-semibold text-red-900">Vehicle</h4>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div>
                        <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Number</p>
                        <p className="font-mono font-bold text-red-900">{selectedVehicle.vehicle_number}</p>
                      </div>
                      {selectedVehicle.rider_name && (
                        <div>
                          <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Rider</p>
                          <p className="font-semibold text-red-900">{selectedVehicle.rider_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Provide Reason */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-medium text-sm">
                  2
                </div>
                <h3 className="text-sm font-semibold text-foreground">Reason (Required)</h3>
                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                  Mandatory
                </span>
              </div>

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Explain why this battery is being unmapped from the vehicle..."
                        className={cn(
                          'min-h-[140px] resize-none text-base p-4 rounded-lg border-2 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
                          !reasonValidation.hasContent && 'border-input',
                          reasonValidation.hasContent && !reasonValidation.meetsMinLength && 'border-amber-300 bg-amber-50/30',
                          isReasonValid && 'border-green-300 bg-green-50/30',
                          !reasonValidation.withinMaxLength && 'border-red-300 bg-red-50/30'
                        )}
                        maxLength={200}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reason Validation Feedback */}
              <div className="space-y-2">
                {/* Character Counter */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Provide a detailed reason for this action
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      reasonCharCount === 0
                        ? 'text-muted-foreground'
                        : reasonCharCount < 10
                          ? 'text-amber-600'
                          : reasonCharCount <= 150
                            ? 'text-green-600'
                            : reasonCharCount <= 180
                              ? 'text-amber-600'
                              : 'text-red-600'
                    )}
                  >
                    {reasonCharCount}/200 characters
                  </span>
                </div>

                {/* Validation Checklist */}
                <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        reasonValidation.hasContent
                          ? 'text-green-600'
                          : 'text-gray-300'
                      )}
                    />
                    <span
                      className={
                        reasonValidation.hasContent
                          ? 'text-gray-700 font-medium'
                          : 'text-gray-500'
                      }
                    >
                      Reason provided
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        reasonValidation.meetsMinLength
                          ? 'text-green-600'
                          : 'text-gray-300'
                      )}
                    />
                    <span
                      className={
                        reasonValidation.meetsMinLength
                          ? 'text-gray-700 font-medium'
                          : 'text-gray-500'
                      }
                    >
                      At least 10 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        reasonValidation.withinMaxLength
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    />
                    <span
                      className={
                        reasonValidation.withinMaxLength
                          ? 'text-gray-700 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      Within 200 character limit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            {selectedBattery && isReasonValid && (
              <div className="rounded-lg bg-red-50 p-4 border-2 border-red-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Confirm unmapping action
                  </p>
                  <p className="text-sm text-red-800 mt-1">
                    This will unmap <span className="font-mono font-bold">{selectedBattery.battery_id}</span> from <span className="font-mono font-bold">{selectedVehicle?.vehicle_number}</span>. The battery will become available for other vehicles.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-4 border-2 border-red-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-800 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isUnmappingLoading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  isUnmappingLoading ||
                  !form.formState.isValid ||
                  !selectedBattery ||
                  !isReasonValid
                }
                className="gap-2 px-8"
              >
                {isUnmappingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isUnmappingLoading ? 'Unmapping Battery...' : 'Unmap Battery'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
