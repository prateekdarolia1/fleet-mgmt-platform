import { useState, useEffect } from 'react';
import type { BatteryListResult } from '@/lib/batteries/listBatteries';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Battery, Truck, Info, AlertCircle } from 'lucide-react';
import { useVehiclesWithoutBattery } from '@/hooks/useVehiclesWithBatteries';
import { useBatteriesList } from '@/hooks/useBatteriesList';
import { useMapBatteryWithErrorHandling } from '@/hooks/useMapBattery';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Validation schema
const mappingSchema = z.object({
  vehicleId: z.string().min(1, 'Please select a vehicle'),
  batteryId: z.string().min(1, 'Please select a battery')
});

type MappingFormData = z.infer<typeof mappingSchema>;

interface BatteryMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const BatteryMappingModal = ({
  open,
  onOpenChange,
  onSuccess
}: BatteryMappingModalProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedBattery, setSelectedBattery] = useState<any>(null);

  const { user } = useAuth();
  const form = useForm<MappingFormData>({
    resolver: zodResolver(mappingSchema),
    mode: 'onChange'
  });

  // Fetch vehicles without battery
  const { data: vehiclesWithoutBattery, isLoading: vehiclesLoading } =
    useVehiclesWithoutBattery();

  // Fetch available batteries (unmapped)
  const { data: batteriesData, isLoading: batteriesLoading } = useBatteriesList({
    status: 'UNMAPPED'
  });

  // Map battery mutation
  const {
    mutate: mapBattery,
    isPending: isMappingLoading
  } = useMapBatteryWithErrorHandling({
    userId: user?.id || '',
    onSuccess: () => {
      toast.success('Battery mapped successfully!');
      form.reset();
      setSelectedVehicle(null);
      setSelectedBattery(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (message) => {
      toast.error(message);
    }
  });

  // Update selected vehicle when form value changes
  useEffect(() => {
    const vehicleId = form.watch('vehicleId');
    if (vehicleId && vehiclesWithoutBattery) {
      const vehicle = vehiclesWithoutBattery.find((v) => v.id === vehicleId);
      setSelectedVehicle(vehicle);
    }
  }, [form.watch('vehicleId'), vehiclesWithoutBattery]);

  // Update selected battery when form value changes
  useEffect(() => {
    const batteryId = form.watch('batteryId');
    if (batteryId && (batteriesData as BatteryListResult)?.batteries) {
      const battery = (batteriesData as BatteryListResult).batteries.find((b) => b.id === batteryId);
      setSelectedBattery(battery);
    }
  }, [form.watch('batteryId'), batteriesData]);

  const handleConfirm = async () => {
    const vehicleId = form.getValues('vehicleId');
    const batteryId = form.getValues('batteryId');

    if (!vehicleId || !batteryId) {
      toast.error('Please select both a vehicle and a battery');
      return;
    }

    mapBattery({ batteryId, vehicleId, userId: user?.id || '', batterySmartId: selectedBattery?.battery_smart_id || '' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedVehicle(null);
      setSelectedBattery(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Map Battery to Vehicle</DialogTitle>
          <DialogDescription>
            Select a vehicle without a battery and choose an available battery to map
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-6">
            {/* Selection Section */}
            <div className="space-y-4">
              {/* Vehicle Selection */}
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Select Vehicle
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={vehiclesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          {vehiclesLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading vehicles...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Choose a vehicle" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehiclesWithoutBattery && vehiclesWithoutBattery.length > 0 ? (
                          vehiclesWithoutBattery.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicle_number} •{' '}
                              {vehicle.model || 'N/A'}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No vehicles available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Battery Selection */}
              <FormField
                control={form.control}
                name="batteryId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-base font-semibold">
                        Battery ID (Lilypad Internal ID)
                      </FormLabel>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-blue-500 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                          <p className="font-semibold mb-1">Battery ID (Lilypad)</p>
                          <p>Internal identifier used by Lilypad to track physical batteries. This is NOT the Battery Smart ID.</p>
                        </div>
                      </div>
                    </div>
                    <FormDescription>
                      Used only for Lilypad's battery inventory. This is NOT the Battery Smart ID.
                    </FormDescription>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={batteriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          {batteriesLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading batteries...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Choose a battery (e.g., BS23342)" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(batteriesData as BatteryListResult)?.batteries && (batteriesData as BatteryListResult).batteries.length > 0 ? (
                          (batteriesData as BatteryListResult).batteries.map((battery) => (
                            <SelectItem key={battery.id} value={battery.id}>
                              {battery.battery_id} • {battery.battery_smart_id || battery.battery_id}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground">
                            No batteries available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Summary Panel */}
            {(selectedVehicle || selectedBattery) && (
              <div className="grid gap-3 md:grid-cols-2 pt-2 border-t">
                {/* Vehicle Summary */}
                {selectedVehicle && (
                  <Card className="border border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-sm font-medium text-blue-900">
                          Vehicle
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Number</p>
                        <p className="font-semibold text-foreground">
                          {selectedVehicle.vehicle_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Model</p>
                        <p className="font-semibold text-foreground">
                          {selectedVehicle.model_name || 'N/A'}
                        </p>
                      </div>
                      {selectedVehicle.rider_name && (
                        <div>
                          <p className="text-muted-foreground">Rider</p>
                          <p className="font-semibold text-foreground">
                            {selectedVehicle.rider_name}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'mt-1',
                            selectedVehicle.vehicle_status ===
                              'Ready for Deployment'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : selectedVehicle.vehicle_status === 'Deployed'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                          )}
                        >
                          {selectedVehicle.vehicle_status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Battery Summary */}
                {selectedBattery && (
                  <Card className="border border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Battery className="h-4 w-4 text-amber-600" />
                        <CardTitle className="text-sm font-medium text-amber-900">
                          Battery Details
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Battery ID (Lilypad)</p>
                        <p className="font-mono font-semibold text-foreground">
                          {selectedBattery.battery_id}
                        </p>
                      </div>
                      {selectedBattery.battery_identifier && (
                        <div>
                          <p className="text-muted-foreground text-xs">Battery Identifier</p>
                          <p className="font-semibold text-foreground">
                            {selectedBattery.battery_identifier}
                          </p>
                        </div>
                      )}
                      {selectedBattery.service_provider && (
                        <div>
                          <p className="text-muted-foreground text-xs">Service Provider</p>
                          <p className="font-semibold text-foreground">
                            {selectedBattery.service_provider}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Status</p>
                        <Badge variant="outline" className="mt-1 bg-green-100 text-green-800 border-green-200">
                          {selectedBattery.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Error Message */}
            {mapError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {mapError instanceof Error ? mapError.message : 'An error occurred'}
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isMappingLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isMappingLoading ||
                  !form.formState.isValid ||
                  !selectedVehicle ||
                  !selectedBattery
                }
                className="gap-2"
              >
                {isMappingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isMappingLoading ? 'Mapping...' : 'Confirm Mapping'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
