import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/dateUtils';
import { Info } from 'lucide-react';
import type { BatteryDetail } from '@/hooks/useBatteryDetail';

interface BatteryDetailMetadataProps {
  battery: BatteryDetail;
}

const MetadataField = ({
  label,
  value,
  tooltip
}: {
  label: string;
  value: string | null;
  tooltip?: string;
}) => (
  <div className="py-3 border-b last:border-b-0">
    <div className="flex items-center gap-2 mb-1">
      <p className="text-sm text-gray-500">{label}</p>
      {tooltip && (
        <div className="group relative">
          <Info className="h-3.5 w-3.5 text-blue-400 cursor-help" />
          <div className="absolute right-0 bottom-full mb-2 w-40 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
            {tooltip}
          </div>
        </div>
      )}
    </div>
    <p className="font-semibold text-gray-900">
      {value || <span className="text-gray-400 font-normal">Not provided</span>}
    </p>
  </div>
);

export const BatteryDetailMetadata = ({ battery }: BatteryDetailMetadataProps) => {
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Battery Information</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Read-only battery metadata and specifications
        </p>
      </CardHeader>
      <CardContent className="space-y-0">
        <MetadataField
          label="Battery ID (Lilypad)"
          value={battery.battery_id}
          tooltip="Internal Lilypad identifier for battery tracking"
        />
        <MetadataField
          label="Service Provider"
          value={battery.service_provider}
          tooltip="Battery service provider (e.g., Battery Smart)"
        />
        <MetadataField
          label="Battery Plan"
          value={battery.battery_plan}
          tooltip="Battery service plan type (D2D, B2B, etc.)"
        />
        <MetadataField
          label="Zone ID"
          value={battery.zone_id}
          tooltip="Operational zone or region identifier"
        />
        <MetadataField
          label="Location"
          value={battery.location}
          tooltip="Current physical location"
        />
        <MetadataField
          label="USC ID"
          value={battery.usc_id}
          tooltip="Universal Service Code identifier"
        />
        <MetadataField
          label="Retrofitment Date"
          value={
            battery.retrofit_date
              ? formatDate(battery.retrofit_date)
              : null
          }
          tooltip="Date battery was retrofitted"
        />
        <MetadataField
          label="Created On"
          value={new Date(battery.created_at).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          tooltip="Date battery was added to system"
        />
        <MetadataField
          label="Last Updated"
          value={new Date(battery.updated_at).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          tooltip="Last modification timestamp"
        />
      </CardContent>
    </Card>
  );
};
