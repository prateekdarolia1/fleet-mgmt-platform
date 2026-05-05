import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Truck, Wrench, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Rider } from '@/hooks/useRiders';

interface ReturnSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rider: Rider | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const ReturnSwapDialog = ({
  open,
  onOpenChange,
  rider,
  onConfirm,
  isLoading = false
}: ReturnSwapDialogProps) => {
  const tempVehicle = rider?.vehicle_assigned ?? null;
  const originalVehicle = rider?.original_vehicle_assigned ?? null;
  const swappedAt = rider?.swapped_at ? new Date(rider.swapped_at) : null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (err) {
      console.error('Error confirming return:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Return Swap</DialogTitle>
          <DialogDescription>
            {rider
              ? <>Take back the temporary vehicle and return <span className="font-semibold">{rider.name}</span> to their original vehicle.</>
              : 'Complete the swap return.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Confirm vehicle is repaired</p>
              <p className="text-sm text-green-800 mt-1">
                This action assumes <span className="font-mono font-semibold">{originalVehicle}</span> is fixed
                and ready to go back to the rider. Cancel if it isn't.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <Card className="border-0 bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm">Temp (returning)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{tempVehicle ?? '—'}</p>
                <Badge className="mt-2 bg-blue-100 text-blue-800 border-blue-200">→ Ready for Deployment</Badge>
              </CardContent>
            </Card>

            <ArrowRight className="hidden md:block h-6 w-6 text-blue-500 mx-auto" />

            <Card className="border-0 bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm">Original (back to rider)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{originalVehicle ?? '—'}</p>
                <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">→ Deployed</Badge>
              </CardContent>
            </Card>
          </div>

          {swappedAt && (
            <p className="text-xs text-muted-foreground text-center">
              Swap opened {formatDistanceToNow(swappedAt, { addSuffix: true })} ({format(swappedAt, 'PP p')})
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !rider} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Returning...' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
