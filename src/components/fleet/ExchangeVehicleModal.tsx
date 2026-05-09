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
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, Battery, AlertCircle, ArrowRight, Wrench } from 'lucide-react';
import { batterySmartIdSchema } from '@/lib/validation/batterySmartId';
import { cn } from '@/lib/utils';
import type { Rider } from '@/hooks/useRiders';
import type { Vehicle } from '@/hooks/useVehicles';

const exchangeSchema = z.object({
  tempVehicleId: z.string().min(1, 'Please select a vehicle'),
  batterySmartId: batterySmartIdSchema
});

type ExchangeFormData = z.infer<typeof exchangeSchema>;

interface ExchangeVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: Rider | null;
  vehicles: Vehicle[];
  onConfirm: (tempVehicleId: string, batterySmartId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ExchangeVehicleModal = ({
  open,
  onOpenChange,
  rider,
  vehicles,
  onConfirm,
  isLoading = false
}: ExchangeVehicleModalProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [batterySmartIdCharCount, setBatterySmartIdCharCount] = useState(0);

  const form = useForm<ExchangeFormData>({
    resolver: zodResolver(exchangeSchema),
    mode: 'onChange'
  });

  const currentVehicleNumber = rider?.vehicle_assigned ?? null;
  const currentVehicle = vehicles.find(v => v.vehicle_number === currentVehicleNumber) || null;

  const availableVehicles = vehicles
    .filter(
      v =>
        v.status === 'Ready for Deployment' &&
        v.battery_id != null &&
        v.id !== currentVehicle?.id,
    )
    .sort((a, b) =>
      (a.vehicle_number || '').localeCompare(b.vehicle_number || '', undefined, { sensitivity: 'base', numeric: true }),
    );

  const vehiclesWithoutBattery = vehicles.filter(
    v => v.status === 'Ready for Deployment' && v.battery_id == null
  );

  useEffect(() => {
    const vehicleId = form.watch('tempVehicleId');
    if (vehicleId) {
      const vehicle = availableVehicles.find(v => v.id === vehicleId);
      setSelectedVehicle(vehicle || null);
    } else {
      setSelectedVehicle(null);
    }
  }, [form.watch('tempVehicleId'), availableVehicles]);

  useEffect(() => {
    const value = form.watch('batterySmartId') || '';
    setBatterySmartIdCharCount(value.length);
  }, [form.watch('batterySmartId')]);

  const handleConfirm = async () => {
    const tempVehicleId = form.getValues('tempVehicleId');
    const batterySmartId = form.getValues('batterySmartId');
    if (!tempVehicleId || !batterySmartId) return;

    try {
      await onConfirm(tempVehicleId, batterySmartId);
      handleClose();
    } catch (err) {
      console.error('Error confirming swap:', err);
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
          <DialogTitle className="text-xl">Exchange Vehicle</DialogTitle>
          <DialogDescription>
            {rider ? (
              <>
                Give <span className="font-semibold">{rider.name}</span> a temporary vehicle.
                Their original vehicle will be moved to Under Maintenance.
              </>
            ) : (
              'Assign a temporary vehicle to this rider'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-6">
            {/* Current vehicle → Under Maintenance summary */}
            {currentVehicle && (
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex items-start gap-3">
                <Wrench className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Current vehicle goes to maintenance</p>
                  <p className="text-sm text-amber-800 mt-1">
                    <span className="font-mono font-semibold">{currentVehicle.vehicle_number}</span>
                    {' '}will be marked <Badge variant="destructive" className="ml-1">Under Maintenance</Badge>
                    {' '}and held for this rider until it is repaired.
                  </p>
                </div>
              </div>
            )}

            {vehiclesWithoutBattery.length > 0 && (
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  {vehiclesWithoutBattery.length} vehicle(s) ready but missing a battery — not eligible for swap.
                </p>
              </div>
            )}

            {/* Temp vehicle selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">1</div>
                <h3 className="text-sm font-semibold">Select Temporary Vehicle</h3>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">Required</span>
              </div>

              <FormField
                control={form.control}
                name="tempVehicleId"
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
                            ? 'No vehicles available for swap'
                            : 'Select a temporary vehicle...'}
                        </option>
                        {availableVehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.vehicle_number} • {v.model || 'N/A'}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Battery Smart ID */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-sm">2</div>
                <h3 className="text-sm font-semibold">Battery Smart ID</h3>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">Required</span>
              </div>

              <FormField
                control={form.control}
                name="batterySmartId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        noSpaces
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
                    <FormDescription>7-8 uppercase letters and numbers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Provided by Battery Smart.
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

            {/* Swap summary */}
            {selectedVehicle && currentVehicle && (
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <Card className="border-0 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-600" />
                      <CardTitle className="text-sm">Original (held)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="font-semibold">{currentVehicle.vehicle_number}</p>
                    <p className="text-xs text-muted-foreground">{currentVehicle.model || '—'}</p>
                    <Badge variant="destructive" className="mt-2">Under Maintenance</Badge>
                  </CardContent>
                </Card>

                <ArrowRight className="hidden md:block h-6 w-6 text-blue-500 mx-auto" />

                <Card className="border-0 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm">Temporary (deployed)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="font-semibold">{selectedVehicle.vehicle_number}</p>
                    <p className="text-xs text-muted-foreground">{selectedVehicle.model || '—'}</p>
                    {batterySmartIdCharCount >= 7 && (
                      <p className="font-mono text-xs flex items-center gap-1 mt-1">
                        <Battery className="h-3 w-3 text-green-600" />
                        {form.getValues('batterySmartId')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isFormValid || isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Swapping...' : 'Confirm Exchange'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
