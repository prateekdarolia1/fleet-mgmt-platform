/**
 * EditDeployedVehicleModal Component
 *
 * Provides limited editing capability for deployed vehicles.
 * Only Color and Motor Serial Number can be edited for deployed vehicles
 * to prevent accidental changes to critical fleet data.
 */

import { useEffect } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Truck } from 'lucide-react';
import { toast } from 'sonner';

// Validation schema - only Color and Motor Serial Number
const editDeployedVehicleSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  motor_serial_number: z
    .string()
    .min(1, 'Motor serial number is required')
    .max(20, 'Maximum 20 characters allowed')
});

type EditDeployedVehicleFormData = z.infer<typeof editDeployedVehicleSchema>;

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  color: string;
  motor_serial_number: string;
  status: string;
}

interface EditDeployedVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSubmit: (data: EditDeployedVehicleFormData) => Promise<void>;
  isLoading?: boolean;
}

export const EditDeployedVehicleModal = ({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
  isLoading = false
}: EditDeployedVehicleModalProps) => {
  const form = useForm<EditDeployedVehicleFormData>({
    resolver: zodResolver(editDeployedVehicleSchema),
    defaultValues: {
      color: '',
      motor_serial_number: ''
    }
  });

  // Populate form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      form.reset({
        color: vehicle.color,
        motor_serial_number: vehicle.motor_serial_number
      });
    }
  }, [vehicle, form]);

  const handleSubmit = async (data: EditDeployedVehicleFormData) => {
    if (!vehicle) return;

    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Edit Deployed Vehicle
          </DialogTitle>
          <DialogDescription>
            {vehicle && (
              <span className="font-medium text-gray-900">{vehicle.vehicle_number}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Info Alert */}
        <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Limited Edit Mode</p>
            <p className="text-sm text-amber-800 mt-1">
              This vehicle is currently deployed. Only Color and Motor Serial Number can be modified.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Vehicle Info (Read-only) */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Make</p>
                  <p className="font-medium">{vehicle?.make || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Model</p>
                  <p className="font-medium">{vehicle?.model || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Status</p>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    {vehicle?.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Color - Editable */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Black">Black</SelectItem>
                      <SelectItem value="White">White</SelectItem>
                      <SelectItem value="Red">Red</SelectItem>
                      <SelectItem value="Maroon">Maroon</SelectItem>
                      <SelectItem value="Blue">Blue</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Motor Serial Number - Editable */}
            <FormField
              control={form.control}
              name="motor_serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motor Serial Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter motor serial number"
                      maxLength={20}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
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
                disabled={isLoading || !form.formState.isValid}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
