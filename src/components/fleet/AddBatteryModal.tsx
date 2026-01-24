// SOLID Principle: Dependency Inversion - Import only what we need
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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAddBattery } from '@/hooks/useAddBattery';
import { Loader2, Battery } from 'lucide-react';

// DRY Principle: Reusable validation patterns
const ALPHANUMERIC_7_TO_8_CHARS_REGEX = /^[A-Z0-9]{7,8}$/;
const ALPHANUMERIC_7_TO_8_CHARS_MESSAGE = 'Must be 7-8 uppercase alphanumeric characters';

// SOLID Principle: Single Responsibility - Validation Schema
// DDD Principle: Battery Aggregate validation rules
const addBatterySchema = z.object({
  battery_id: z
    .string()
    .min(1, 'Battery ID is required')
    .min(7, 'Battery ID must be at least 7 characters')
    .max(8, 'Battery ID must be 7-8 characters')
    .regex(ALPHANUMERIC_7_TO_8_CHARS_REGEX, `Battery ID ${ALPHANUMERIC_7_TO_8_CHARS_MESSAGE} (e.g., BAT0001, BAT00001)`),

  service_provider: z.enum(['BATTERY_SMART', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a service provider' })
  }),

  // Business Rule: Zone ID is now REQUIRED (not optional)
  zone_id: z
    .string()
    .min(1, 'Zone ID is required')
    .min(7, 'Zone ID must be at least 7 characters')
    .max(8, 'Zone ID must be 7-8 characters')
    .regex(ALPHANUMERIC_7_TO_8_CHARS_REGEX, `Zone ID ${ALPHANUMERIC_7_TO_8_CHARS_MESSAGE}`),

  location: z.enum(['NOIDA', 'OTHER']).optional(),

  // Business Rule: Battery Plan is now REQUIRED (not optional)
  battery_plan: z.enum(['D2D', 'B2B', 'OTHER'], {
    errorMap: () => ({ message: 'Please select a battery plan' })
  }),

  // Business Rule: USC ID is now REQUIRED (not optional)
  usc_id: z
    .string()
    .min(1, 'USC ID is required'),

  retrofit_date: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      'Please enter a valid date'
    )
});

type AddBatteryFormData = z.infer<typeof addBatterySchema>;

interface AddBatteryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddBatteryModal = ({
  open,
  onOpenChange,
  onSuccess
}: AddBatteryModalProps) => {
  // SOLID Principle: Single Responsibility - Form state management
  const form = useForm<AddBatteryFormData>({
    resolver: zodResolver(addBatterySchema),
    mode: 'onChange',
    defaultValues: {
      service_provider: 'BATTERY_SMART',
      battery_id: ''
    }
  });

  // SOLID Principle: Dependency Inversion - Depend on abstraction (useAddBattery hook)
  const { mutate: addBatteryMutation, isPending: isAdding } = useAddBattery({
    onSuccess: () => {
      toast.success('Battery added successfully!');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to add battery: ${error}`);
    }
  });

  const handleSubmit = (data: AddBatteryFormData) => {
    addBatteryMutation(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5 text-blue-600" />
            Add Battery to Inventory
          </DialogTitle>
          <DialogDescription>
            Create a new battery record in your fleet inventory
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Battery ID - SOLID: Single Responsibility */}
            <FormField
              control={form.control}
              name="battery_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., BAT0001 or BAT00001"
                      disabled={isAdding}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormDescription>
                    7-8 uppercase alphanumeric characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Provider */}
            <FormField
              control={form.control}
              name="service_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Provider</FormLabel>
                  <select
                    {...field}
                    disabled={isAdding}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BATTERY_SMART">Battery Smart</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Zone ID - DDD: Zone Value Object */}
            <FormField
              control={form.control}
              name="zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., ZONE0001"
                      disabled={isAdding}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormDescription>
                    Operational zone identifier (7-8 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Battery Plan - DDD: Service Agreement Value Object */}
            <FormField
              control={form.control}
              name="battery_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery Plan</FormLabel>
                  <select
                    {...field}
                    disabled={isAdding}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select plan...</option>
                    <option value="D2D">D2D</option>
                    <option value="B2B">B2B</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <select
                    {...field}
                    disabled={isAdding}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select location...</option>
                    <option value="NOIDA">NOIDA</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Retrofit Date */}
            <FormField
              control={form.control}
              name="retrofit_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retrofitment Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isAdding}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* USC ID - DDD: Universal Service Code */}
            <FormField
              control={form.control}
              name="usc_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USC ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Universal Service Code"
                      disabled={isAdding}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdding || !form.formState.isValid}
                className="gap-2"
              >
                {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAdding ? 'Adding...' : 'Add Battery'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};