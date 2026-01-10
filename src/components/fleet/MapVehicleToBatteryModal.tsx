/**
 * MapVehicleToBatteryModal Component
 * DDD: Vehicle-Battery Mapping Use Case (Inverse Direction)
 * SOLID: Single Responsibility - Handle vehicle-to-battery mapping UI
 * DRY: Reusable modal for mapping from Vehicle Management
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2, Battery, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUnmappedBatteries } from '@/hooks/useUnmappedBatteries';
import { mapBattery, type MapBatteryInput } from '@/lib/batteries/mapBattery';
import { cn } from '@/lib/utils';

// ============================================================================
// DDD: Value Object Validation Schema
// ============================================================================

/**
 * SOLID: Single Responsibility - Validation rules only
 * DRY: Reusable validation schema (same as MapBatteryModal)
 */
const mapVehicleToBatterySchema = z.object({
  batteryId: z
    .string()
    .min(1, 'Please select a battery'),

  batterySmartId: z
    .string()
    .min(1, 'BatterySmart ID is required')
    .max(100, 'BatterySmart ID is too long')
});

type MapVehicleToBatteryFormData = z.infer<typeof mapVehicleToBatterySchema>;

// ============================================================================
// Component Props Interface
// ============================================================================

interface MapVehicleToBatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;              // UUID for API call
  vehicleDisplayId: string;       // Display ID (e.g., "MH12AB1234")
  onSuccess?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Modal for mapping a vehicle to a battery (inverse direction)
 * DDD: Use case - Map Vehicle to Battery
 * SOLID: Single Responsibility - Vehicle-to-battery mapping UI only
 */
export const MapVehicleToBatteryModal = ({
  open,
  onOpenChange,
  vehicleId,
  vehicleDisplayId,
  onSuccess
}: MapVehicleToBatteryModalProps) => {
  // ============================================================================
  // State Management - SOLID: Dependency Inversion
  // ============================================================================

  const form = useForm<MapVehicleToBatteryFormData>({
    resolver: zodResolver(mapVehicleToBatterySchema),
    mode: 'onChange',
    defaultValues: {
      batteryId: '',
      batterySmartId: ''
    }
  });

  // Fetch unmapped batteries (Repository Pattern)
  const { data: batteries, isLoading: batteriesLoading } = useUnmappedBatteries();

  // ============================================================================
  // Business Logic - Domain Service Invocation
  // ============================================================================

  const handleSubmit = async (data: MapVehicleToBatteryFormData) => {
    try {
      // DDD: Create domain command
      const input: MapBatteryInput = {
        batteryId: data.batteryId,
        vehicleId,  // Vehicle is fixed from props
        batterySmartId: data.batterySmartId,
        userId: 'current-user-id' // TODO: Get from auth context
      };

      // Invoke domain service (same service, different direction)
      const result = await mapBattery(input);

      if (result.success) {
        toast.success('Battery mapped to vehicle successfully!');
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        // DRY: Centralized error handling
        handleMappingError(result.error || 'UNKNOWN_ERROR', result.message);
      }
    } catch (error) {
      console.error('Unexpected error mapping battery to vehicle:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  /**
   * DRY: Centralized error handling logic
   * SOLID: Single Responsibility - Error message mapping only
   */
  const handleMappingError = (errorCode: string, message?: string) => {
    const errorMessages: Record<string, string> = {
      BATTERY_NOT_FOUND: 'Battery not found. Please refresh and try again.',
      BATTERY_ALREADY_MAPPED: 'This battery is already mapped to another vehicle.',
      VEHICLE_NOT_FOUND: 'Vehicle not found. Please refresh and try again.',
      VEHICLE_ALREADY_HAS_BATTERY: 'This vehicle already has a battery assigned.',
      BATTERY_LOCKED: 'Battery is being modified by another user. Please try again.',
      VEHICLE_LOCKED: 'Vehicle is being modified by another user. Please try again.',
      VALIDATION_ERROR: 'Invalid input. Please check all fields.',
      UNKNOWN_ERROR: 'An unexpected error occurred.'
    };

    toast.error(errorMessages[errorCode] || message || 'Mapping failed');
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  // ============================================================================
  // UI Rendering
  // ============================================================================

  const selectedBattery = batteries?.find(b => b.id === form.watch('batteryId'));
  const isFormValid = form.formState.isValid && !!selectedBattery;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Map Battery to Vehicle
          </DialogTitle>
          <DialogDescription>
            Assign a battery to this vehicle in your fleet
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Info Alert - DDD: Business rule explanation */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Battery Mapping</p>
                <p className="text-sm text-blue-800 mt-1">
                  Select a battery and configure the service agreement details.
                </p>
              </div>
            </div>

            {/* Vehicle ID Display - DDD: Vehicle Aggregate Identity */}
            <div>
              <label className="text-sm font-medium">Vehicle Number</label>
              <div className="mt-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono font-semibold text-gray-900">
                {vehicleDisplayId}
              </div>
            </div>

            {/* Battery Selection - DDD: Battery Aggregate Reference */}
            <FormField
              control={form.control}
              name="batteryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Battery</FormLabel>
                  <select
                    {...field}
                    disabled={batteriesLoading || (batteries?.length === 0)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border-2 bg-white text-sm font-medium transition-colors',
                      'hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                      field.value ? 'border-blue-200 bg-blue-50/30' : 'border-gray-300',
                      (batteriesLoading || batteries?.length === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="">
                      {batteriesLoading
                        ? 'Loading batteries...'
                        : batteries?.length === 0
                          ? 'No unmapped batteries available'
                          : 'Choose a battery...'}
                    </option>
                    {batteries?.map((battery) => (
                      <option key={battery.id} value={battery.id}>
                        {battery.battery_id} • {battery.service_provider} • Zone: {battery.zone_id || 'N/A'}
                      </option>
                    ))}
                  </select>
                  <FormDescription>
                    Only batteries without an assigned vehicle are shown
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* BatterySmart ID - DDD: External Service Provider Identifier */}
            <FormField
              control={form.control}
              name="batterySmartId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BatterySmart ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter BatterySmart ID"
                      className="font-medium"
                    />
                  </FormControl>
                  <FormDescription>
                    External identifier provided by Battery Smart service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary Card - DRY: Visual confirmation before submission */}
            {selectedBattery && isFormValid && (
              <div className="grid gap-3 md:grid-cols-2 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                {/* Vehicle Summary */}
                <Card className="border-0 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm">Vehicle</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Number</p>
                      <p className="font-semibold">{vehicleDisplayId}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Battery Summary */}
                <Card className="border-0 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Battery className="h-4 w-4 text-green-600" />
                      <CardTitle className="text-sm">Battery Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Battery ID</p>
                      <p className="font-mono font-bold text-green-700">{selectedBattery.battery_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Service Provider</p>
                      <p className="text-sm">{selectedBattery.service_provider}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || form.formState.isSubmitting}
                className="gap-2"
              >
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? 'Mapping...' : 'Map Battery'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
