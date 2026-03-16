import { useState, useEffect } from 'react';
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
import { Loader2, Truck, Battery, AlertCircle, Info } from 'lucide-react';
import { batterySmartIdSchema } from '@/lib/validation/batterySmartId';
import { cn } from '@/lib/utils';
import type { Rider } from '@/hooks/useRiders';
import type { Vehicle } from '@/hooks/useVehicles';

/**
 * Validation schema for rider activation
 * Enforces: Vehicle selection + Battery Smart ID entry
 */
const riderActivationSchema = z.object({
  vehicleId: z.string().min(1, 'Please select a vehicle'),
  batterySmartId: batterySmartIdSchema
});

type ActivationFormData = z.infer<typeof riderActivationSchema>;

interface RiderActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: Rider | null;
  vehicles: Vehicle[];
  onConfirm: (vehicleId: string, batterySmartId: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Modal that enforces vehicle selection + Battery Smart ID entry
 * when activating a rider (Idle → Active)
 *
 * This modal ensures:
 * 1. A vehicle with Ready for Deployment status is selected
 * 2. Vehicle has a battery mapped
 * 3. Battery Smart ID is entered (7-8 chars, alphanumeric, uppercase)
 * 4. Both fields are required
 */
export const RiderActivationModal = ({
  open,
  onOpenChange,
  rider,
  vehicles,
  onConfirm,
  isLoading = false
}: RiderActivationModalProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [batterySmartIdCharCount, setBatterySmartIdCharCount] = useState(0);

  const form = useForm<ActivationFormData>({
    resolver: zodResolver(riderActivationSchema),
    mode: 'onChange'
  });

  // Get vehicles available for deployment (CBU requirement: must have battery mapped)
  // A Complete Business Unit (CBU) = Vehicle + Battery + Rider
  const availableVehicles = vehicles.filter(
    v => v.status === 'Ready for Deployment' && v.battery_id != null
  );

  // Vehicles without battery (for warning display)
  const vehiclesWithoutBattery = vehicles.filter(
    v => v.status === 'Ready for Deployment' && v.battery_id == null
  );

  // Update selected vehicle when vehicleId changes
  useEffect(() => {
    const vehicleId = form.watch('vehicleId');
    if (vehicleId) {
      const vehicle = availableVehicles.find(v => v.id === vehicleId);
      setSelectedVehicle(vehicle || null);
    }
  }, [form.watch('vehicleId'), availableVehicles]);

  // Track Battery Smart ID character count
  useEffect(() => {
    const batterySmartId = form.watch('batterySmartId') || '';
    setBatterySmartIdCharCount(batterySmartId.length);
  }, [form.watch('batterySmartId')]);

  const handleConfirm = async () => {
    const vehicleId = form.getValues('vehicleId');
    const batterySmartId = form.getValues('batterySmartId');

    if (!vehicleId || !batterySmartId) {
      return;
    }

    try {
      await onConfirm(vehicleId, batterySmartId);
      handleClose();
    } catch (error) {
      console.error('Error confirming activation:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedVehicle(null);
    setBatterySmartIdCharCount(0);
    onOpenChange(false);
  };

  const isFormValid = form.formState.isValid && !!selectedVehicle;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Activate Rider</DialogTitle>
          <DialogDescription>
            {rider ? (
              <>Select a vehicle and enter Battery Smart ID to activate <span className="font-semibold">{rider.name}</span></>
            ) : (
              'Select a vehicle and enter Battery Smart ID to activate rider'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-6">
            {/* Info Alert */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Required information</p>
                <p className="text-sm text-blue-800 mt-1">
                  Please select which vehicle this rider will use and enter the Battery Smart ID currently in that vehicle.
                </p>
              </div>
            </div>

            {/* Warning: Vehicles without battery */}
            {vehiclesWithoutBattery.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Incomplete Business Units</p>
                  <p className="text-sm text-amber-800 mt-1">
                    {vehiclesWithoutBattery.length} vehicle(s) are ready for deployment but have no battery mapped.
                    Map a battery first to activate a rider with that vehicle.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Vehicle Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">
                  1
                </div>
                <h3 className="text-sm font-semibold">Select Vehicle</h3>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                  Required
                </span>
              </div>

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        {...field}
                        disabled={availableVehicles.length === 0 || isLoading}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-lg border-2 bg-background text-sm font-medium transition-colors',
                          'hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                          field.value ? 'border-blue-200 bg-blue-50/30' : 'border-input',
                          (availableVehicles.length === 0 || isLoading) && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <option value="">
                          {availableVehicles.length === 0
                            ? 'No vehicles available'
                            : 'Select a vehicle for this rider...'}
                        </option>
                        {availableVehicles.map(vehicle => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_number} • {vehicle.model || 'N/A'}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Step 2: Battery Smart ID Entry */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">
                  2
                </div>
                <h3 className="text-sm font-semibold">Battery Smart ID</h3>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                  Required
                </span>
                <div className="group relative ml-auto">
                  <Info className="h-4 w-4 text-blue-500 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                    <p className="font-semibold mb-1">Battery Smart ID</p>
                    <p>External identifier assigned by Battery Smart. This is NOT the Battery ID shown in Battery Management.</p>
                  </div>
                </div>
              </div>

              {/* Helper text for Battery Smart ID context */}
              <p className="text-xs text-muted-foreground flex items-start gap-2 bg-blue-50 p-2 rounded border border-blue-100">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>This ID comes from Battery Smart and is different from the Battery ID used in inventory management.</span>
              </p>

              <FormField
                control={form.control}
                name="batterySmartId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter Battery Smart ID (e.g., BS23342, 9A2KLMQ8)"
                        maxLength={8}
                        disabled={isLoading}
                        className={cn(
                          'text-base font-medium border-2 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                          batterySmartIdCharCount > 0 && form.formState.isValid
                            ? 'border-green-300 bg-green-50/30'
                            : batterySmartIdCharCount > 0
                              ? 'border-amber-300 bg-amber-50/30'
                              : 'border-input',
                          isLoading && 'opacity-50 cursor-not-allowed'
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Provided by Battery Smart. 7-8 uppercase letters and numbers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Validation feedback */}
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  7-8 uppercase letters and numbers (e.g., BS23342, BS12AB34)
                </p>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    batterySmartIdCharCount === 0
                      ? 'text-muted-foreground'
                      : batterySmartIdCharCount < 7
                        ? 'text-amber-600'
                        : 'text-green-600'
                  )}
                >
                  {batterySmartIdCharCount}/8
                </span>
              </div>
            </div>

            {/* Vehicle + Battery Summary */}
            {selectedVehicle && (
              <div className="grid gap-3 md:grid-cols-2 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
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
                    {selectedVehicle.model && (
                      <div>
                        <p className="text-xs text-muted-foreground">Model</p>
                        <p className="font-semibold">{selectedVehicle.model}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Battery Smart ID Summary */}
                {batterySmartIdCharCount >= 7 && batterySmartIdCharCount <= 8 && (
                  <Card className="border-0 bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Battery className="h-4 w-4 text-green-600" />
                        <CardTitle className="text-sm">Battery</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Smart ID</p>
                        <p className="font-mono font-bold text-green-700">
                          {form.getValues('batterySmartId')}
                        </p>
                      </div>
                      <Badge className="w-fit mt-2 bg-green-100 text-green-800 border-green-200">
                        Ready to activate
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Confirmation Alert */}
            {selectedVehicle && form.formState.isValid && (
              <div className="rounded-lg bg-green-50 p-4 border-2 border-green-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Ready to activate</p>
                  <p className="text-sm text-green-800 mt-1">
                    {rider?.name} will be activated with {selectedVehicle.vehicle_number}
                  </p>
                  <p className="text-sm text-green-800 mt-1">
                    Battery Smart ID: <span className="font-mono font-semibold">{form.getValues('batterySmartId')}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Activating...' : 'Activate Rider'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
