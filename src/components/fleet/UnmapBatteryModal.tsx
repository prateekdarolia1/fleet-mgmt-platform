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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, Battery, Truck, CheckCircle, Info } from 'lucide-react';
import { useBatteriesList } from '@/hooks/useBatteriesList';
import { useUnmapBatteryWithErrorHandling } from '@/hooks/useUnmapBattery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Validation schema
const unmappingSchema = z.object({
  batteryId: z.string().min(1, 'Please select a battery'),
  reason: z
    .string()
    .max(200, 'Reason must be 200 characters or less')
    .optional()
});

type UnmappingFormData = z.infer<typeof unmappingSchema>;

interface UnmapBatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When provided, skips battery selection and jumps straight to the reason step */
  preselectedBatteryId?: string;
}

export const UnmapBatteryModal = ({
  open,
  onOpenChange,
  onSuccess,
  preselectedBatteryId
}: UnmapBatteryModalProps) => {
  const [selectedBattery, setSelectedBattery] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [reasonCharCount, setReasonCharCount] = useState(0);
  const [reasonValidation, setReasonValidation] = useState({
    hasContent: false,
    meetsMinLength: false,
    withinMaxLength: true
  });

  const isPreselected = Boolean(preselectedBatteryId);

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
    error: unmapError
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

  // Auto-select battery when preselectedBatteryId is provided and data loads
  useEffect(() => {
    if (isPreselected && preselectedBatteryId && (batteriesData as any)?.batteries) {
      const battery = (batteriesData as any).batteries.find((b: any) => b.id === preselectedBatteryId);
      if (battery) {
        form.setValue('batteryId', battery.id, { shouldValidate: true });
        setSelectedBattery(battery);
      }
    }
  }, [preselectedBatteryId, batteriesData, isPreselected]);

  // Update selected battery when form value changes (manual selection path)
  useEffect(() => {
    if (isPreselected) return;
    const batteryId = form.watch('batteryId');
    if (batteryId && (batteriesData as any)?.batteries) {
      const battery = (batteriesData as any).batteries.find((b: any) => b.id === batteryId);
      setSelectedBattery(battery || null);
    } else {
      setSelectedBattery(null);
      setSelectedVehicle(null);
    }
  }, [form.watch('batteryId'), batteriesData, isPreselected]);

  // Fetch vehicle info from vehicles table whenever a battery with a vehicle_id is selected
  useEffect(() => {
    if (!selectedBattery?.vehicle_id) {
      setSelectedVehicle(null);
      return;
    }
    supabase
      .from('vehicles')
      .select('id, vehicle_number, rider_name')
      .eq('id', selectedBattery.vehicle_id)
      .single()
      .then(({ data }) => {
        setSelectedVehicle({
          id: data?.id || selectedBattery.vehicle_id,
          vehicle_number: data?.vehicle_number || 'N/A',
          rider_name: data?.rider_name || 'N/A',
        });
      });
  }, [selectedBattery?.vehicle_id]);

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

  const isReasonValid = reasonValidation.withinMaxLength;

  const handleConfirm = async () => {
    const batteryId = form.getValues('batteryId');
    const reason = form.getValues('reason') || '';

    if (!batteryId) {
      toast.error('Please select a battery');
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
      setReasonValidation({ hasContent: false, meetsMinLength: false, withinMaxLength: true });
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
            {/* Step 1: Select Battery — hidden when battery is preselected */}
            {!isPreselected && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-medium text-sm">
                    1
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Battery ID (Lilypad Internal ID)</h3>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-blue-500 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                      <p className="font-semibold mb-1">Battery ID (Lilypad)</p>
                      <p>Internal identifier used by Lilypad to track physical batteries. This is NOT the Battery Smart ID.</p>
                    </div>
                  </div>
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
                          {(batteriesData as any)?.batteries &&
                            (batteriesData as any).batteries.map((battery: any) => (
                              <option key={battery.id} value={battery.id}>
                                {battery.battery_id} • {battery.battery_smart_id || battery.battery_id}
                              </option>
                            ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Battery + Vehicle Summary */}
            {selectedBattery && (
              <div className="grid gap-3 md:grid-cols-2 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                {/* Battery Card */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Battery className="h-5 w-5 text-red-600" />
                    <h4 className="text-sm font-semibold text-red-900">Battery Details</h4>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Battery ID (Lilypad)</p>
                      <p className="font-mono font-bold text-red-900">{selectedBattery.battery_id}</p>
                    </div>
                    {selectedBattery.battery_identifier && (
                      <div>
                        <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Battery Identifier</p>
                        <p className="font-semibold text-red-900">{selectedBattery.battery_identifier}</p>
                      </div>
                    )}
                    {selectedBattery.service_provider && (
                      <div>
                        <p className="text-red-700/60 text-xs uppercase tracking-wide font-medium">Service Provider</p>
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

            {/* Step 2 (or 1 when preselected): Provide Reason */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-medium text-sm">
                  {isPreselected ? '1' : '2'}
                </div>
                <h3 className="text-sm font-semibold text-foreground">Reason (Optional)</h3>
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

                {!reasonValidation.withinMaxLength && (
                  <p className="text-xs text-red-600 font-medium">Exceeds 200 character limit</p>
                )}
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
            {unmapError && (
              <div className="rounded-lg bg-red-50 p-4 border-2 border-red-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-800 mt-1">{unmapError instanceof Error ? unmapError.message : 'An error occurred'}</p>
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
