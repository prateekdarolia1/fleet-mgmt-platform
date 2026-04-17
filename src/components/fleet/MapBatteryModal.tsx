/**
 * MapBatteryModal Component
 * DDD: Battery-Vehicle Mapping Use Case
 * SOLID: Single Responsibility - Handle battery-to-vehicle mapping UI
 * DRY: Reusable modal for mapping from Battery or Vehicle Management
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
import { useQueryClient } from '@tanstack/react-query';
import { useUnmappedVehicles } from '@/hooks/useUnmappedVehicles';
import { mapBattery, type MapBatteryInput } from '@/lib/batteries/mapBattery';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ============================================================================
// DDD: Value Object Validation Schema
// ============================================================================

/**
 * SOLID: Single Responsibility - Validation rules only
 * DRY: Reusable validation schema
 */
const mapBatterySchema = z.object({
  vehicleId: z
    .string()
    .min(1, 'Please select a vehicle'),

  batterySmartId: z
    .string()
    .min(1, 'BatterySmart ID is required')
    .max(100, 'BatterySmart ID is too long')
});

type MapBatteryFormData = z.infer<typeof mapBatterySchema>;

// ============================================================================
// Component Props Interface
// ============================================================================

interface MapBatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batteryId: string;              // UUID for API call
  batteryDisplayId: string;       // Display ID (e.g., "BAT00001")
  onSuccess?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Modal for mapping a battery to a vehicle
 * DDD: Use case - Map Battery to Vehicle
 * SOLID: Single Responsibility - Battery mapping UI only
 */
export const MapBatteryModal = ({
  open,
  onOpenChange,
  batteryId,
  batteryDisplayId,
  onSuccess
}: MapBatteryModalProps) => {
  // ============================================================================
  // State Management - SOLID: Dependency Inversion
  // ============================================================================

  const form = useForm<MapBatteryFormData>({
    resolver: zodResolver(mapBatterySchema),
    mode: 'onChange',
    defaultValues: {
      vehicleId: '',
      batterySmartId: ''
    }
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unmapped vehicles (Repository Pattern)
  const { data: vehicles, isLoading: vehiclesLoading } = useUnmappedVehicles();

  // ============================================================================
  // Business Logic - Domain Service Invocation
  // ============================================================================

  const handleSubmit = async (data: MapBatteryFormData) => {
    try {
      // DDD: Create domain command
      const input: MapBatteryInput = {
        batteryId,
        vehicleId: data.vehicleId,
        batterySmartId: data.batterySmartId,
        userId: user?.id || '00000000-0000-0000-0000-000000000000'
      };

      // Invoke domain service
      const result = await mapBattery(input);

      if (result.success) {
        toast.success('Battery mapped successfully!');
        queryClient.invalidateQueries({ queryKey: ['batteries'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-with-batteries'] });
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        // DRY: Centralized error handling
        handleMappingError(result.error || 'UNKNOWN_ERROR', result.message);
      }
    } catch (error) {
      console.error('Unexpected error mapping battery:', error);
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

  const selectedVehicle = vehicles?.find(v => v.id === form.watch('vehicleId'));
  const isFormValid = form.formState.isValid && !!selectedVehicle;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Battery className="h-5 w-5 text-blue-600" />
            Map Battery to Vehicle
          </DialogTitle>
          <DialogDescription>
            Assign this battery to a vehicle in your fleet
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
                  Select a vehicle and configure the battery service agreement details.
                </p>
              </div>
            </div>

            {/* Battery ID Display - DDD: Battery Aggregate Identity */}
            <div>
              <label className="text-sm font-medium">Battery ID</label>
              <div className="mt-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 font-mono font-semibold text-gray-900">
                {batteryDisplayId}
              </div>
            </div>

            {/* Vehicle Selection - DDD: Vehicle Aggregate Reference */}
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle</FormLabel>
                  <select
                    {...field}
                    disabled={vehiclesLoading || (vehicles?.length === 0)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border-2 bg-white text-sm font-medium transition-colors',
                      'hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                      field.value ? 'border-blue-200 bg-blue-50/30' : 'border-gray-300',
                      (vehiclesLoading || vehicles?.length === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="">
                      {vehiclesLoading
                        ? 'Loading vehicles...'
                        : vehicles?.length === 0
                          ? 'No unmapped vehicles available'
                          : 'Choose a vehicle...'}
                    </option>
                    {vehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_number} • {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                  <FormDescription>
                    Only vehicles without an assigned battery are shown
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
            {selectedVehicle && isFormValid && (
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
                      <p className="font-semibold">{selectedVehicle.vehicle_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Make & Model</p>
                      <p className="font-semibold">{selectedVehicle.make} {selectedVehicle.model}</p>
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
                      <p className="font-mono font-bold text-green-700">{batteryDisplayId}</p>
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
