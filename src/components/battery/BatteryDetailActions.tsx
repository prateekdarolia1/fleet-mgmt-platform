import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Eye } from 'lucide-react';
import { useState } from 'react';
import { BatteryMappingModal } from '@/components/fleet/BatteryMappingModal';
import { UnmapBatteryModal } from '@/components/fleet/UnmapBatteryModal';
import type { BatteryWithEvents } from '@/hooks/useBatteryDetail';

interface BatteryDetailActionsProps {
  battery: BatteryWithEvents;
  onSuccess?: () => void;
}

export const BatteryDetailActions = ({
  battery,
  onSuccess
}: BatteryDetailActionsProps) => {
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isUnmappingModalOpen, setIsUnmappingModalOpen] = useState(false);

  const isMapped = battery.battery.vehicle_id !== null;

  const handleMapSuccess = () => {
    setIsMappingModalOpen(false);
    onSuccess?.();
  };

  const handleUnmapSuccess = () => {
    setIsUnmappingModalOpen(false);
    onSuccess?.();
  };

  return (
    <>
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Manage this battery</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Map Battery Button */}
            <Button
              onClick={() => setIsMappingModalOpen(true)}
              disabled={isMapped}
              className="w-full justify-start"
              variant={isMapped ? 'outline' : 'default'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Map to Vehicle
            </Button>
            {isMapped && (
              <p className="text-xs text-gray-500 px-3 -mt-1">
                This battery is already mapped. Unmap first to reassign.
              </p>
            )}

            {/* Unmap Battery Button */}
            <Button
              onClick={() => setIsUnmappingModalOpen(true)}
              disabled={!isMapped}
              className="w-full justify-start"
              variant={!isMapped ? 'outline' : 'destructive'}
            >
              <Minus className="h-4 w-4 mr-2" />
              Unmap from Vehicle
            </Button>
            {!isMapped && (
              <p className="text-xs text-gray-500 px-3 -mt-1">
                This battery is unmapped. Map it to a vehicle first.
              </p>
            )}

            {/* View Vehicle Button */}
            {isMapped && battery.vehicleInfo && (
              <Button
                onClick={() => {
                  // TODO: Navigate to vehicle detail page
                  console.log('Navigate to vehicle:', battery.vehicleInfo?.id);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Vehicle: {battery.vehicleInfo.vehicle_number}
              </Button>
            )}

            {/* View Rider Button */}
            {battery.riderInfo && (
              <Button
                onClick={() => {
                  // TODO: Navigate to rider detail page
                  console.log('Navigate to rider:', battery.riderInfo?.id);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Rider: {battery.riderInfo.name}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Battery Modal */}
      <BatteryMappingModal
        open={isMappingModalOpen}
        onOpenChange={setIsMappingModalOpen}
        onSuccess={handleMapSuccess}
      />

      {/* Unmap Battery Modal */}
      <UnmapBatteryModal
        open={isUnmappingModalOpen}
        onOpenChange={setIsUnmappingModalOpen}
        onSuccess={handleUnmapSuccess}
      />
    </>
  );
};
